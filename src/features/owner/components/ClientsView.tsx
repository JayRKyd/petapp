'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, formatDay, formatShort } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SIZES, sizeLabel, type Size } from '@/features/booking/rules';
import type { Pet } from '@/features/booking/store';
import { saveClient, savePet } from '../actions';
import type { BookingContext, ClientRow, Visit } from '../queries';
import { money } from '../status';
import { Chip, Field, OwesPill, StatusPill } from './bits';
import { BookSheet } from './BookSheet';
import { PageHeader, Section, Stat } from './PageHeader';
import { VisitSheet } from './VisitSheet';

type Filter = 'all' | 'owes' | 'due' | 'new';
const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['owes', 'Owes money'],
  ['due', 'Due for a groom'],
  ['new', 'Never visited'],
];
/** True from the lg breakpoint up, where the client panel is a side column rather than a sheet. */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return desktop;
}

/** A pet is due for a groom this long after its last visit with nothing booked. */
const DUE_AFTER_DAYS = 42;

/** Every client with their pets. Pick one to see history, what they owe, book them in, or fix details. */
export function ClientsView({ data, context, initialId }: { data: { today: string; clients: ClientRow[] }; context: BookingContext; initialId: string | null }) {
  const { today, clients } = data;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [bookFor, setBookFor] = useState<string | null>(null);
  const desktop = useIsDesktop();
  const dueBefore = addDays(today, -DUE_AFTER_DAYS);
  const isDue = (c: ClientRow) => !!c.last && c.last < dueBefore && !c.next;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === 'owes' && c.owed <= 0) return false;
      if (filter === 'due' && !isDue(c)) return false;
      if (filter === 'new' && c.visits > 0) return false;
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || (c.phone ?? '').includes(needle) || c.pets.some((p) => p.name.toLowerCase().includes(needle));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, q, filter, today]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const visit = selected?.history.find((v) => v.id === visitId) ?? null;
  const counts: Record<Filter, number> = {
    all: clients.length,
    owes: clients.filter((c) => c.owed > 0).length,
    due: clients.filter(isDue).length,
    new: clients.filter((c) => c.visits === 0).length,
  };
  const pets = clients.reduce((s, c) => s + c.pets.length, 0);

  const panel = selected ? <ClientPanel key={selected.id} client={selected} today={today} due={isDue(selected)} onVisit={setVisitId} onBook={() => setBookFor(selected.id)} /> : null;

  return (
    <div className="flex w-full flex-col lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
      <div className="flex min-w-0 flex-col gap-5 px-4 py-5 md:px-6 md:py-6 lg:overflow-y-auto">
        <PageHeader title="Clients" subtitle={`${clients.length} on file · ${pets} pet${pets === 1 ? '' : 's'}`}>
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="client-search" className="h-9 pl-9" placeholder="Name, phone or pet" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </PageHeader>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter clients">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={cn('rounded-full border px-3 py-1.5 text-sm', filter === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}>
              {label} <span className="tabular-nums opacity-70">{counts[value]}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Client</th>
                <th className="px-3 py-2.5 font-semibold">Pets</th>
                <th className="px-3 py-2.5 text-right font-semibold">Visits</th>
                <th className="px-3 py-2.5 font-semibold">Last</th>
                <th className="px-3 py-2.5 font-semibold">Next</th>
                <th className="px-3 py-2.5 text-right font-semibold">Paid</th>
                <th className="px-4 py-2.5 text-right font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((c) => (
                <tr
                  key={c.id}
                  tabIndex={0}
                  aria-selected={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedId(c.id);
                    }
                  }}
                  className={cn('cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring', c.id === selectedId && 'bg-accent/70')}
                >
                  <td className="px-4 py-2.5">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">{c.phone ?? 'no phone'}</span>
                    <span className="block text-xs text-muted-foreground md:hidden">
                      {c.pets.map((p) => p.name).join(', ') || 'No pet on file'} · {c.visits ? `${c.visits} visit${c.visits === 1 ? '' : 's'}` : 'never visited'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {c.pets.map((p) => (
                        <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {p.name} <span className="text-muted-foreground">· {sizeLabel(p.size)}</span>
                        </span>
                      ))}
                      {c.pets.length === 0 && <span className="text-xs text-muted-foreground">none on file</span>}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{c.visits || <span className="text-muted-foreground">–</span>}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">{c.last ? formatShort(c.last) : <span className="text-muted-foreground">–</span>}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">{c.next ? formatShort(c.next) : isDue(c) ? <span className="text-amber-700 dark:text-amber-300">due</span> : <span className="text-muted-foreground">–</span>}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{c.visits ? money(c.spent) : <span className="text-muted-foreground">–</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <OwesPill owed={c.owed} done />
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No clients match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop: side panel. Phone: a sheet. */}
      <aside className="hidden border-l bg-card lg:block lg:overflow-y-auto">{panel ?? <p className="p-6 text-sm text-muted-foreground">Pick a client to see their pets and visits.</p>}</aside>
      <div className="lg:hidden">
        <Sheet open={!!selected && !desktop} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent>{selected && <div className="overflow-y-auto">{panel}</div>}</SheetContent>
        </Sheet>
      </div>

      <VisitSheet visit={visit} today={today} onClose={() => setVisitId(null)} />
      <BookSheet open={!!bookFor} context={context} initialClientId={bookFor} onClose={() => setBookFor(null)} />
    </div>
  );
}

