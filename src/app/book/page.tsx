import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/business';
import { getAvailability } from '@/features/booking/queries';
import { BookingFlow } from '@/features/booking/components/BookingFlow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Book a groom · ${BUSINESS.name}`,
};

export default async function BookPage() {
  const availability = await getAvailability();
  return (
    <main className="mx-auto flex w-full max-w-[430px] flex-col px-0 pb-8 md:w-fit md:max-w-none md:flex-row md:items-start md:gap-6 md:px-4 md:py-8">
      <BookingFlow availability={availability} />
    </main>
  );
}
