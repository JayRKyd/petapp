import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/business';
import { getMoney } from '@/features/owner/queries';
import { MoneyView } from '@/features/owner/components/MoneyView';

export const metadata: Metadata = { title: `Money · ${BUSINESS.name}` };

export default async function MoneyPage() {
  const data = await getMoney();
  return <MoneyView data={data} />;
}
