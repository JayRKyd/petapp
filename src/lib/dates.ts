/**
 * Plain-date helpers. A date is a 'YYYY-MM-DD' string from the screen to the
 * database and back; nothing here converts through a JS Date in local time,
 * which is where the old off-by-one-day bugs came from.
 */
export type ISODate = string;

export const BUSINESS_TZ = 'America/Nassau';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Today's date where the business operates, regardless of server timezone. */
export function todayISO(): ISODate {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(new Date());
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUTC(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTC(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / DAY_MS);
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

/** 'Thu Oct 1' */
export function formatDay(date: ISODate): string {
  const d = toUTC(date);
  return `${WEEKDAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** 'Oct 1' */
export function formatShort(date: ISODate): string {
  const d = toUTC(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** 'Oct 1, 2026' */
export function formatLong(date: ISODate): string {
  const d = toUTC(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function weekdayShort(date: ISODate): string {
  return WEEKDAYS[toUTC(date).getUTCDay()];
}

export function dayOfMonth(date: ISODate): number {
  return toUTC(date).getUTCDate();
}

/** '17:00' or '17:00:00' -> '5 PM'; '17:30' -> '5:30 PM' */
export function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

/** Fraction of the day (0..1) a 'HH:MM' time falls at; used to place bars. */
export function timeFraction(time: string | null | undefined, fallback = 0.7): number {
  if (!time) return fallback;
  const [h, m] = time.split(':').map(Number);
  return Math.min(1, Math.max(0, (h + (m || 0) / 60) / 24));
}
