'use server';

import { z } from 'zod';
import { BUSINESS } from '@/lib/business';
import { isISODate } from '@/lib/dates';
import { getAvailability } from './queries';
import { SIZES, serviceById, type Size } from './rules';
import { isFree, toMinutes } from './slots';
import { createAppointment, createClient, createPet, findClientByPhone, listPets } from './store';

const schema = z.object({
  serviceId: z.string(),
  size: z.enum(SIZES.map((s) => s.value) as [string, ...string[]]),
  date: z.string().refine(isISODate, 'Pick a day'),
  start: z.coerce.number().int().min(0).max(24 * 60),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: z.string().trim().min(7, 'Enter a number we can reach you on').max(30),
  petName: z.string().trim().min(1, "Enter your pet's name").max(60),
  breed: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type BookingInput = z.input<typeof schema>;

export type BookingResult =
  | { ok: true; code: string }
  | { ok: false; error: string; /** The time went while they were typing: send them back to pick another. */ slotGone?: boolean };

/**
 * A client books from the public page. The slot is checked again here, in
 * case someone else took it meanwhile. A returning client is matched by phone
 * number so their pet's record carries over.
 */
export async function requestBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  const d = parsed.data;
  const service = serviceById(d.serviceId);
  if (!service) return { ok: false, error: 'Pick a service' };
  const size = d.size as Size;
  if (d.phone.replace(/\D/g, '').length < 7) return { ok: false, error: 'Enter a number we can reach you on' };

  const availability = await getAvailability();
  const day = availability.days.find((x) => x.date === d.date);
  if (!day) return { ok: false, error: 'That day is not open for online booking', slotGone: true };
  if (!isFree(day, d.start, service.minutes[size], toMinutes(BUSINESS.opens), toMinutes(BUSINESS.closes))) {
    return { ok: false, error: 'That time was just taken. Pick another one.', slotGone: true };
  }

  const client = (await findClientByPhone(d.phone)) ?? (await createClient({ name: d.name, phone: d.phone }));
  const pets = await listPets(client.id);
  const pet =
    pets.find((p) => p.name.toLowerCase() === d.petName.toLowerCase()) ??
    (await createPet({ clientId: client.id, name: d.petName, breed: d.breed || null, size, notes: null }));

  const appointment = await createAppointment({
    date: d.date,
    start: d.start,
    minutes: service.minutes[size],
    serviceId: service.id,
    size,
    price: service.price[size],
    clientId: client.id,
    petId: pet.id,
    notes: d.notes || null,
    status: 'new',
    source: 'online',
  });
  return { ok: true, code: appointment.code };
}
