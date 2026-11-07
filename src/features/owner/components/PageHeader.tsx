'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The same header on every owner screen: title and a line under it on the left, controls on the right. */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Previous / current / next, as one control. */
export function Stepper({ prevHref, nextHref, currentHref, currentLabel, showCurrent, prevLabel, nextLabel }: { prevHref: string; nextHref: string; currentHref: string; currentLabel: string; showCurrent: boolean; prevLabel: string; nextLabel: string }) {
  const item = 'flex h-9 items-center justify-center px-2.5 text-sm font-medium hover:bg-accent';
  return (
    <div className="flex overflow-hidden rounded-lg border bg-card">
      <Link href={prevHref} className={cn(item, 'border-r')} aria-label={prevLabel}>
        <ChevronLeft className="size-4" />
      </Link>
      <Link href={currentHref} className={cn(item, 'border-r px-3', !showCurrent && 'text-muted-foreground')} aria-current={showCurrent ? 'date' : undefined}>
        {currentLabel}
      </Link>
      <Link href={nextHref} className={item} aria-label={nextLabel}>
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

/** A small figure with a label, for the row of numbers at the top of a screen. */
export function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: 'warn' | 'good'; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border bg-card px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-display text-xl font-semibold tabular-nums leading-tight', tone === 'warn' && 'text-amber-700 dark:text-amber-300', tone === 'good' && 'text-primary')}>{value}</span>
      {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/** A titled block with an optional count and a right-hand slot. */
export function Section({ title, count, aside, children, className }: { title: string; count?: number; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
          {count !== undefined ? <span className="ml-1.5 font-semibold tabular-nums text-foreground/70">{count}</span> : null}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
