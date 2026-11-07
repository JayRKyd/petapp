'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay, formatShort } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SIZES, sizeLabel, type Size } from '@/features/booking/rules';
import type { Pet } from '@/features/booking/store';
import { saveClient, savePet } from '../actions';
import type { ClientRow, Visit } from '../queries';
import { money } from '../status';
import { Chip, Field, OwesPill, StatusPill } from './bits';
import { VisitSheet } from './VisitSheet';

type Filter = 'all' | 'owes' | 'due' | 'new';

/** Every client with their pets. Pick one to see history, what they owe, and to fix details. */
export function ClientsView({ data, initialId }: { data: { today: string; clients: ClientRow[] }; initialId: string | null }) {
  const { today, clients } = data;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [visitId, setVisitId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === 'owes' && c.owed <= 0) return false;
      if (filter === 'due' && !(c.last && c.last < sixWeeksAgo(today) && !c.next)) return false;
      if (filter === 'new' && c.visits > 0) return false;
      if (!needle) return true;
      return c.name.toLowerCase().includes(needle) || (c.phone ?? '').includes(needle) || c.pets.some((p) => p.name.toLowerCase().includes(needle));
    });
  }, [clients, q, filter, today]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const visit = selected?.history.find((v) => v.id === visitId) ?? null;
  const counts = {
    all: clients.length,
    owes: clients.filter((c) => c.owed > 0).length,
    due: clients.filter((c) => c.last && c.last < sixWeeksAgo(today) && !c.next).length,
    new: clients.filter((c) => c.visits === 0).length,
  };

  return (
    <div className="flex w-full flex-col lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
      <div className="flex min-w-0 flex-col gap-4 px-4 py-5 md:px-6 md:py-6 lg:overflow-y-auto">
        <header>
          <h1 className="text-2xl font-semibold md:text-3xl">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} on file · {clients.reduce((s, c) => s + c.pets.length, 0)} pets
            {counts.owes ? <span className="font-medium text-amber-700 dark:text-amber-300"> · {counts.owes} owe money</span> : null}
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="client-search" className="h-10 pl-9" placeholder="Name, phone or pet" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {(
              [
                ['all', 'All'],
                ['owes', 'Owes money'],
                ['due', 'Due for a groom'],
                ['new', 'Never visited'],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={cn('rounded-full border px-3 py-1.5 text-sm', filter === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}>
                {label} <span className="tabular-nums opacity-70">{counts[value]}</span>
              </button>
            ))}
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {visible.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setSelectedId(c.id)} className={cn('flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left hover:bg-accent/60', c.id === selectedId && 'border-primary bg-accent')}>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-muted-foreground">{c.pets.map((p) => p.name).join(', ') || 'No pet on file'}</span>
                    <OwesPill owed={c.owed} done />
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {c.visits ? `${c.visits} visit${c.visits === 1 ? '' : 's'} · last ${formatShort(c.last!)}` : 'Never visited'}
                    {c.next ? ` · next ${formatShort(c.next)}` : ''}
                    {!c.phone ? ' · no phone' : ''}
                  </span>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{c.visits ? money(c.spent) : ''}</span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No clients match.</li>}
        </ul>
      </div>

      {/* Desktop: side panel. Phone: a sheet. */}
      <aside className="hidden border-l bg-card lg:block lg:overflow-y-auto">
        {selected ? <ClientPanel key={selected.id} client={selected} today={today} onVisit={setVisitId} /> : <p className="p-6 text-sm text-muted-foreground">Pick a client.</p>}
      </aside>
      <div className="lg:hidden">
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent>{selected && <div className="overflow-y-auto"><ClientPanel key={selected.id} client={selected} today={today} onVisit={setVisitId} /></div>}</SheetContent>
        </Sheet>
      </div>
      <VisitSheet visit={visit} today={today} onClose={() => setVisitId(null)} />
    </div>
  );
}

function sixWeeksAgo(today: string): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 42);
  return d.toISOString().slice(0, 10);
}

function ClientPanel({ client: c, today, onVisit }: { client: ClientRow; today: string; onVisit: (id: string) => void }) {
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
          {c.notes && <p className="rounded-lg bg-muted px-3 py-2">{c.notes}</p>}
        </div>
      )}

      {c.owed > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <span>
            Owes <b>{money(c.owed)}</b>
          </span>
          <span className="text-xs text-muted-foreground">Record it on the visit below</span>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pets</h3>
        {c.pets.map((p) =>
          editingPet === p.id ? (
            <PetForm key={p.id} pet={p} onDone={() => setEditingPet(null)} />
          ) : (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
              <span>
                <span className="font-display font-bold">{p.name}</span>
                <span className="text-muted-foreground"> · {sizeLabel(p.size)}{p.breed ? ` · ${p.breed}` : ''}</span>
                {p.notes && <span className="block text-xs text-muted-foreground">{p.notes}</span>}
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditingPet(p.id)}>
                Edit
              </Button>
            </div>
          ),
        )}
        {c.pets.length === 0 && <p className="text-muted-foreground">No pet on file. One is added with their first booking.</p>}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visits · {c.visits}</h3>
          <span className="text-xs text-muted-foreground">{money(c.spent)} paid in all</span>
        </div>
        {c.history.length === 0 ? (
          <p className="text-muted-foreground">No visits yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {c.history.slice(0, 12).map((v: Visit) => (
              <li key={v.id}>
                <button type="button" onClick={() => onVisit(v.id)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/60">
                  <span className="min-w-0">
                    <span className="font-medium">{v.pet.name}</span> <span className="text-muted-foreground">· {v.service}</span>
                    <span className="block text-xs text-muted-foreground">{v.date >= today ? formatDay(v.date) : formatShort(v.date)} · {money(v.price)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <OwesPill owed={v.owed} done={v.status === 'done'} />
                    <StatusPill status={v.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
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
