'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDay, formatLong } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { formatMinutes } from '@/features/booking/slots';
import { sizeLabel } from '@/features/booking/rules';
import { setStatus } from '../actions';
import type { DayData, Visit } from '../queries';
import { money } from '../status';
import { OwesPill, StatusPill } from './bits';
import { PageHeader, Section, Stat, Stepper } from './PageHeader';
import { VisitSheet } from './VisitSheet';

/** The day in order, one button per pet for the next step, and online requests waiting at the side. */
export function TodayView({ data }: { data: DayData }) {
  const { today, date, visits, requests, counts } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = [...visits, ...requests].find((v) => v.id === selectedId) ?? null;
  const isToday = date === today;
  const upcoming = visits.filter((v) => v.status !== 'done' && v.status !== 'no_show');
  const finished = visits.filter((v) => v.status === 'done' || v.status === 'no_show');
  const inNow = visits.find((v) => v.status === 'arrived') ?? null;

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <PageHeader title={isToday ? 'Today' : formatDay(date)} subtitle={isToday ? formatLong(date) : date < today ? 'A past day' : 'A day ahead'}>
        <Stepper prevHref={`/today?date=${addDays(date, -1)}`} nextHref={`/today?date=${addDays(date, 1)}`} currentHref="/today" currentLabel="Today" showCurrent={isToday} prevLabel="Previous day" nextLabel="Next day" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Booked" value={String(counts.booked)} hint={inNow ? `${inNow.pet.name} is in now` : upcoming.length ? `${upcoming.length} still to come` : 'all done'} />
        <Stat label="Done" value={String(counts.done)} hint={counts.booked ? `${counts.booked - counts.done} to go` : undefined} />
        <Stat label="Taken" value={money(counts.takings)} hint="from jobs done" tone="good" />
        <Stat label="Owed" value={money(counts.owed)} hint={counts.owed > 0 ? 'on finished jobs' : 'nothing outstanding'} tone={counts.owed > 0 ? 'warn' : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Section title={isToday ? 'Up next' : 'Booked'} count={upcoming.length}>
            {upcoming.length === 0 ? (
              <Empty>{visits.length ? 'Everything is done.' : `Nothing booked ${isToday ? 'today' : 'this day'}.`}</Empty>
            ) : (
              <List>
                {upcoming.map((v) => (
                  <Row key={v.id} visit={v} today={today} onOpen={() => setSelectedId(v.id)} />
                ))}
              </List>
            )}
          </Section>
          {finished.length > 0 && (
            <Section title="Finished" count={finished.length}>
              <List>
                {finished.map((v) => (
                  <Row key={v.id} visit={v} today={today} onOpen={() => setSelectedId(v.id)} />
                ))}
              </List>
            </Section>
          )}
        </div>

        <Section title="Online requests" count={requests.length} className={cn(requests.length && '[&_h2]:text-amber-700 dark:[&_h2]:text-amber-300')}>
          {requests.length === 0 ? (
            <Empty>No new online bookings. They wait here until you confirm them.</Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {requests.map((v) => (
                <Request key={v.id} visit={v} onOpen={() => setSelectedId(v.id)} />
              ))}
            </div>
          )}
        </Section>
      </div>

      <VisitSheet visit={selected} today={today} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Row({ visit: v, today, onOpen }: { visit: Visit; today: string; onOpen: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const finished = v.status === 'done' || v.status === 'no_show';
  const next = v.status === 'new' ? { label: 'Confirm', to: 'confirmed' as const } : v.status === 'confirmed' ? { label: 'Arrived', to: 'arrived' as const } : v.status === 'arrived' ? { label: 'Done', to: 'done' as const } : null;

  function advance() {
    if (!next) return;
    startTransition(async () => {
      const r = await setStatus(v.id, next.to);
      if (r.ok) {
        toast.success(next.to === 'done' ? `${v.pet.name} done.${v.balance > 0 ? ` ${money(v.balance)} to collect.` : ''}` : next.to === 'arrived' ? `${v.pet.name} is in.` : `${v.pet.name} confirmed.`);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className={cn('grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto_auto] sm:px-4', v.status === 'arrived' && 'bg-accent/60', finished && 'text-muted-foreground')}>
      <button type="button" onClick={onOpen} className="text-left font-mono text-sm font-semibold tabular-nums">
        {formatMinutes(v.start)}
        <span className="block text-[11px] font-normal text-muted-foreground">to {formatMinutes(v.end)}</span>
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={cn('font-display text-[15px] font-bold', !finished && 'text-foreground')}>{v.pet.name}</span>
          <span className="truncate text-sm text-muted-foreground">{v.client.name}</span>
          <OwesPill owed={v.owed} done={v.status === 'done'} />
        </span>
        <span className="block text-sm text-muted-foreground sm:truncate">
          {v.service} · {sizeLabel(v.size)} · {money(v.price)}
          {v.notes || v.pet.notes ? <span className="italic"> · {v.notes ?? v.pet.notes}</span> : null}
        </span>
      </button>
      <StatusPill status={v.status} className="hidden sm:inline-flex" />
      <div className="flex w-[6.5rem] justify-end">
        {next && v.date <= today ? (
          <Button type="button" size="sm" variant={v.status === 'arrived' ? 'default' : 'outline'} className="h-9 w-full" disabled={pending} onClick={advance}>
            {pending ? <Loader2 className="animate-spin" /> : next.to === 'done' ? <Check /> : null}
            {next.label}
          </Button>
        ) : (
          <StatusPill status={v.status} className="sm:hidden" />
        )}
      </div>
    </div>
  );
}

function Request({ visit: v, onOpen }: { visit: Visit; onOpen: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/70 p-3.5 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <button type="button" className="text-left" onClick={onOpen}>
        <span className="flex items-baseline justify-between gap-2">
          <span>
            <span className="font-display text-[15px] font-bold">{v.pet.name}</span> <span className="text-muted-foreground">· {v.client.name}</span>
          </span>
          <span className="font-semibold tabular-nums">{money(v.price)}</span>
        </span>
        <span className="block text-muted-foreground">
          {formatDay(v.date)}, {formatMinutes(v.start)} · {v.service} · {sizeLabel(v.size)}
        </span>
        {v.notes && <span className="mt-1 block italic text-muted-foreground">“{v.notes}”</span>}
      </button>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await setStatus(v.id, 'confirmed');
              if (r.ok) {
                toast.success(`${v.pet.name} confirmed for ${formatDay(v.date)}.`);
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />}
          Confirm
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={onOpen}>
          Look
        </Button>
      </div>
    </div>
  );
}
