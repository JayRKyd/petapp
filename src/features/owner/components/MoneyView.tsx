'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { diffDays, formatShort } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import type { MoneyData, Visit } from '../queries';
import { money } from '../status';
import { VisitSheet } from './VisitSheet';

function Tile({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: 'warn' }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
      <span className={cn('font-display text-2xl font-semibold tabular-nums', tone === 'warn' && 'text-amber-700 dark:text-amber-300')}>{value}</span>
      {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

/** Money taken from finished jobs, and who still owes. Counted the day the job was done. */
export function MoneyView({ data }: { data: MoneyData }) {
  const { today, takings, jobs, owed, outstanding, weeks } = data;
  const [visitId, setVisitId] = useState<string | null>(null);
  const visit = outstanding.find((v) => v.id === visitId) ?? null;
  const max = Math.max(1, ...weeks.map((w) => w.takings));
  const byClient = new Map<string, { name: string; phone: string | null; owed: number; visits: Visit[] }>();
  for (const v of outstanding) {
    const g = byClient.get(v.client.id) ?? { name: v.client.name, phone: v.client.phone, owed: 0, visits: [] };
    g.owed += v.owed;
    g.visits.push(v);
    byClient.set(v.client.id, g);
  }
  const groups = Array.from(byClient.values()).sort((a, b) => b.owed - a.owed);

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <header>
        <h1 className="text-2xl font-semibold md:text-3xl">Money</h1>
        <p className="text-sm text-muted-foreground">What was paid on finished jobs, counted the day the job was done.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile title="Today" value={money(takings.today)} sub={`${jobs.today} job${jobs.today === 1 ? '' : 's'} done`} />
        <Tile title="This week" value={money(takings.week)} sub={`${jobs.week} job${jobs.week === 1 ? '' : 's'}`} />
        <Tile title="This month" value={money(takings.month)} sub={`${jobs.month} job${jobs.month === 1 ? '' : 's'}`} />
        <Tile title="Still owed" value={money(owed)} sub={`${outstanding.length} job${outstanding.length === 1 ? '' : 's'} not fully paid`} tone={owed > 0 ? 'warn' : undefined} />
      </div>

      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Outstanding</h2>
          {owed > 0 && <span className="text-sm text-muted-foreground">{money(owed)} across {groups.length} client{groups.length === 1 ? '' : 's'}</span>}
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everyone has paid.</p>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {groups.map((g) => (
              <li key={g.name} className="flex flex-col gap-2 rounded-xl border p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-medium">{g.name}</span>
                    {g.phone ? <span className="ml-2 text-sm text-muted-foreground">{g.phone}</span> : null}
                  </span>
                  <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">{money(g.owed)}</span>
                </div>
                {g.visits.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-2 text-sm">
                    <span>
                      {v.pet.name} · {v.service} · {formatShort(v.date)}
                      <span className="block text-xs text-muted-foreground">
                        {money(v.paid)} / {money(v.price)} · {diffDays(v.date, today) === 0 ? 'today' : diffDays(v.date, today) === 1 ? 'yesterday' : `${diffDays(v.date, today)} days ago`}
                      </span>
                    </span>
                    <Button type="button" size="sm" className="h-8" onClick={() => setVisitId(v.id)}>
                      Record payment
                    </Button>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Last 8 weeks</h2>
        <div className="grid grid-cols-8 items-end gap-2" style={{ height: 160 }}>
          {weeks.map((w) => (
            <div key={w.weekStart} className="flex h-full flex-col items-center justify-end gap-1" title={`${formatShort(w.weekStart)}: ${money(w.takings)} from ${w.jobs} jobs`}>
              <span className="text-[11px] font-semibold tabular-nums">{w.takings ? money(w.takings) : ''}</span>
              <div className={cn('w-full rounded-t-md', w.weekStart === weeks[weeks.length - 1].weekStart ? 'bg-primary' : 'bg-primary/40')} style={{ height: `${Math.max(2, (w.takings / max) * 110)}px` }} />
              <span className="text-[10px] text-muted-foreground">{formatShort(w.weekStart)}</span>
            </div>
          ))}
        </div>
      </section>

      <VisitSheet visit={visit} today={today} onClose={() => setVisitId(null)} />
    </div>
  );
}
