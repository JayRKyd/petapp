'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDuration, formatMinutes } from '@/features/booking/slots';
import { sizeLabel } from '@/features/booking/rules';
import { cancelAppointment, deletePayment, recordPayment, setStatus } from '../actions';
import type { Visit } from '../queries';
import { money } from '../status';
import { Chip, OwesPill, StatusPill } from './bits';

/** One appointment: who, what, when, the money, and the buttons to move it along. */
export function VisitSheet({ visit, today, onClose }: { visit: Visit | null; today: string; onClose: () => void }) {
  return (
    <Sheet open={!!visit} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>{visit && <Body key={visit.id} visit={visit} today={today} />}</SheetContent>
    </Sheet>
  );
}

function Body({ visit: v, today }: { visit: Visit; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer' | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const done = v.status === 'done';

  function run(label: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, after?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          toast.success(label);
          after?.();
          router.refresh();
        } else toast.error(result.error);
      } catch {
        toast.error('That did not save. Check the connection and try again.');
      }
    });
  }

  function startPaying() {
    setAmount(v.balance > 0 ? String(v.balance) : '');
    setMethod(null);
    setPaying(true);
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {v.pet.name} <span className="text-base font-normal text-muted-foreground">· {v.client.name}</span>
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          <StatusPill status={v.status} />
          <OwesPill owed={v.owed} done={done} />
          {v.source === 'online' ? <span className="text-xs">Booked online · {v.code}</span> : <span className="text-xs">{v.code}</span>}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-8">
        <div className="rounded-xl border p-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="text-muted-foreground">When</dt>
            <dd className="text-right font-medium">{formatDay(v.date)}, {formatMinutes(v.start)} to {formatMinutes(v.end)}</dd>
            <dt className="text-muted-foreground">Service</dt>
            <dd className="text-right font-medium">{v.service} · {sizeLabel(v.size)} · {formatDuration(v.minutes)}</dd>
            <dt className="text-muted-foreground">Price</dt>
            <dd className="text-right text-base font-semibold">{money(v.price)}</dd>
            {v.client.phone && (
              <>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="select-all text-right">{v.client.phone}</dd>
              </>
            )}
            {v.pet.breed && (
              <>
                <dt className="text-muted-foreground">Breed</dt>
                <dd className="text-right">{v.pet.breed}</dd>
              </>
            )}
            {(v.notes || v.pet.notes) && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="text-right">{[v.pet.notes, v.notes].filter(Boolean).join(' · ')}</dd>
              </>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {v.status === 'new' && (
              <Button type="button" className="h-10" disabled={pending} onClick={() => run(`${v.pet.name} confirmed for ${formatDay(v.date)}.`, () => setStatus(v.id, 'confirmed'))}>
                {pending && <Loader2 className="animate-spin" />}
                Confirm booking
              </Button>
            )}
            {v.status === 'confirmed' && (
              <Button type="button" className="h-10" disabled={pending} onClick={() => run(`${v.pet.name} is in.`, () => setStatus(v.id, 'arrived'))}>
                {pending && <Loader2 className="animate-spin" />}
                Arrived
              </Button>
            )}
            {(v.status === 'arrived' || v.status === 'confirmed') && (
              <Button type="button" variant={v.status === 'arrived' ? 'default' : 'outline'} className="h-10" disabled={pending} onClick={() => run(`${v.pet.name} done.${v.balance > 0 ? ` ${money(v.balance)} to collect.` : ''}`, () => setStatus(v.id, 'done'))}>
                {pending && v.status === 'arrived' && <Loader2 className="animate-spin" />}
                Done
              </Button>
            )}
            {(v.status === 'confirmed' || v.status === 'new') && v.date <= today && (
              <Button type="button" variant="outline" className="h-10" disabled={pending} onClick={() => run(`${v.pet.name} marked as a no-show.`, () => setStatus(v.id, 'no_show'))}>
                No show
              </Button>
            )}
            {v.status !== 'done' && v.status !== 'cancelled' && !cancelling && (
              <Button type="button" variant="ghost" className="h-10 text-muted-foreground" onClick={() => setCancelling(true)}>
                Cancel
              </Button>
            )}
            {cancelling && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-red-50 p-3 text-sm dark:bg-red-950/30">
                <span>Cancel this appointment? The time opens up again.</span>
                <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => run('Appointment cancelled.', () => cancelAppointment(v.id), () => setCancelling(false))}>
                  Yes, cancel it
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setCancelling(false)}>
                  Keep it
                </Button>
              </div>
            )}
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment</h3>
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <b className="tabular-nums">{money(v.paid)}</b>
              <span className="text-muted-foreground"> / {money(v.price)} paid</span>
            </span>
            {v.balance > 0 && v.status !== 'cancelled' && v.status !== 'no_show' ? (
              <span className="font-semibold text-amber-700 dark:text-amber-300">{done ? 'owes' : 'to collect'} {money(v.balance)}</span>
            ) : v.paid > v.price ? (
              <span className="text-muted-foreground">paid {money(v.paid - v.price)} extra</span>
            ) : v.status === 'cancelled' || v.status === 'no_show' ? null : (
              <span className="font-medium text-primary">Paid in full</span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', v.balance > 0 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${v.price > 0 ? Math.min(100, (v.paid / v.price) * 100) : 100}%` }} />
          </div>
          {v.payments.length > 0 && (
            <ul className="divide-y rounded-xl border text-sm">
              {v.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span>
                    {formatDay(p.paidOn)}
                    {p.method ? <span className="text-muted-foreground"> · {p.method}</span> : null}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-mono text-xs font-semibold tabular-nums">{money(p.amount)}</span>
                    {removing === p.id ? (
                      <>
                        <Button type="button" variant="destructive" size="sm" className="h-7 px-2 text-xs" disabled={pending} onClick={() => run(`Removed the ${money(p.amount)} payment.`, () => deletePayment(p.id), () => setRemoving(null))}>
                          Remove
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRemoving(null)}>
                          Keep
                        </Button>
                      </>
                    ) : (
                      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Remove the ${money(p.amount)} payment`} title="Entered by mistake? Remove it" onClick={() => setRemoving(p.id)}>
                        <X className="size-3.5" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {v.status !== 'cancelled' && !paying && (
            <Button type="button" variant={v.balance > 0 ? 'default' : 'outline'} className="h-10 self-start" onClick={startPaying}>
              Record payment
            </Button>
          )}
          {paying && (
            <form
              className="flex flex-col gap-3 rounded-xl border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const value = Number(amount);
                if (!(value > 0)) return toast.error('Enter an amount above $0');
                const left = Math.max(0, v.balance - value);
                run(left > 0 ? `${money(value)} recorded. ${v.client.name} still owes ${money(left)}.` : `${money(value)} recorded. Paid in full.`, () => recordPayment({ appointmentId: v.id, amount: value, method: method ?? undefined }), () => setPaying(false));
              }}
            >
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Amount $
                <Input id="pay-amount" type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </label>
              {v.balance > 0 && Number(amount) !== v.balance && (
                <button type="button" className="self-start text-xs font-semibold text-primary" onClick={() => setAmount(String(v.balance))}>
                  They paid the rest ({money(v.balance)})
                </button>
              )}
              <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Paid by">
                <span className="mr-1 text-xs text-muted-foreground">Paid by (optional)</span>
                {(['cash', 'card', 'transfer'] as const).map((m) => (
                  <Chip key={m} className="px-3 py-1.5 capitalize" selected={method === m} onClick={() => setMethod(method === m ? null : m)}>
                    {m}
                  </Chip>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-10" disabled={pending}>
                  {pending && <Loader2 className="animate-spin" />}
                  Save payment
                </Button>
                <Button type="button" variant="outline" className="h-10" onClick={() => setPaying(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
