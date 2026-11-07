'use client';

import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/features/booking/store';
import { STATUS, money } from '../status';

export function StatusPill({ status, className }: { status: AppointmentStatus; className?: string }) {
  return <span className={cn('whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS[status].pill, className)}>{STATUS[status].label}</span>;
}

/** "Owes $45": amber while the pet is still here, red once the job is done. */
export function OwesPill({ owed, done, className }: { owed: number; done: boolean; className?: string }) {
  if (owed <= 0) return null;
  return (
    <span className={cn('whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', done ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300', className)}>
      Owes {money(owed)}
    </span>
  );
}

/** A tappable choice. Green when picked. */
export function Chip({ selected, onClick, children, className, disabled }: { selected: boolean; onClick: () => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn('rounded-full border px-3.5 py-2 text-sm transition-colors disabled:opacity-40', selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent', className)}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