function ClientPanel({ client: c, today, due, onVisit, onBook }: { client: ClientRow; today: string; due: boolean; onVisit: (id: string) => void; onBook: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editingPet, setEditingPet] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-5 px-5 py-5 text-sm">
      {editing ? (
        <ClientForm client={c} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold leading-tight">{c.name}</h2>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
          <div className="text-muted-foreground">{c.phone ? <span className="select-all">{c.phone}</span> : 'No phone on file'}</div>
          {c.notes && <p className="mt-1 rounded-lg bg-muted px-3 py-2">{c.notes}</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Visits" value={String(c.visits)} />
        <Stat label="Paid" value={money(c.spent)} />
        <Stat label="Owes" value={money(c.owed)} tone={c.owed > 0 ? 'warn' : undefined} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-10" onClick={onBook}>
          Book {c.pets.length === 1 ? c.pets[0].name : 'an appointment'}
        </Button>
      </div>

      {due && !c.next && (
        <p className="rounded-lg border border-amber-300/80 bg-amber-50/70 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Last groom was {formatShort(c.last!)}, over six weeks ago, and nothing is booked.
        </p>
      )}

      <Section title="Pets" count={c.pets.length}>
        <div className="flex flex-col gap-2">
          {c.pets.map((p) =>
            editingPet === p.id ? (
              <PetForm key={p.id} pet={p} onDone={() => setEditingPet(null)} />
            ) : (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-display font-bold">{p.name}</span>
                  <span className="text-muted-foreground">
                    {' '}· {sizeLabel(p.size)}
                    {p.breed ? ` · ${p.breed}` : ''}
                  </span>
                  {p.notes && <span className="block truncate text-xs text-muted-foreground">{p.notes}</span>}
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingPet(p.id)}>
                  Edit
                </Button>
              </div>
            ),
          )}
          {c.pets.length === 0 && <p className="text-muted-foreground">No pet on file. One is added with their first booking.</p>}
        </div>
      </Section>

      <Section title="Visits" count={c.history.length}>
        {c.history.length === 0 ? (
          <p className="text-muted-foreground">No visits yet.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border">
            {c.history.slice(0, 12).map((v: Visit) => (
              <button key={v.id} type="button" onClick={() => onVisit(v.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left hover:bg-accent/60">
                <span className="min-w-0">
                  <span className="block truncate">
                    <span className="font-medium">{v.pet.name}</span> <span className="text-muted-foreground">· {v.service}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {v.date >= today ? formatDay(v.date) : formatShort(v.date)} · {money(v.price)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <OwesPill owed={v.owed} done={v.status === 'done'} />
                  <StatusPill status={v.status} />
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ClientForm({ client: c, onDone }: { client: ClientRow; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(c.name);
  const [phone, setPhone] = useState(c.phone ?? '');
  const [notes, setNotes] = useState(c.notes ?? '');
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveClient({ id: c.id, name, phone: phone || null, notes: notes || null });
          if (r.ok) {
            toast.success(`Saved ${name.trim()}.`);
            router.refresh();
            onDone();
          } else toast.error(r.error);
        });
      }}
    >
      <Field label="Name"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Phone"><Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <Field label="Notes"><Input id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember" /></Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Save</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

function PetForm({ pet: p, onDone }: { pet: Pet; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(p.name);
  const [breed, setBreed] = useState(p.breed ?? '');
  const [size, setSize] = useState<Size>(p.size);
  const [notes, setNotes] = useState(p.notes ?? '');
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await savePet({ id: p.id, name, breed: breed || null, size, notes: notes || null });
          if (r.ok) {
            toast.success(`Saved ${name.trim()}.`);
            router.refresh();
            onDone();
          } else toast.error(r.error);
        });
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name"><Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Breed"><Input id="p-breed" value={breed} onChange={(e) => setBreed(e.target.value)} /></Field>
      </div>
      <Field label="Size">
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <Chip key={s.value} className="px-3 py-1.5" selected={size === s.value} onClick={() => setSize(s.value)}>{s.label}</Chip>
          ))}
        </div>
      </Field>
      <Field label="Grooming notes"><Input id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nervous with clippers, short on the body…" /></Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending && <Loader2 className="animate-spin" />}Save</Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
