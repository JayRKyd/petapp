import type { AppointmentStatus } from '@/features/booking/store';

/** How each status reads and looks, shared by every owner screen. */
export const STATUS: Record<AppointmentStatus, { label: string; pill: string }> = {
  new: { label: 'New request', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' },
  confirmed: { label: 'Booked', pill: 'bg-primary/10 text-primary dark:bg-primary/20' },
  arrived: { label: 'In', pill: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300' },
  done: { label: 'Done', pill: 'bg-muted text-muted-foreground' },
  no_show: { label: 'No show', pill: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  cancelled: { label: 'Cancelled', pill: 'bg-muted text-muted-foreground line-through' },
};

export function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
}
