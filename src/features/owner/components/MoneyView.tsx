'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { addDays, diffDays, formatShort } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import type { MoneyData, Visit } from '../queries';
import { money } from '../status';
import { PageHeader, Section, Stat } from './PageHeader';
import { VisitSheet } from './VisitSheet';

/** Money taken from finished jobs, and who still owes. Counted the day the job was done. */
export function MoneyView({ data }: { data: MoneyData }) {
  const { today, takings, jobs, owed, outstanding, weeks } = data;
  const [visitId, setVisitId] = useState<string | null>(null);
  const visit = outstanding.find((v) => v.id === visitId) ?? null;
  const byClient = new Map<string, { name: string; phone: string | null; owed: number; visits: Visit[] }>();
  for (const v of outstanding) {
    const g = byClient.get(v.client.id) ?? { name: v.client.name, phone: v.client.phone, owed: 0, visits: [] };
    g.owed += v.owed;
    g.visits.push(v);
    byClient.set(v.client.id, g);
  }
  const groups = Array.from(byClient.values()).sort((a, b) => b.owed - a.owed);
  const ago = (d: string) => {
    const n = diffDays(d, today);
    return n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
  };

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <PageHeader title="Money" subtitle="What was paid on finished jobs, counted the day the job was done." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today" value={money(takings.today)} hint={`${jobs.today} job${jobs.today === 1 ? '' : 's'} done`} />
        <Stat label="This week" value={money(takings.week)} hint={`${jobs.week} job${jobs.week === 1 ? '' : 's'}`} />
        <Stat label="This month" value={money(takings.month)} hint={`${jobs.month} job${jobs.month === 1 ? '' : 's'}`} />
        <Stat label="Still owed" value={money(owed)} hint={outstanding.length ? `${outstanding.length} job${outstanding.length === 1 ? '' : 's'} not fully paid` : 'everyone has paid'} tone={owed > 0 ? 'warn' : 'good'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Outstanding" count={groups.length} aside={owed > 0 ? <span className="text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300">{money(owed)}</span> : undefined}>
          {groups.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Everyone has paid.</p>
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {groups.map((g) => (
                <div key={g.name} className="flex flex-col gap-2 p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{g.name}</span>
                      {g.phone ? <span className="ml-2 text-sm text-muted-foreground">{g.phone}</span> : null}
                    </span>
                    <span className="font-display font-semibold tabular-nums text-amber-700 dark:text-amber-300">{money(g.owed)}</span>
                  </div>
                  {g.visits.map((v) => (
                    <div key={v.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">
                          {v.pet.name} · {v.service} · {formatShort(v.date)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {money(v.paid)} of {money(v.price)} paid · {ago(v.date)}
                        </span>
                      </span>
                      <Button type="button" size="sm" className="h-8" onClick={() => setVisitId(v.id)}>
                        Record payment
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Last 8 weeks" aside={<span className="text-xs text-muted-foreground">takings by week</span>}>
          <div className="rounded-xl border bg-card p-4">
            <Chart weeks={weeks} />
          </div>
        </Section>
      </div>

      <VisitSheet visit={visit} today={today} onClose={() => setVisitId(null)} />
    </div>
  );
}

/** Bars to scale with a light grid, the current week in the full colour. */
function Chart({ weeks }: { weeks: MoneyData['weeks'] }) {
  const W = 640, H = 220, L = 44, R = 8, T = 16, B = 36;
  const max = Math.max(100, ...weeks.map((w) => w.takings));
  const step = max <= 500 ? 100 : max <= 2000 ? 500 : 1000;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const slot = (W - L - R) / weeks.length;
  const bw = Math.min(48, slot * 0.6);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Takings by week for the last eight weeks">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground" fontSize={10}>
            {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const x = L + i * slot + (slot - bw) / 2;
        const last = i === weeks.length - 1;
        return (
          <g key={w.weekStart}>
            <title>{`${formatShort(w.weekStart)} to ${formatShort(addDays(w.weekStart, 6))}: ${money(w.takings)} from ${w.jobs} job${w.jobs === 1 ? '' : 's'}`}</title>
            {w.takings > 0 && <rect x={x} y={y(w.takings)} width={bw} height={y(0) - y(w.takings)} rx={4} className={cn(last ? 'fill-primary' : 'fill-primary/35')} />}
            {w.takings > 0 && (
              <text x={x + bw / 2} y={y(w.takings) - 5} textAnchor="middle" fontSize={10} className={cn('tabular-nums', last ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}>
                {money(w.takings)}
              </text>
            )}
            <text x={x + bw / 2} y={H - B + 16} textAnchor="middle" fontSize={10} className={cn(last ? 'fill-foreground font-semibold' : 'fill-muted-foreground')}>
              {formatShort(w.weekStart)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
