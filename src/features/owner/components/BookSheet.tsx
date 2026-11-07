'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/business';
import { formatDay, weekdayShort, dayOfMonth } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SERVICES, SIZES, serviceById, type Size } from '@/features/booking/rules';
import { formatDuration, formatMinutes, slotsFor, toMinutes } from '@/features/booking/slots';
import { ownerBook } from '../actions';
import type { BookingContext } from '../queries';
import { money } from '../status';
import { Chip, Field } from './bits';

/**
 * The owner books for a walk-in or a phone call: client (existing or new),
 * pet, size, service, any free time from today on. Confirmed straight away.
 */
export function BookSheet({ open, context, initialDate, onClose }: { open: boolean; context: BookingContext; initialDate?: string | null; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="md:w-[560px]">
        <SheetHeader>
          <SheetTitle>New appointment</SheetTitle>
          <SheetDescription>Client, pet, service, time. Booked as soon as you save.</SheetDescription>
        </SheetHeader>
        {open && <Form key={initialDate ?? 'x'} context={context} initialDate={initialDate ?? null} onDone={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function Form({ context, initialDate, onDone }: { context: BookingContext; initialDate: string | null; onDone: () => void }) {
  const router = useRouter();
  const opens = toMinutes(BUSINESS.opens);
  const closes = toMinutes(BUSINESS.closes);
  const [q, setQ] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState('');
  const [petId, setPetId] = useState<string | null>(null);
  const [newPet, setNewPet] = useState('');
  const [size, setSize] = useState<Size>('medium');
  const [serviceId, setServiceId] = useState<string>('full');
  const [date, setDate] = useState<string>(initialDate ?? context.today);
  const [start, setStart] = useState<number | null>(null);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, startTransition] = useTransition();

  const client = context.clients.find((c) => c.id === clientId) ?? null;
  const needle = q.trim().toLowerCase();
  const matches = useMemo(
    () => (needle && !client ? context.clients.filter((c) => c.name.toLowerCase().includes(needle) || (c.phone ?? '').replace(/\D/g, '').includes(needle.replace(/\D/g, '') || '#') || c.pets.some((p) => p.name.toLowerCase().includes(needle))).slice(0, 8) : []),
    [context.clients, needle, client],
  );
  const creatingClient = !client && needle.length >= 2;
  const pet = client?.pets.find((p) => p.id === petId) ?? null;
  const service = serviceById(serviceId)!;
  const minutes = service.minutes[size];
  const suggested = service.price[size];
  const total = price !== '' ? Number(price) || 0 : suggested;
  const day = context.days.find((d) => d.date === date) ?? null;
  const slots = day ? slotsFor(day, minutes, opens, closes) : [];
  const days = context.days.slice(0, 21);
  const canSave = (!!client || creatingClient) && (!!pet || newPet.trim().length > 0) && !!day && start !== null;

  function pickClient(id: string) {
    setClientId(id);
    const c = context.clients.find((x) => x.id === id)!;
    setQ(c.name);
    if (c.pets.length === 1) {
      setPetId(c.pets[0].id);
      setSize(c.pets[0].size);
    }
  }

  function save() {
    if (!canSave || start === null) return;
    startTransition(async () => {
      try {
        const result = await ownerBook({
          clientId: client?.id,
          newClient: client ? undefined : { name: q.trim(), phone: newPhone || undefined },
          petId: pet?.id,
          newPet: pet ? undefined : { name: newPet.trim() },
          size,
          serviceId,
          date,
          start,
          price: price !== '' ? Number(price) : undefined,
          notes: notes || undefined,
        });
        if (result.ok) {
          toast.success(`${pet?.name ?? newPet.trim()} booked for ${formatDay(date)}, ${formatMinutes(start)}.`);
          router.refresh();
          onDone();
        } else toast.error(result.error);
      } catch {
        toast.error('That did not save. Check the connection and try again.');
      }
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-6">
        <Field label="Client">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="bk-client"
              className={cn('h-11 pl-9', client && 'border-primary')}
              placeholder="Name, phone or pet"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setClientId(null);
                setPetId(null);
              }}
            />
            {client && (
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setClientId(null); setPetId(null); setQ(''); }}>
                Change
              </button>
            )}
          </div>
          {matches.length > 0 && (
            <ul className="divide-y rounded-xl border bg-card">
              {matches.map((c) => (
                <li key={c.id}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-accent" onClick={() => pickClient(c.id)}>
                    <span>
                      {c.name}
                      {c.phone ? <span className="text-muted-foreground"> · {c.phone}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{c.pets.map((p) => p.name).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {creatingClient && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-accent/50 p-3 text-sm">
              <p>
                {matches.length ? 'Not them? ' : ''}
                <b>{q.trim()}</b> will be added as a new client.
              </p>
              <Input id="bk-phone" type="tel" inputMode="tel" placeholder="Phone (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
          )}
        </Field>

        {(client || creatingClient) && (
          <Field label="Pet">
            {client && client.pets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {client.pets.map((p) => (
                  <Chip key={p.id} selected={petId === p.id} onClick={() => { setPetId(p.id); setSize(p.size); setNewPet(''); }}>
                    {p.name} <span className="text-xs opacity-80">· {SIZES.find((s) => s.value === p.size)?.label}</span>
                  </Chip>
                ))}
                <Chip selected={!petId && newPet.length > 0} onClick={() => setPetId(null)}>
                  Another pet
                </Chip>
              </div>
            )}
            {!pet && <Input id="bk-pet" className="h-11" placeholder="Pet's name" value={newPet} onChange={(e) => setNewPet(e.target.value)} />}
          </Field>
        )}

        <Field label="Size">
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map((s) => (
              <Chip key={s.value} selected={size === s.value} onClick={() => { setSize(s.value); setPrice(''); setStart(null); }}>
                {s.label} <span className="text-xs opacity-80">· {s.hint}</span>
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Service" hint={`${formatDuration(minutes)} · ${money(suggested)}`}>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map((s) => (
              <Chip key={s.id} selected={serviceId === s.id} onClick={() => { setServiceId(s.id); setPrice(''); setStart(null); }}>
                {s.name}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Day">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {days.map((d) => {
              const n = slotsFor(d, minutes, opens, closes).filter((s) => s.free).length;
              const isToday = d.date === context.today;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.closed}
                  aria-pressed={date === d.date}
                  onClick={() => { setDate(d.date); setStart(null); }}
                  className={cn('flex h-[66px] w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] leading-none disabled:opacity-40', date === d.date ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}
                >
                  <span className={cn('text-[10px] uppercase tracking-wider', date === d.date ? 'opacity-85' : 'text-muted-foreground')}>{isToday ? 'Today' : weekdayShort(d.date)}</span>
                  <span className="font-display text-lg font-bold">{dayOfMonth(d.date)}</span>
                  <span className={cn('text-[10px]', date === d.date ? 'opacity-85' : 'text-muted-foreground')}>{d.closed ? 'closed' : n ? `${n} free` : 'full'}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={`Time · ${formatDay(date)}`}>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s.start}
                type="button"
                disabled={!s.free}
                aria-pressed={start === s.start}
                onClick={() => setStart(s.start)}
                className={cn('h-10 rounded-lg border-[1.5px] text-sm font-semibold tabular-nums', start === s.start ? 'border-primary bg-primary text-primary-foreground' : 'bg-card', !s.free && 'border-transparent bg-muted text-muted-foreground line-through')}
              >
                {formatMinutes(s.start)}
              </button>
            ))}
            {slots.length === 0 && <p className="col-span-4 text-sm text-muted-foreground">{day?.closed ? 'Closed that day.' : 'Nothing fits that day.'}</p>}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price $" hint={price !== '' && Number(price) !== suggested ? `usual ${money(suggested)}` : undefined}>
            <Input id="bk-price" type="number" inputMode="decimal" min={0} className="h-11" value={price !== '' ? price : suggested} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Input id="bk-notes" className="h-11" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </Field>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t px-5 pb-5 pt-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{start !== null ? `${formatDay(date)}, ${formatMinutes(start)} to ${formatMinutes(start + minutes)}` : 'Pick a time'}</span>
          <b className="font-display text-base text-foreground tabular-nums">{money(total)}</b>
        </div>
        <Button type="submit" className="h-11" disabled={!canSave || pending}>
          {pending && <Loader2 className="animate-spin" />}
          Book it
        </Button>
        {!canSave && (
          <p className="text-xs text-muted-foreground">
            {!client && !creatingClient ? 'Pick or type a client' : !pet && !newPet.trim() ? "Pick a pet or type its name" : start === null ? 'Pick a time' : ''} to finish.
          </p>
        )}
      </div>
    </form>
  );
}
