import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/business';
import { getBookingContext, getClients } from '@/features/owner/queries';
import { ClientsView } from '@/features/owner/components/ClientsView';

export const metadata: Metadata = { title: `Clients · ${BUSINESS.name}` };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, data, context] = await Promise.all([searchParams, getClients(), getBookingContext()]);
  return <ClientsView data={data} context={context} initialId={id ?? null} />;
}
