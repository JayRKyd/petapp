'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDay } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { formatMinutes } from '@/features/booking/slots';
import { sizeLabel } from '@/features/booking/rules';
import { setStatus } from '../actions';
import type { DayData, Visit } from '../queries';
import { money } from '../status';
import { OwesPill, StatusPill } from './bits';
import { VisitSheet } from './VisitSheet';

/** The day's list in order, with one-tap buttons to move each pet along, and online requests waiting at the top. */
export function TodayView({ data }: { data: DayData }) {
  const { today, date, visits, requests, counts } = data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = [...visits, ...requests].find((v) => v.id === selectedId) ?? null;
  const isToday = date === today;
  const upcoming = visits.filter((v) => v.status !== 'done' && v.status !== 'no_show');
  const finished = visits.filter((v) => v.status === 'done' || v.status === 'no_show');

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/today?date=${addDays(date, -1)}`} className="rounded-lg border p-2 hover:bg-accent" aria-label="Previous day">
            <ChevronLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl">{isToday ? 'Today' : formatDay(date)}</h1>
            <p className="text-sm text-muted-foreground">
              {isToday ? `${formatDay(date)} · ` : ''}
              {counts.booked} booked · {counts.done} done · {money(counts.takings)} taken
              {counts.owed > 0 ? <span className="font-medium text-amber-700 dark:text-amber-300"> · {money(counts.owed)} owed</span> : null}
            </p>
          </div>
          <Link href={`/today?date=${addDays(date, 1)}`} className="rounded-lg border p-2 hover:bg-accent" aria-label="Next day">
            <ChevronRight className="size-4" />
          </Link>
          {!isToday && (
            <Link href="/today" className="text-sm font-semibold text-primary">
              Back to today
            </Link>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-2">
          {visits.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing booked {isToday ? 'today' : 'this day'}.</p>}
          {upcoming.map((v) => (
            <Row key={v.id} visit={v} today={today} onOpen={() => setSelectedId(v.id)} />
          ))}
          {finished.length > 0 && (
            <>
              <div className="px-1 pt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Finished · {finished.length}</div>
              {finished.map((v) => (
                <Row key={v.id} visit={v} today={today} onOpen={() => setSelectedId(v.id)} />
              ))}
            </>
          )}
        </section>

        <aside className="flex flex-col gap-2">
          <div className={cn('px-1 text-xs font-bold uppercase tracking-wider', requests.length ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>
            Online requests · {requests.length}
          </div>
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No new online bookings. They show here until you confirm them.</p>
          ) : (
            requests.map((v) => <Request key={v.id} visit={v} onOpen={() => setSelectedId(v.id)} />)
          )}
        </aside>
      </div>

      <VisitSheet visit={selected} today={today} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function Row({ visit: v, today, onOpen }: { visit: Visit; today: string; onOpen: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const done = v.status === 'done' || v.status === 'no_show';
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
    <div className={cn('flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5', done && 'opacity-70', v.status === 'arrived' && 'border-primary')}>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="w-[4.5rem] shrink-0 font-mono text-sm font-semibold tabular-nums">{formatMinutes(v.start)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-display font-bold">{v.pet.name}</span>
            <span className="text-sm text-muted-foreground">{v.client.name}</span>
            <OwesPill owed={v.owed} done={v.status === 'done'} />
          </span>
          <span className="block text-sm text-muted-foreground">
            {v.service} · {sizeLabel(v.size)} · {money(v.price)}
            {v.notes || v.pet.notes ? ` · ${v.notes ?? v.pet.notes}` : ''}
          </span>
        </span>
      </button>
      <StatusPill status={v.status} className="hidden sm:inline-flex" />
      {next && v.date <= today && (
        <Button type="button" size="sm" variant={v.status === 'arrived' ? 'default' : 'outline'} className="h-9 shrink-0" disabled={pending} onClick={advance}>
          {pending ? <Loader2 className="animate-spin" /> : next.to === 'done' ? <Check /> : null}
          {next.label}
        </Button>
      )}
    </div>
  );
}

function Request({ visit: v, onOpen }: { visit: Visit; onOpen: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <button type="button" className="text-left" onClick={onOpen}>
        <span className="font-display font-bold">{v.pet.name}</span> <span className="text-muted-foreground">· {v.client.name}</span>
        <span className="block text-muted-foreground">
          {formatDay(v.date)}, {formatMinutes(v.start)} · {v.service} · {sizeLabel(v.size)} · {money(v.price)}
        </span>
        {v.notes && <span className="block text-muted-foreground">“{v.notes}”</span>}
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
