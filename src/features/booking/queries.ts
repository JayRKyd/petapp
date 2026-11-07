import 'server-only';
import { BUSINESS } from '@/lib/business';
import { addDays, todayISO } from '@/lib/dates';
import { listAppointments } from './store';
import type { DayAvailability } from './slots';

export interface Availability {
  today: string;
  /** Tomorrow onwards, as far ahead as online booking allows. */
  days: DayAvailability[];
}

/** Which minutes are already taken on each day a client can book. No names or details leave the server. */
export async function getAvailability(): Promise<Availability> {
  const today = todayISO();
  const first = addDays(today, 1);
  const last = addDays(today, BUSINESS.bookAheadDays);
  const booked = await listAppointments(first, last);

  const days: DayAvailability[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const weekday = new Date(`${d}T12:00:00Z`).getUTCDay();
    days.push({
      date: d,
      closed: BUSINESS.closedDays.includes(weekday),
      busy: booked.filter((a) => a.date === d).map((a) => [a.start, a.start + a.minutes]),
    });
  }
  return { today, days };
}
