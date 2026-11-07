'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { BUSINESS_TZ, addDays, dayOfMonth, formatDay, formatShort, weekdayShort } from '@/lib/dates';
import { formatMinutes } from '@/features/booking/slots';
import type { Visit, WeekData } from '../queries';
import { money } from '../status';
import { StatusPill, OwesPill } from './bits';
import { PageHeader, Section, Stepper } from './PageHeader';
import { VisitSheet } from './VisitSheet';

const BLOCK: Record<Visit['status'], string> = {
  new: 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100',
  confirmed: 'border-primary bg-primary/15 text-foreground',
  arrived: 'border-sky-500 bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100',
  done: 'border-border bg-muted text-muted-foreground',
  no_show: 'border-red-400 bg-red-50 text-red-900 line-through dark:bg-red-950/40 dark:text-red-200',
  cancelled: 'hidden',
};
const LEGEND: [Visit['status'], string][] = [
  ['new', 'Request'],
  ['confirmed', 'Booked'],
  ['arrived', 'In now'],
  ['done', 'Done'],
  ['no_show', 'No show'],
];
const HOUR_PX = 64;

/** Minutes since midnight where the business is, refreshed each minute for the "now" line. */
function useNowMinutes(): number {
  const read = () => {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
    return parts[0] * 60 + parts[1];
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const t = setInterval(() => setNow(read()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** The week as a grid on a wide screen, a day at a time on a phone. */
export function ScheduleView({ data }: { data: WeekData }) {
  const { today, weekStart, days, opens, closes } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phoneDay, setPhoneDay] = useState(days.find((d) => d.date === today)?.date ?? days[0].date);
  const now = useNowMinutes();
  const all = days.flatMap((d) => d.visits);
  const selected = all.find((v) => v.id === selectedId) ?? null;
  const hours: number[] = [];
  for (let m = opens; m < closes; m += 60) hours.push(m);
  const span = closes - opens;
  const thisWeek = days.some((d) => d.date === today);
  const booked = all.filter((v) => v.status !== 'no_show');
  const weekTakings = all.filter((v) => v.status === 'done').reduce((s, v) => s + v.paid, 0);
  const y = (m: number) => `${((m - opens) / span) * 100}%`;

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <PageHeader title="Schedule" subtitle={`${formatShort(weekStart)} to ${formatShort(addDays(weekStart, 6))} · ${booked.length} booked · ${money(weekTakings)} taken`}>
        <Stepper prevHref={`/schedule?week=${addDays(weekStart, -7)}`} nextHref={`/schedule?week=${addDays(weekStart, 7)}`} currentHref="/schedule" currentLabel="This week" showCurrent={thisWeek} prevLabel="Previous week" nextLabel="Next week" />
      </PageHeader>

      {/* Desktop grid */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="grid min-w-[820px]" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
            <div className="sticky top-0 z-10 border-b bg-card" />
            {days.map((d) => {
              const isToday = d.date === today;
              const n = d.visits.filter((v) => v.status !== 'no_show').length;
              return (
                <div key={d.date} className={cn('sticky top-0 z-10 flex items-center justify-center gap-2 border-b border-l bg-card px-2 py-2.5', d.closed && 'text-muted-foreground/60')}>
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wider', isToday ? 'text-primary' : 'text-muted-foreground')}>{weekdayShort(d.date)}</span>
                  <span className={cn('grid size-8 place-items-center rounded-full font-display text-base font-bold', isToday && 'bg-primary text-primary-foreground')}>{dayOfMonth(d.date)}</span>
                  <span className="text-[11px] text-muted-foreground">{d.closed ? 'closed' : n ? `${n}` : ''}</span>
                </div>
              );
            })}

            <div className="relative" style={{ height: `${(span / 60) * HOUR_PX}px` }}>
              {hours.map((h) => (
                <div key={h} className={cn('absolute right-2 text-[11px] tabular-nums text-muted-foreground', h === opens ? 'translate-y-1' : '-translate-y-1/2')} style={{ top: y(h) }}>
                  {formatMinutes(h)}
                </div>
              ))}
            </div>
            {days.map((d) => (
              <div key={d.date} className={cn('relative border-l', d.closed && 'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,var(--color-muted)_6px,var(--color-muted)_7px)]', d.date === today && 'bg-accent/30')} style={{ height: `${(span / 60) * HOUR_PX}px` }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t" style={{ top: y(h) }} />
                ))}
                {hours.map((h) => (
                  <div key={`${h}-half`} className="absolute inset-x-0 border-t border-dashed border-border/60" style={{ top: y(h + 30) }} />
                ))}
                {d.date === today && now >= opens && now <= closes && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: y(now) }}>
                    <span className="absolute -left-1 -top-[5px] size-2 rounded-full bg-red-500" />
                  </div>
                )}
                {d.visits.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    title={`${v.pet.name} · ${v.client.name} · ${v.service} · ${formatMinutes(v.start)} to ${formatMinutes(v.end)}`}
                    className={cn('absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-left text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md', BLOCK[v.status])}
                    style={{ top: `calc(${y(v.start)} + 1px)`, height: `calc(${((v.end - v.start) / span) * 100}% - 3px)` }}
                  >
                    <span className="block truncate font-bold">
                      {v.pet.name} <span className="font-normal opacity-80">· {formatMinutes(v.start)}</span>
                    </span>
                    <span className="block truncate">{v.client.name}</span>
                    <span className="block truncate opacity-80">
                      {v.service}
                      {v.owed > 0 && v.status === 'done' ? ` · owes ${money(v.owed)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5 text-xs text-muted-foreground">
          {LEGEND.map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={cn('inline-block h-3 w-4 rounded-sm border-l-[3px]', BLOCK[status])} />
              {label}
            </span>
          ))}
          <span className="ml-auto">Click a block to open it.</span>
        </div>
      </div>

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
              <span className={cn('text-[10px]', phoneDay === d.date ? 'opacity-85' : 'text-muted-foreground')}>{d.closed ? 'closed' : d.visits.length || ''}</span>
            </button>
          ))}
        </div>
        <Section title={formatDay(phoneDay)} count={days.find((d) => d.date === phoneDay)?.visits.length ?? 0}>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {(days.find((d) => d.date === phoneDay)?.visits ?? []).map((v) => (
              <button key={v.id} type="button" onClick={() => setSelectedId(v.id)} className="grid w-full grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left">
                <span className="font-mono text-sm font-semibold tabular-nums">{formatMinutes(v.start)}</span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-display font-bold">{v.pet.name}</span>
                    <span className="truncate text-sm text-muted-foreground">{v.client.name}</span>
                    <OwesPill owed={v.owed} done={v.status === 'done'} />
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{v.service} · {money(v.price)}</span>
                </span>
                <StatusPill status={v.status} />
              </button>
            ))}
            {(days.find((d) => d.date === phoneDay)?.visits.length ?? 0) === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing booked.</p>}
          </div>
        </Section>
      </div>

      <VisitSheet visit={selected} today={today} onClose={() => setSelectedId(null)} />
    </div>
  );
}
