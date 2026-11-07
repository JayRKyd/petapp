'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, dayOfMonth, formatDay, formatShort, weekdayShort } from '@/lib/dates';
import { formatMinutes } from '@/features/booking/slots';
import type { Visit, WeekData } from '../queries';
import { STATUS, money } from '../status';
import { StatusPill, OwesPill } from './bits';
import { VisitSheet } from './VisitSheet';

const BLOCK: Record<Visit['status'], string> = {
  new: 'bg-amber-100 border-amber-400 text-amber-950 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-100',
  confirmed: 'bg-primary/15 border-primary text-foreground',
  arrived: 'bg-sky-100 border-sky-500 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100',
  done: 'bg-muted border-border text-muted-foreground',
  no_show: 'bg-red-50 border-red-300 text-red-900 line-through dark:bg-red-950/40 dark:text-red-200',
  cancelled: 'hidden',
};

/** The week as a grid on a wide screen, a day at a time on a phone. */
export function ScheduleView({ data }: { data: WeekData }) {
  const { today, weekStart, days, opens, closes } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneDay, setPhoneDay] = useState(days.find((d) => d.date === today)?.date ?? days[0].date);
  const all = days.flatMap((d) => d.visits);
  const selected = all.find((v) => v.id === selectedId) ?? null;
  const hours: number[] = [];
  for (let m = opens; m < closes; m += 60) hours.push(m);
  const span = closes - opens;
  const booked = all.filter((v) => v.status !== 'no_show');
  const weekTakings = all.filter((v) => v.status === 'done').reduce((s, v) => s + v.paid, 0);

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/schedule?week=${addDays(weekStart, -7)}`} className="rounded-lg border p-2 hover:bg-accent" aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">
              {formatShort(weekStart)} to {formatShort(addDays(weekStart, 6))}
            </h1>
            <p className="text-sm text-muted-foreground">
              {booked.length} booked · {money(weekTakings)} taken so far
            </p>
          </div>
          <Link href={`/schedule?week=${addDays(weekStart, 7)}`} className="rounded-lg border p-2 hover:bg-accent" aria-label="Next week">
            <ChevronRight className="size-4" />
          </Link>
          {!days.some((d) => d.date === today) && (
            <Link href="/schedule" className="text-sm font-semibold text-primary">
              This week
            </Link>
          )}
        </div>
      </header>

      {/* Desktop grid */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="border-b" />
          {days.map((d) => (
            <div key={d.date} className={cn('border-b border-l px-2 py-2 text-center text-xs', d.date === today ? 'bg-accent font-bold text-foreground' : 'text-muted-foreground', d.closed && 'opacity-50')}>
              <div className="uppercase tracking-wider">{weekdayShort(d.date)}</div>
              <div className="font-display text-lg font-bold text-foreground">{dayOfMonth(d.date)}</div>
              <div>{d.closed ? 'closed' : `${d.visits.filter((v) => v.status !== 'no_show').length} booked`}</div>
            </div>
          ))}
          <div className="relative" style={{ height: `${(span / 60) * 64}px` }}>
            {hours.map((h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground" style={{ top: `${((h - opens) / span) * 100}%` }}>
                {formatMinutes(h)}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <div key={d.date} className={cn('relative border-l', d.closed && 'bg-muted/40')} style={{ height: `${(span / 60) * 64}px` }}>
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-dashed" style={{ top: `${((h - opens) / span) * 100}%` }} />
              ))}
              {d.visits.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  title={`${v.pet.name} · ${v.client.name} · ${v.service} · ${formatMinutes(v.start)} to ${formatMinutes(v.end)}`}
                  className={cn('absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm', BLOCK[v.status])}
                  style={{ top: `${((v.start - opens) / span) * 100}%`, height: `calc(${((v.end - v.start) / span) * 100}% - 2px)` }}
                >
                  <span className="block truncate font-bold">{v.pet.name}</span>
                  <span className="block truncate">{v.client.name}</span>
                  <span className="block truncate opacity-80">{v.service}{v.owed > 0 && v.status === 'done' ? ` · owes ${money(v.owed)}` : ''}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="hidden text-xs text-muted-foreground md:block">
        Amber is an online request to confirm, green is booked, blue is in now, grey is done. Click a block to open it.
      </p>

      {/* Phone: a day at a time */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              aria-pressed={phoneDay === d.date}
              onClick={() => setPhoneDay(d.date)}
              className={cn('flex h-[64px] w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] leading-none', phoneDay === d.date ? 'border-primary bg-primary text-primary-foreground' : 'bg-card', d.closed && 'opacity-50')}
            >
              <span className={cn('text-[10px] uppercase', phoneDay === d.date ? 'opacity-85' : 'text-muted-foreground')}>{d.date === today ? 'Today' : weekdayShort(d.date)}</span>
              <span className="font-display text-lg font-bold">{dayOfMonth(d.date)}</span>
              <span className={cn('text-[10px]', phoneDay === d.date ? 'opacity-85' : 'text-muted-foreground')}>{d.closed ? 'closed' : d.visits.length}</span>
            </button>
          ))}
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{formatDay(phoneDay)}</div>
        {(days.find((d) => d.date === phoneDay)?.visits ?? []).map((v) => (
          <button key={v.id} type="button" onClick={() => setSelectedId(v.id)} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left">
            <span className="w-[4.5rem] shrink-0 font-mono text-sm font-semibold tabular-nums">{formatMinutes(v.start)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2">
                <span className="font-display font-bold">{v.pet.name}</span>
                <span className="text-sm text-muted-foreground">{v.client.name}</span>
                <OwesPill owed={v.owed} done={v.status === 'done'} />
              </span>
              <span className="block text-sm text-muted-foreground">{v.service} · {money(v.price)}</span>
            </span>
            <StatusPill status={v.status} />
          </button>
        ))}
        {(days.find((d) => d.date === phoneDay)?.visits.length ?? 0) === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing booked.</p>}
        <p className="text-xs text-muted-foreground">{Object.values(STATUS).map((s) => s.label).slice(0, 4).join(' · ')}</p>
      </div>

      <VisitSheet visit={selected} today={today} onClose={() => setSelectedId(null)} />
    </div>
  );
}
