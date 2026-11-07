import type { Metadata } from 'next';
import { isISODate } from '@/lib/dates';
import { BUSINESS } from '@/lib/business';
import { getDay } from '@/features/owner/queries';
import { TodayView } from '@/features/owner/components/TodayView';

export const metadata: Metadata = { title: `Today · ${BUSINESS.name}` };

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const data = await getDay(isISODate(date) ? date : undefined);
  return <TodayView data={data} />;
}
