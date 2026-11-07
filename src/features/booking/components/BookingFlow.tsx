'use client';

import { useMemo, useState, useTransition } from 'react';
import { ChevronLeft, Loader2, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUSINESS, hoursLine } from '@/lib/business';
import { formatDay, weekdayShort, dayOfMonth } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestBooking } from '../actions';
import type { Availability } from '../queries';
import { SERVICES, SIZES, serviceById, sizeLabel, type Size } from '../rules';
import { firstFree, formatDuration, formatMinutes, slotsFor, toMinutes } from '../slots';

type Step = 'service' | 'time' | 'details' | 'done';

/**
 * The public booking page: size and service, day and time, details, done.
 * Built for a phone; on a wider screen a summary sits beside it.
 */
export function BookingFlow({ availability }: { availability: Availability }) {
  const opens = toMinutes(BUSINESS.opens);
  const closes = toMinutes(BUSINESS.closes);

  const [step, setStep] = useState<Step>('service');
  const [size, setSize] = useState<Size>('medium');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [petName, setPetName] = useState('');
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const service = serviceId ? serviceById(serviceId) : null;
  const minutes = service ? service.minutes[size] : 0;
  const price = service ? service.price[size] : 0;
  const day = date ? availability.days.find((d) => d.date === date) ?? null : null;
  const slots = useMemo(() => (day && service ? slotsFor(day, minutes, opens, closes) : []), [day, service, minutes, opens, closes]);
  const next = useMemo(() => (service ? firstFree(availability.days, minutes, opens, closes) : null), [availability.days, service, minutes, opens, closes]);
  const freeCount = (d: (typeof availability.days)[number]) => (service ? slotsFor(d, minutes, opens, closes).filter((s) => s.free).length : 0);

  const phoneOk = phone.replace(/\D/g, '').length >= 7;
  const detailsOk = name.trim().length >= 2 && phoneOk && petName.trim().length >= 1;
  const when = date && start !== null ? `${formatDay(date)}, ${formatMinutes(start)}` : null;

  function pickSize(s: Size) {
    setSize(s);
    setDate(null);
    setStart(null);
  }
  function pickService(id: string) {
    setServiceId(id);
    setDate(null);
    setStart(null);
  }
  function go(to: Step) {
    setStep(to);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function book() {
    setTried(true);
    if (!service || !date || start === null || !detailsOk) return;
    startTransition(async () => {
      try {
        const result = await requestBooking({ serviceId: service.id, size, date, start, name, phone, petName, breed: breed || undefined, notes: notes || undefined });
        if (result.ok) {
          setCode(result.code);
          go('done');
        } else if (result.slotGone) {
          setStart(null);
          setError(result.error);
          go('time');
        } else setError(result.error);
      } catch {
        setError('That did not go through. Check your connection and try again.');
      }
    });
  }

  function again() {
    setStep('service');
    setServiceId(null);
    setDate(null);
    setStart(null);
    setPetName('');
    setBreed('');
    setNotes('');
    setTried(false);
    setCode(null);
  }

  const stepIndex = { service: 1, time: 2, details: 3, done: 3 }[step];

  return (
    <>
      <div className="flex min-h-dvh w-full flex-col bg-card md:min-h-0 md:w-[430px] md:shrink-0 md:rounded-3xl md:border md:shadow-sm">
        <header className="flex flex-col gap-1 bg-gradient-to-b from-accent to-transparent px-5 pb-3 pt-6">
          <div className="flex items-center gap-2.5 font-display text-xl font-bold">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <PawPrint className="size-4" />
            </span>
            {BUSINESS.name}
          </div>
          <p className="text-sm text-muted-foreground">
            {BUSINESS.town} · {hoursLine()}
          </p>
        </header>
        {step !== 'done' && (
          <div className="flex gap-1.5 px-5 pb-4" aria-hidden>
            {[1, 2, 3].map((n) => (
              <span key={n} className={cn('h-1.5 flex-1 rounded-full', n <= stepIndex ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-5 px-5 pb-5">
          {step === 'service' && (
            <>
              <h1 className="text-2xl font-semibold">What does your pet need?</h1>
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-muted-foreground">Pet size</div>
                <div className="grid grid-cols-3 overflow-hidden rounded-xl border" role="radiogroup" aria-label="Pet size">
                  {SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={size === s.value}
                      onClick={() => pickSize(s.value)}
                      className={cn('flex h-12 flex-col items-center justify-center border-r leading-tight last:border-r-0', size === s.value ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent')}
                    >
                      <span className="font-semibold">{s.label}</span>
                      <span className={cn('text-[11px]', size === s.value ? 'opacity-85' : 'text-muted-foreground')}>{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-muted-foreground">Service</div>
                <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Service">
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={serviceId === s.id}
                      onClick={() => pickService(s.id)}
                      className={cn('flex w-full items-center justify-between gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left', serviceId === s.id ? 'border-primary bg-accent' : 'bg-card hover:border-muted-foreground')}
                    >
                      <span className="min-w-0">
                        <span className="block font-display text-base font-bold">{s.name}</span>
                        <span className="block text-sm text-muted-foreground">{s.description}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-lg font-bold tabular-nums">${s.price[size]}</span>
                        <span className="block text-xs text-muted-foreground">{formatDuration(s.minutes[size])}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'time' && service && (
            <>
              <button type="button" className="flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground" onClick={() => go('service')}>
                <ChevronLeft className="size-4" /> Change service
              </button>
              <h1 className="text-2xl font-semibold">Pick a day and time</h1>
              <p className="text-sm text-muted-foreground">
                {service.name} takes {formatDuration(minutes)}. Only times with room for it are offered.
              </p>
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {next && !(date && start !== null) && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm">
                  <span>
                    Next free: <b>{formatDay(next.date)}, {formatMinutes(next.start)}</b>
                  </span>
                  <button type="button" className="font-bold text-primary" onClick={() => { setDate(next.date); setStart(next.start); }}>
                    Take it
                  </button>
                </div>
              )}
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                {availability.days.map((d) => {
                  const n = freeCount(d);
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={d.closed}
                      aria-pressed={date === d.date}
                      onClick={() => { setDate(d.date); setStart(null); }}
                      className={cn(
                        'flex h-[72px] w-[58px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] leading-none disabled:cursor-not-allowed disabled:opacity-40',
                        date === d.date ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                      )}
                    >
                      <span className={cn('text-[10px] uppercase tracking-wider', date === d.date ? 'opacity-85' : 'text-muted-foreground')}>{weekdayShort(d.date)}</span>
                      <span className="font-display text-xl font-bold">{dayOfMonth(d.date)}</span>
                      <span className={cn('text-[10px]', date === d.date ? 'opacity-85' : 'text-muted-foreground')}>{d.closed ? 'closed' : n ? `${n} free` : 'full'}</span>
                    </button>
                  );
                })}
              </div>
              {day ? (
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-bold text-muted-foreground">{formatDay(day.date)}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.start}
                        type="button"
                        disabled={!s.free}
                        aria-pressed={start === s.start}
                        onClick={() => setStart(s.start)}
                        className={cn(
                          'h-11 rounded-xl border-[1.5px] font-semibold tabular-nums',
                          start === s.start ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
                          !s.free && 'border-transparent bg-muted text-muted-foreground line-through',
                        )}
                      >
                        {formatMinutes(s.start)}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span><i className="mr-1.5 inline-block size-2.5 rounded-[3px] border-[1.5px] align-[-1px]" />free</span>
                    <span><i className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-muted align-[-1px]" />taken</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pick a day to see times.</p>
              )}
            </>
          )}

          {step === 'details' && service && (
            <>
              <button type="button" className="flex items-center gap-1 self-start text-sm font-semibold text-muted-foreground" onClick={() => go('time')}>
                <ChevronLeft className="size-4" /> Change time
              </button>
              <h1 className="text-2xl font-semibold">Your details</h1>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Your name" id="b-name" error={tried && name.trim().length < 2 ? 'Enter your name' : null}>
                  <Input id="b-name" className="h-11" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </Field>
                <Field label="Phone" hint="WhatsApp if you have it" id="b-phone" error={tried && !phoneOk ? 'A number we can reach you on' : null}>
                  <Input id="b-phone" className="h-11" type="tel" inputMode="tel" autoComplete="tel" placeholder="242" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pet's name" id="b-pet" error={tried && !petName.trim() ? 'Who are we grooming?' : null}>
                  <Input id="b-pet" className="h-11" value={petName} onChange={(e) => setPetName(e.target.value)} />
                </Field>
                <Field label="Breed" hint="optional" id="b-breed">
                  <Input id="b-breed" className="h-11" placeholder="e.g. Shih Tzu" value={breed} onChange={(e) => setBreed(e.target.value)} />
                </Field>
              </div>
              <Field label="Anything we should know?" hint="optional" id="b-notes">
                <textarea
                  id="b-notes"
                  className="min-h-[72px] w-full rounded-xl border bg-card px-3 py-2 text-sm"
                  placeholder="Nervous with clippers, matted behind the ears, allergies…"
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <Summary service={service.name} size={size} price={price} when={when} minutes={minutes} />
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            </>
          )}

          {step === 'done' && service && (
            <div className="flex flex-col items-center gap-4 pt-4 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-accent font-display text-3xl font-bold text-primary">✓</span>
              <h1 className="text-2xl font-semibold">You&apos;re booked, {name.trim().split(' ')[0]}</h1>
              <p className="max-w-[34ch] text-muted-foreground">
                {petName.trim()} is in for a {service.name.toLowerCase()} on <b className="text-foreground">{when}</b>. We&apos;ll send a confirmation to {phone} and a reminder the day before.
              </p>
              <div className="w-full text-left">
                <Summary service={service.name} size={size} price={price} when={null} minutes={minutes} total />
              </div>
              <p className="text-sm text-muted-foreground">
                Booking code <code className="select-all rounded-md bg-muted px-2 py-0.5 font-mono text-foreground">{code}</code>
              </p>
              <p className="text-xs text-muted-foreground">To change or cancel, message us on {BUSINESS.phone} with that code.</p>
              <Button type="button" variant="ghost" onClick={again}>
                Book another pet
              </Button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-card px-5 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 md:rounded-b-3xl">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {step === 'service' ? (service ? `${service.name} · ${formatDuration(minutes)}` : 'Pick a service') : step === 'time' ? (when ?? 'Pick a day and time') : BUSINESS.payment}
              </span>
              {service && <b className="font-display text-base text-foreground tabular-nums">${price}</b>}
            </div>
            {step === 'service' && (
              <Button type="button" className="h-12 text-base" disabled={!service} onClick={() => go('time')}>
                Choose a time
              </Button>
            )}
            {step === 'time' && (
              <Button type="button" className="h-12 text-base" disabled={!when} onClick={() => go('details')}>
                Your details
              </Button>
            )}
            {step === 'details' && (
              <Button type="button" className="h-12 text-base" disabled={pending} onClick={book}>
                {pending && <Loader2 className="animate-spin" />}
                Book it
              </Button>
            )}
          </div>
        )}
      </div>

      <aside className="sticky top-6 hidden w-[280px] shrink-0 flex-col gap-3 rounded-2xl border bg-card p-5 md:flex" aria-label="Your booking">
        <h2 className="text-base font-semibold">Your booking</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Size</dt><dd className="text-right font-semibold">{sizeLabel(size)}</dd>
          <dt className="text-muted-foreground">Service</dt><dd className="text-right font-semibold">{service?.name ?? '–'}</dd>
          <dt className="text-muted-foreground">Takes</dt><dd className="text-right font-semibold">{service ? formatDuration(minutes) : '–'}</dd>
          <dt className="text-muted-foreground">When</dt><dd className="text-right font-semibold">{when ?? '–'}</dd>
          <dt className="text-muted-foreground">Pet</dt><dd className="text-right font-semibold">{petName || '–'}</dd>
          <dt className="text-muted-foreground">Price</dt><dd className="text-right font-semibold tabular-nums">{service ? `$${price}` : '–'}</dd>
        </dl>
      </aside>
    </>
  );
}

function Field({ label, hint, id, error, children }: { label: string; hint?: string; id: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-muted-foreground">
        {label}
        {hint ? <span className="font-normal"> · {hint}</span> : null}
      </label>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function Summary({ service, size, price, when, minutes, total }: { service: string; size: Size; price: number; when: string | null; minutes: number; total?: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm">
      <div className="flex justify-between gap-3">
        <span>{service} · {sizeLabel(size)}</span>
        <b className="font-display tabular-nums">${price}</b>
      </div>
      <div className="flex justify-between gap-3 text-muted-foreground">
        <span>{when ?? 'Takes about'}</span>
        <span>{formatDuration(minutes)}</span>
      </div>
      {total && (
        <div className="flex justify-between gap-3 border-t pt-2 text-base">
          <span>Pay at pickup</span>
          <b className="font-display tabular-nums">${price}</b>
        </div>
      )}
    </div>
  );
}
