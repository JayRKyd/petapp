import 'server-only';
import { BUSINESS } from '@/lib/business';
import { addDays, todayISO, type ISODate } from '@/lib/dates';
import { serviceById, type Size } from '@/features/booking/rules';
import type { DayAvailability } from '@/features/booking/slots';
import {
  listAllAppointments,
  listAppointments,
  listClients,
  listPayments,
  listPets,
  type Appointment,
  type AppointmentStatus,
  type Client,
  type Pet,
} from '@/features/booking/store';

/** An appointment with everything the owner's screens show about it. */
export interface Visit {
  id: string;
  code: string;
  date: ISODate;
  start: number;
  end: number;
  minutes: number;
  service: string;
  size: Size;
  price: number;
  paid: number;
  /** Still to collect. Only once the job is done; before that nothing is owed yet. */
  owed: number;
  /** Price minus what has been paid, whatever the status. */
  balance: number;
  payments: { id: string; amount: number; paidOn: ISODate; method: string | null }[];
  client: { id: string; name: string; phone: string | null };
  pet: { id: string; name: string; breed: string | null; notes: string | null };
  notes: string | null;
  status: AppointmentStatus;
  source: 'online' | 'owner';
}

export interface DayData {
  today: ISODate;
  date: ISODate;
  visits: Visit[];
  /** Online bookings not yet looked at, whatever day they are for. */
  requests: Visit[];
  counts: { booked: number; done: number; owed: number; takings: number };
}

export interface WeekData {
  today: ISODate;
  /** The Monday. */
  weekStart: ISODate;
  days: { date: ISODate; closed: boolean; visits: Visit[] }[];
  opens: number;
  closes: number;
}

export interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  pets: Pet[];
  visits: number;
  last: ISODate | null;
  next: ISODate | null;
  spent: number;
  owed: number;
  history: Visit[];
}

export interface MoneyData {
  today: ISODate;
  takings: { today: number; week: number; month: number };
  jobs: { today: number; week: number; month: number };
  owed: number;
  outstanding: Visit[];
  /** Last 8 weeks, oldest first: takings from jobs done that week. */
  weeks: { weekStart: ISODate; takings: number; jobs: number }[];
}

export interface BookingContext {
  today: ISODate;
  clients: (Client & { pets: Pet[] })[];
  /** Today onwards, for the owner; includes days closed to online booking. */
  days: DayAvailability[];
}

const round = (n: number) => Math.round(n * 100) / 100;

async function build(appointments: Appointment[]): Promise<Visit[]> {
  const [clients, pets, payments] = await Promise.all([listClients(), listPets(), listPayments()]);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const petById = new Map(pets.map((p) => [p.id, p]));
  return appointments.map((a) => {
    const client = clientById.get(a.clientId);
    const pet = petById.get(a.petId);
    const pays = payments.filter((p) => p.appointmentId === a.id).sort((x, y) => x.paidOn.localeCompare(y.paidOn));
    const paid = round(pays.reduce((s, p) => s + p.amount, 0));
    const balance = Math.max(0, round(a.price - paid));
    return {
      id: a.id,
      code: a.code,
      date: a.date,
      start: a.start,
      end: a.start + a.minutes,
      minutes: a.minutes,
      service: serviceById(a.serviceId)?.name ?? a.serviceId,
      size: a.size,
      price: a.price,
      paid,
      owed: a.status === 'done' ? balance : 0,
      balance,
      payments: pays.map((p) => ({ id: p.id, amount: p.amount, paidOn: p.paidOn, method: p.method })),
      client: { id: a.clientId, name: client?.name ?? 'Unknown client', phone: client?.phone ?? null },
      pet: { id: a.petId, name: pet?.name ?? 'Pet', breed: pet?.breed ?? null, notes: pet?.notes ?? null },
      notes: a.notes,
      status: a.status,
      source: a.source,
    };
  });
}

