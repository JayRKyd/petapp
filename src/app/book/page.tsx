import type { Metadata } from 'next';
import { Clock, MapPin, PawPrint, Phone } from 'lucide-react';
import { BUSINESS, hoursLine } from '@/lib/business';
import { getAvailability } from '@/features/booking/queries';
import { BookingFlow } from '@/features/booking/components/BookingFlow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Book a groom · ${BUSINESS.name}`,
};

/**
 * The public page. On a phone it is the booking flow edge to edge; on a
 * desktop it is a small website: the business up top, the flow across the
 * width, and the running summary on the right.
 */
export default async function BookPage() {
  const availability = await getAvailability();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="hidden border-b bg-card md:block">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3 font-display text-xl font-bold">
            <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
              <PawPrint className="size-4" />
            </span>
            {BUSINESS.name}
          </div>
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5"><MapPin className="size-4" /> {BUSINESS.town}</li>
            <li className="flex items-center gap-1.5"><Clock className="size-4" /> {hoursLine()}</li>
            <li className="flex items-center gap-1.5"><Phone className="size-4" /> <span className="select-all text-foreground">{BUSINESS.phone}</span></li>
          </ul>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[430px] flex-1 md:max-w-5xl md:px-6 md:py-8">
        <div className="hidden md:mb-6 md:block">
          <h1 className="font-display text-3xl font-bold">Book a groom</h1>
          <p className="mt-1 text-muted-foreground">Pick a service and a time that suits you. No account needed; pay when you collect your pet.</p>
        </div>
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-6">
          <BookingFlow availability={availability} />
        </div>
      </main>

      <footer className="hidden border-t md:block">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-muted-foreground">
          <span>{BUSINESS.name} · {BUSINESS.town}</span>
          <span>{hoursLine()} · {BUSINESS.phone}</span>
        </div>
      </footer>
    </div>
  );
}
