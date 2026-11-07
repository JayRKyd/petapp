/**
 * Which start times fit on a day. Shared by the public page (to show them)
 * and the server (to check the one the client picked is still free).
 * Times are minutes after midnight, business time.
 */
import { CAPACITY, SLOT_STEP_MINUTES } from './rules';

/** Minutes a pet is on the table: [start, end). */
export type Busy = [number, number];

export interface DayAvailability {
  /** 'YYYY-MM-DD' */
  date: string;
  closed: boolean;
  busy: Busy[];
}

export interface Slot {
  start: number;
  free: boolean;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** '9 AM', '1:30 PM' */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${suffix}`;
}

/** '45 min', '1 h', '1 h 15 min' */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Every possible start on the day, marked free when the whole appointment
 * fits inside opening hours with fewer than CAPACITY pets already in at any
 * point during it.
 */
export function slotsFor(day: DayAvailability, minutes: number, opens: number, closes: number): Slot[] {
  if (day.closed) return [];
  const out: Slot[] = [];
  for (let start = opens; start + minutes <= closes; start += SLOT_STEP_MINUTES) {
    const end = start + minutes;
    const overlapping = day.busy.filter(([s, e]) => start < e && end > s).length;
    out.push({ start, free: overlapping < CAPACITY });
  }
  return out;
}

export function isFree(day: DayAvailability, start: number, minutes: number, opens: number, closes: number): boolean {
  return slotsFor(day, minutes, opens, closes).some((s) => s.start === start && s.free);
}

export function firstFree(days: DayAvailability[], minutes: number, opens: number, closes: number): { date: string; start: number } | null {
  for (const day of days) {
    const slot = slotsFor(day, minutes, opens, closes).find((s) => s.free);
    if (slot) return { date: day.date, start: slot.start };
  }
  return null;
}