export async function getDay(date?: ISODate): Promise<DayData> {
  const today = todayISO();
  const d = date ?? today;
  const all = await build(await listAllAppointments());
  const visits = all.filter((v) => v.date === d && v.status !== 'cancelled').sort((a, b) => a.start - b.start);
  const requests = all.filter((v) => v.status === 'new' && v.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
  const done = visits.filter((v) => v.status === 'done');
  return {
    today,
    date: d,
    visits,
    requests,
    counts: {
      booked: visits.filter((v) => v.status !== 'no_show').length,
      done: done.length,
      takings: round(done.reduce((s, v) => s + v.paid, 0)),
      owed: round(done.reduce((s, v) => s + v.owed, 0)),
    },
  };
}

/** The Monday on or before the date. */
export function weekStartOf(date: ISODate): ISODate {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export async function getWeek(weekStart?: ISODate): Promise<WeekData> {
  const today = todayISO();
  const start = weekStart ?? weekStartOf(today);
  const end = addDays(start, 6);
  const visits = (await build(await listAppointments(start, end))).filter((v) => v.status !== 'cancelled');
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T12:00:00Z`).getUTCDay();
    days.push({ date: d, closed: BUSINESS.closedDays.includes(weekday), visits: visits.filter((v) => v.date === d) });
  }
  const [oh, om] = BUSINESS.opens.split(':').map(Number);
  const [ch, cm] = BUSINESS.closes.split(':').map(Number);
  return { today, weekStart: start, days, opens: oh * 60 + om, closes: ch * 60 + cm };
}

export async function getClients(): Promise<{ today: ISODate; clients: ClientRow[] }> {
  const today = todayISO();
  const [clients, pets, visits] = await Promise.all([listClients(), listPets(), build(await listAllAppointments())]);
  const rows: ClientRow[] = clients.map((c) => {
    const history = visits.filter((v) => v.client.id === c.id && v.status !== 'cancelled').sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start);
    const done = history.filter((v) => v.status === 'done');
    const upcoming = history.filter((v) => v.date >= today && v.status !== 'done' && v.status !== 'no_show');
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      notes: c.notes,
      pets: pets.filter((p) => p.clientId === c.id),
      visits: done.length,
      last: done[0]?.date ?? null,
      next: upcoming.length ? upcoming[upcoming.length - 1].date : null,
      spent: round(done.reduce((s, v) => s + v.paid, 0)),
      owed: round(done.reduce((s, v) => s + v.owed, 0)),
      history,
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return { today, clients: rows };
}

export async function getMoney(): Promise<MoneyData> {
  const today = todayISO();
  const visits = await build(await listAllAppointments());
  const done = visits.filter((v) => v.status === 'done');
  const weekStart = weekStartOf(today);
  const monthStart = today.slice(0, 8) + '01';
  const sum = (list: Visit[]) => round(list.reduce((s, v) => s + v.paid, 0));
  const todayJobs = done.filter((v) => v.date === today);
  const weekJobs = done.filter((v) => v.date >= weekStart);
  const monthJobs = done.filter((v) => v.date >= monthStart);
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const ws = addDays(weekStart, -7 * i);
    const we = addDays(ws, 6);
    const jobs = done.filter((v) => v.date >= ws && v.date <= we);
    weeks.push({ weekStart: ws, takings: sum(jobs), jobs: jobs.length });
  }
  return {
    today,
    takings: { today: sum(todayJobs), week: sum(weekJobs), month: sum(monthJobs) },
    jobs: { today: todayJobs.length, week: weekJobs.length, month: monthJobs.length },
    owed: round(done.reduce((s, v) => s + v.owed, 0)),
    outstanding: done.filter((v) => v.owed > 0).sort((a, b) => a.date.localeCompare(b.date)),
    weeks,
  };
}

/** What the owner's booking sheet needs: every client with their pets, and the calendar from today. */
export async function getBookingContext(): Promise<BookingContext> {
  const today = todayISO();
  const last = addDays(today, 60);
  const [clients, pets, booked] = await Promise.all([listClients(), listPets(), listAppointments(today, last)]);
  const days: DayAvailability[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T12:00:00Z`).getUTCDay();
    days.push({
      date: d,
      closed: BUSINESS.closedDays.includes(weekday),
      busy: booked.filter((a) => a.date === d && a.status !== 'cancelled' && a.status !== 'no_show').map((a) => [a.start, a.start + a.minutes]),
    });
  }
  return {
    today,
    clients: clients.map((c) => ({ ...c, pets: pets.filter((p) => p.clientId === c.id) })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    days,
  };
}
