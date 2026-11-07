import type { Metadata } from 'next';
import { isISODate } from '@/lib/dates';
import { BUSINESS } from '@/lib/business';
import { getWeek, weekStartOf } from '@/features/owner/queries';
import { ScheduleView } from '@/features/owner/components/ScheduleView';

export const metadata: Metadata = { title: `Schedule · ${BUSINESS.name}` };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const data = await getWeek(isISODate(week) ? weekStartOf(week) : undefined);
  return <ScheduleView data={data} />;
}
