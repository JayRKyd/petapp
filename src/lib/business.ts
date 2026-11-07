/**
 * Facts about the business that appear on screen. One place to change them
 * until there is a Settings screen. The name is a placeholder until the
 * owner gives us the real one.
 */
export const BUSINESS = {
  name: 'Paws & Suds Grooming',
  town: 'Freeport',
  /** Shown on the public page. */
  phone: '242 000 0000',
  /** 'HH:MM', business time. */
  opens: '09:00',
  closes: '17:00',
  /** 0 = Sunday. Days the shop is closed. */
  closedDays: [0] as number[],
  /** How far ahead a client can book online. */
  bookAheadDays: 14,
  /** Clients pay when they collect the pet; online payment comes later. */
  payment: 'Pay at pickup, cash or card',
};

export function hoursLine(): string {
  return `Mon to Sat, ${fmtHour(BUSINESS.opens)} to ${fmtHour(BUSINESS.closes)}`;
}

function fmtHour(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  return `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
}
