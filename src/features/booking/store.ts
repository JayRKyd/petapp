import 'server-only';
import { addDays, todayISO } from '@/lib/dates';
import type { Size } from './rules';

/**
 * TEMPORARY: appointments kept in memory with a few examples, so the public
 * page can be built and tried before the database exists. Everything here is
 * replaced by Supabase queries; the shapes stay the same. Restarting the
 * server forgets any booking made.
 */
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
  clientName: string;
  phone: string;
  petName: string;
  breed: string | null;
  notes: string | null;
  /** 'new' until the owner has seen it. */
  status: 'new' | 'confirmed' | 'done' | 'cancelled';
  source: 'online' | 'owner';
  createdAt: string;
}

const today = todayISO();
const sample: Appointment[] = [
  { id: 'a1', code: 'PS-1041', date: addDays(today, 1), start: 9 * 60, minutes: 90, serviceId: 'full', size: 'small', price: 75, clientName: 'Example Client A', phone: '242 555 0101', petName: 'Milo', breed: 'Shih Tzu', notes: null, status: 'confirmed', source: 'owner', createdAt: today },
  { id: 'a2', code: 'PS-1042', date: addDays(today, 1), start: 15 * 60, minutes: 120, serviceId: 'full', size: 'medium', price: 95, clientName: 'Example Client B', phone: '242 555 0102', petName: 'Bella', breed: null, notes: null, status: 'confirmed', source: 'owner', createdAt: today },
  { id: 'a3', code: 'PS-1043', date: addDays(today, 2), start: 13 * 60, minutes: 60, serviceId: 'bath', size: 'medium', price: 55, clientName: 'Example Client C', phone: '242 555 0103', petName: 'Simba', breed: null, notes: null, status: 'confirmed', source: 'online', createdAt: today },
  { id: 'a4', code: 'PS-1044', date: addDays(today, 3), start: 9 * 60, minutes: 75, serviceId: 'deshed', size: 'medium', price: 75, clientName: 'Example Client D', phone: '242 555 0104', petName: 'Brutus', breed: 'Lab', notes: 'Heavy shedder', status: 'confirmed', source: 'owner', createdAt: today },
  { id: 'a5', code: 'PS-1045', date: addDays(today, 4), start: 11 * 60, minutes: 60, serviceId: 'bath', size: 'small', price: 45, clientName: 'Example Client E', phone: '242 555 0105', petName: 'Gracie', breed: null, notes: null, status: 'confirmed', source: 'online', createdAt: today },
];

// Survives hot reloads in development; a real database replaces this.
const g = globalThis as unknown as { __appointments?: Appointment[] };
const appointments = (g.__appointments ??= sample.slice());

export async function listAppointments(from: string, to: string): Promise<Appointment[]> {
  return appointments.filter((a) => a.status !== 'cancelled' && a.date >= from && a.date <= to);
}

export async function createAppointment(input: Omit<Appointment, 'id' | 'code' | 'status' | 'createdAt'>): Promise<Appointment> {
  const appointment: Appointment = {
    ...input,
    id: `a${Date.now()}`,
    code: `PS-${1000 + appointments.length + 1}`,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  appointments.push(appointment);
  return appointment;
}
