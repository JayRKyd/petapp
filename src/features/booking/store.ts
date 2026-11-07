import 'server-only';
import { addDays, todayISO } from '@/lib/dates';
import type { Size } from './rules';

/**
 * TEMPORARY: the business's records kept in memory with example data, so the
 * screens can be built and tried before the database exists. Everything here
 * is replaced by Supabase queries; the shapes stay the same. Restarting the
 * server forgets any change made.
 */
export interface Client {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Pet {
  id: string;
  clientId: string;
  name: string;
  breed: string | null;
  size: Size;
  notes: string | null;
}

export type AppointmentStatus = 'new' | 'confirmed' | 'arrived' | 'done' | 'no_show' | 'cancelled';

export interface Appointment {
  id: string;
  code: string;
  date: string;
  /** Minutes after midnight. */
  start: number;
  minutes: number;
  serviceId: string;
  size: Size;
  price: number;
  clientId: string;
  petId: string;
  notes: string | null;
  /** 'new' is an online booking the owner has not looked at yet. */
  status: AppointmentStatus;
  source: 'online' | 'owner';
  createdAt: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  paidOn: string;
  method: 'cash' | 'card' | 'transfer' | null;
}

const today = todayISO();
const d = (n: number) => addDays(today, n);

// The owner's handwritten client list. Sizes and breeds are guesses to be corrected on the Clients screen.
const CLIENT_LIST: [string, string, Size][] = [
  ['Basil & Keila Sands', 'Dice', 'medium'],
  ['Khamia Moss', 'JD', 'small'],
  ['Sandra Smith', 'Bella', 'small'],
  ['Samantha Saunders', 'Simba', 'medium'],
  ['Anna Cooper', 'Brutus', 'large'],
  ['Aurelia Pinder', 'Milo', 'small'],
  ['Kendra Russell', 'Bella (Bea)', 'small'],
  ['Phillis', 'Gracie', 'small'],
  ['TC Luxury Escape', 'Chloe', 'small'],
  ['Susan Hepburn', 'Titus', 'large'],
  ['Mr Been', 'Genna', 'medium'],
  ['Mr Wilson', 'JR', 'medium'],
  ['Teniel Capron', 'Shadow', 'medium'],
  ['Kevinique Russell', 'Mimmi', 'small'],
  ['Jacqueline Cox', 'Star', 'small'],
  ['Ms Blatch', 'Henry', 'medium'],
  ['Shanrika Bain', 'Page', 'small'],
  ['Micheallate Williams', 'Prince', 'medium'],
  ['(name to fill in)', 'Cookie', 'small'],
  ['Lanette Moxey', 'Skye', 'small'],
  ['Nancy Pollard', 'Bubbles', 'small'],
  ['Natasha Golaz', 'Mia', 'small'],
];

function seed() {
  const clients: Client[] = [];
  const pets: Pet[] = [];
  CLIENT_LIST.forEach(([name, pet, size], i) => {
    const id = `c${i + 1}`;
    clients.push({ id, name, phone: i % 3 === 0 ? null : `242 555 01${String(i).padStart(2, '0')}`, notes: null, createdAt: d(-120) });
    pets.push({ id: `p${i + 1}`, clientId: id, name: pet, breed: null, size, notes: null });
  });
  // Kevinique Russell has two pets on the list.
  pets.push({ id: 'p14b', clientId: 'c14', name: 'Shadow', breed: null, size: 'medium', notes: null });
  // Nancy Pollard's second pet.
  pets.push({ id: 'p21b', clientId: 'c21', name: 'Brandy', breed: null, size: 'small', notes: null });

  const appointments: Appointment[] = [];
  const payments: Payment[] = [];
  let n = 1000;
  const add = (day: number, start: number, petId: string, serviceId: string, status: AppointmentStatus, paid: number | null, source: 'online' | 'owner' = 'owner') => {
    const pet = pets.find((p) => p.id === petId)!;
    const prices: Record<string, Record<Size, number>> = {
      bath: { small: 45, medium: 55, large: 70 },
      full: { small: 75, medium: 95, large: 120 },
      deshed: { small: 60, medium: 75, large: 95 },
      nails: { small: 20, medium: 20, large: 25 },
    };
    const mins: Record<string, Record<Size, number>> = {
      bath: { small: 45, medium: 60, large: 75 },
      full: { small: 90, medium: 120, large: 150 },
      deshed: { small: 60, medium: 75, large: 90 },
      nails: { small: 20, medium: 20, large: 25 },
    };
    n += 1;
    const id = `a${n}`;
    // Never on a closed day.
    const date = new Date(`${d(day)}T12:00:00Z`).getUTCDay() === 0 ? d(day + 1) : d(day);
    appointments.push({ id, code: `PS-${n}`, date, start, minutes: mins[serviceId][pet.size], serviceId, size: pet.size, price: prices[serviceId][pet.size], clientId: pet.clientId, petId, notes: null, status, source, createdAt: d(Math.min(day - 2, -1)) });
    if (paid !== null && paid > 0) payments.push({ id: `pay${n}`, appointmentId: id, amount: paid, paidOn: date, method: 'cash' });
  };
  // Last few weeks: done and mostly paid.
  add(-21, 9 * 60, 'p1', 'full', 'done', 95);
  add(-21, 13 * 60, 'p3', 'bath', 'done', 45);
  add(-18, 10 * 60, 'p5', 'deshed', 'done', 95);
  add(-14, 9 * 60, 'p2', 'full', 'done', 75);
  add(-14, 11 * 60 + 30, 'p10', 'bath', 'done', 70);
  add(-12, 14 * 60, 'p7', 'nails', 'done', 20);
  add(-9, 9 * 60, 'p4', 'full', 'done', 50); // part paid: owes $45
  add(-9, 12 * 60, 'p13', 'bath', 'done', 55);
  add(-7, 9 * 60, 'p6', 'full', 'done', 75);
  add(-7, 11 * 60, 'p11', 'bath', 'done', 0); // not paid
  add(-5, 10 * 60, 'p9', 'full', 'done', 75);
  add(-3, 9 * 60, 'p20', 'bath', 'done', 45);
  add(-3, 10 * 60, 'p1', 'nails', 'no_show', null);
  add(-2, 13 * 60, 'p15', 'full', 'done', 75);
  add(-1, 9 * 60, 'p12', 'deshed', 'done', 75);
  // Today.
  add(0, 9 * 60, 'p8', 'full', 'done', 75);
  add(0, 11 * 60, 'p17', 'bath', 'arrived', null);
  add(0, 12 * 60 + 30, 'p19', 'nails', 'confirmed', null);
  add(0, 13 * 60, 'p16', 'full', 'confirmed', null, 'online');
  add(0, 15 * 60 + 30, 'p22', 'bath', 'confirmed', null);
  // Ahead, including two online requests the owner has not looked at.
  add(1, 9 * 60, 'p6', 'full', 'confirmed', null);
  add(1, 11 * 60, 'p21', 'bath', 'new', null, 'online');
  add(1, 15 * 60, 'p3', 'full', 'confirmed', null);
  add(2, 13 * 60, 'p4', 'bath', 'new', null, 'online');
  add(3, 9 * 60, 'p5', 'deshed', 'confirmed', null);
  add(4, 11 * 60, 'p14', 'bath', 'confirmed', null, 'online');
  add(6, 10 * 60, 'p10', 'full', 'confirmed', null);
  return { clients, pets, appointments, payments, nextCode: n + 1 };
}

type Store = ReturnType<typeof seed>;
// Survives hot reloads in development; a real database replaces this.
const g = globalThis as unknown as { __petStore?: Store };
const store = (g.__petStore ??= seed());

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const digits = (phone: string) => phone.replace(/\D/g, '');

export async function listClients(): Promise<Client[]> {
  return store.clients.slice();
}
export async function getClient(id: string): Promise<Client | null> {
  return store.clients.find((c) => c.id === id) ?? null;
}
export async function findClientByPhone(phone: string): Promise<Client | null> {
  const key = digits(phone);
  if (key.length < 7) return null;
  return store.clients.find((c) => c.phone && digits(c.phone).endsWith(key.slice(-7))) ?? null;
}
export async function createClient(input: { name: string; phone: string | null; notes?: string | null }): Promise<Client> {
  const client: Client = { id: newId('c'), name: input.name, phone: input.phone, notes: input.notes ?? null, createdAt: todayISO() };
  store.clients.push(client);
  return client;
}
export async function updateClient(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client | null> {
  const client = store.clients.find((c) => c.id === id);
  if (!client) return null;
  Object.assign(client, patch);
  return client;
}

export async function listPets(clientId?: string): Promise<Pet[]> {
  return store.pets.filter((p) => !clientId || p.clientId === clientId);
}
export async function getPet(id: string): Promise<Pet | null> {
  return store.pets.find((p) => p.id === id) ?? null;
}
export async function createPet(input: Omit<Pet, 'id'>): Promise<Pet> {
  const pet: Pet = { id: newId('p'), ...input };
  store.pets.push(pet);
  return pet;
}
export async function updatePet(id: string, patch: Partial<Omit<Pet, 'id' | 'clientId'>>): Promise<Pet | null> {
  const pet = store.pets.find((p) => p.id === id);
  if (!pet) return null;
  Object.assign(pet, patch);
  return pet;
}

export async function listAppointments(from: string, to: string): Promise<Appointment[]> {
  return store.appointments.filter((a) => a.date >= from && a.date <= to).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}
export async function listAllAppointments(): Promise<Appointment[]> {
  return store.appointments.slice().sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}
export async function getAppointment(id: string): Promise<Appointment | null> {
  return store.appointments.find((a) => a.id === id) ?? null;
}
export async function createAppointment(input: Omit<Appointment, 'id' | 'code' | 'createdAt'>): Promise<Appointment> {
  const appointment: Appointment = { ...input, id: newId('a'), code: `PS-${store.nextCode++}`, createdAt: new Date().toISOString() };
  store.appointments.push(appointment);
  return appointment;
}
export async function updateAppointment(id: string, patch: Partial<Omit<Appointment, 'id' | 'code' | 'createdAt'>>): Promise<Appointment | null> {
  const appointment = store.appointments.find((a) => a.id === id);
  if (!appointment) return null;
  Object.assign(appointment, patch);
  return appointment;
}

export async function listPayments(): Promise<Payment[]> {
  return store.payments.slice();
}
export async function createPayment(input: Omit<Payment, 'id'>): Promise<Payment> {
  const payment: Payment = { id: newId('pay'), ...input };
  store.payments.push(payment);
  return payment;
}
export async function deletePayment(id: string): Promise<boolean> {
  const i = store.payments.findIndex((p) => p.id === id);
  if (i < 0) return false;
  store.payments.splice(i, 1);
  return true;
}
