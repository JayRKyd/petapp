'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { BUSINESS } from '@/lib/business';
import { isISODate, todayISO } from '@/lib/dates';
import { SIZES, serviceById, type Size } from '@/features/booking/rules';
import { isFree, toMinutes } from '@/features/booking/slots';
import {
  createAppointment,
  createClient,
  createPayment,
  createPet,
  deletePayment as removePayment,
  getAppointment,
  listAppointments,
  updateAppointment,
  updateClient,
  updatePet,
} from '@/features/booking/store';
import { getBookingContext } from './queries';

export type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath('/', 'layout');
}

const statusSchema = z.enum(['confirmed', 'arrived', 'done', 'no_show']);

/** Confirm a request, mark the pet arrived, the job done, or the client a no-show. */
export async function setStatus(id: string, status: z.infer<typeof statusSchema>): Promise<Result> {
  if (!statusSchema.safeParse(status).success) return { ok: false, error: 'Unknown status' };
  const a = await getAppointment(id);
  if (!a) return { ok: false, error: 'Appointment not found' };
  if (a.status === 'cancelled') return { ok: false, error: 'This appointment was cancelled' };
  await updateAppointment(id, { status });
  refresh();
  return { ok: true };
}

export async function cancelAppointment(id: string): Promise<Result> {
  const a = await getAppointment(id);
  if (!a) return { ok: false, error: 'Appointment not found' };
  if (a.status === 'done') return { ok: false, error: 'A finished job cannot be cancelled' };
  await updateAppointment(id, { status: 'cancelled' });
  refresh();
  return { ok: true };
}

const paymentSchema = z.object({
  appointmentId: z.string(),
  amount: z.coerce.number().positive('Enter an amount above $0').max(10_000),
  method: z.enum(['cash', 'card', 'transfer']).optional(),
  paidOn: z.string().refine(isISODate).optional(),
});

export async function recordPayment(input: z.input<typeof paymentSchema>): Promise<Result> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the amount' };
  const a = await getAppointment(parsed.data.appointmentId);
  if (!a) return { ok: false, error: 'Appointment not found' };
  if (a.status === 'cancelled') return { ok: false, error: 'This appointment was cancelled' };
  await createPayment({ appointmentId: a.id, amount: Math.round(parsed.data.amount * 100) / 100, paidOn: parsed.data.paidOn ?? todayISO(), method: parsed.data.method ?? null });
  refresh();
  return { ok: true };
}

export async function deletePayment(id: string): Promise<Result> {
  if (!(await removePayment(id))) return { ok: false, error: 'That payment was already removed' };
  refresh();
  return { ok: true };
}

const bookSchema = z.object({
  clientId: z.string().optional(),
  newClient: z.object({ name: z.string().trim().min(2, "Enter the client's name").max(80), phone: z.string().trim().max(30).optional() }).optional(),
  petId: z.string().optional(),
  newPet: z.object({ name: z.string().trim().min(1, "Enter the pet's name").max(60), breed: z.string().trim().max(60).optional() }).optional(),
  size: z.enum(SIZES.map((s) => s.value) as [string, ...string[]]),
  serviceId: z.string(),
  date: z.string().refine(isISODate, 'Pick a day'),
  start: z.coerce.number().int().min(0).max(24 * 60),
  price: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type OwnerBookInput = z.input<typeof bookSchema>;

/** The owner books for a walk-in or a phone call. Any free time today or later, confirmed straight away. */
export async function ownerBook(input: OwnerBookInput): Promise<Result & { id?: string }> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const d = parsed.data;
  const service = serviceById(d.serviceId);
  if (!service) return { ok: false, error: 'Pick a service' };
  const size = d.size as Size;
  if (!d.clientId && !d.newClient) return { ok: false, error: 'Pick a client or type a new name' };
  if (!d.petId && !d.newPet) return { ok: false, error: 'Pick a pet or type its name' };
  if (d.date < todayISO()) return { ok: false, error: 'That day has passed' };

  const context = await getBookingContext();
  const day = context.days.find((x) => x.date === d.date);
  if (!day) return { ok: false, error: 'Pick a day in the next 60 days' };
  if (!isFree(day, d.start, service.minutes[size], toMinutes(BUSINESS.opens), toMinutes(BUSINESS.closes))) {
    return { ok: false, error: 'That time is taken, or the job would run past closing' };
  }

  const clientId = d.clientId ?? (await createClient({ name: d.newClient!.name, phone: d.newClient!.phone || null })).id;
  const petId = d.petId ?? (await createPet({ clientId, name: d.newPet!.name, breed: d.newPet!.breed || null, size, notes: null })).id;
  if (d.petId) await updatePet(d.petId, { size });

  const a = await createAppointment({
    date: d.date,
    start: d.start,
    minutes: service.minutes[size],
    serviceId: service.id,
    size,
    price: d.price ?? service.price[size],
    clientId,
    petId,
    notes: d.notes || null,
    status: 'confirmed',
    source: 'owner',
  });
  refresh();
  return { ok: true, id: a.id };
}

const moveSchema = z.object({ id: z.string(), date: z.string().refine(isISODate, 'Pick a day'), start: z.coerce.number().int().min(0).max(24 * 60) });

/** Move an appointment to another free time. */
export async function moveAppointment(input: z.input<typeof moveSchema>): Promise<Result> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the time' };
  const a = await getAppointment(parsed.data.id);
  if (!a) return { ok: false, error: 'Appointment not found' };
  const others = (await listAppointments(parsed.data.date, parsed.data.date)).filter((o) => o.id !== a.id && o.status !== 'cancelled' && o.status !== 'no_show');
  const weekday = new Date(`${parsed.data.date}T12:00:00Z`).getUTCDay();
  const day = { date: parsed.data.date, closed: BUSINESS.closedDays.includes(weekday), busy: others.map((o) => [o.start, o.start + o.minutes] as [number, number]) };
  if (!isFree(day, parsed.data.start, a.minutes, toMinutes(BUSINESS.opens), toMinutes(BUSINESS.closes))) {
    return { ok: false, error: 'That time is taken, or the job would run past closing' };
  }
  await updateAppointment(a.id, { date: parsed.data.date, start: parsed.data.start });
  refresh();
  return { ok: true };
}

const clientSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, 'Enter a name').max(80),
  phone: z.string().trim().max(30).nullable(),
  notes: z.string().trim().max(1000).nullable(),
});

export async function saveClient(input: z.input<typeof clientSchema>): Promise<Result> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const { id, ...patch } = parsed.data;
  if (!(await updateClient(id, { ...patch, phone: patch.phone || null, notes: patch.notes || null }))) return { ok: false, error: 'Client not found' };
  refresh();
  return { ok: true };
}

const petSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, "Enter the pet's name").max(60),
  breed: z.string().trim().max(60).nullable(),
  size: z.enum(SIZES.map((s) => s.value) as [string, ...string[]]),
  notes: z.string().trim().max(1000).nullable(),
});

export async function savePet(input: z.input<typeof petSchema>): Promise<Result> {
  const parsed = petSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const { id, ...patch } = parsed.data;
  if (!(await updatePet(id, { ...patch, size: patch.size as Size, breed: patch.breed || null, notes: patch.notes || null }))) return { ok: false, error: 'Pet not found' };
  refresh();
  return { ok: true };
}
