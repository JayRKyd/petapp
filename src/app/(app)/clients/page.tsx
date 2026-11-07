import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/business';
import { getClients } from '@/features/owner/queries';
import { ClientsView } from '@/features/owner/components/ClientsView';

export const metadata: Metadata = { title: `Clients · ${BUSINESS.name}` };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const data = await getClients();
  return <ClientsView data={data} initialId={id ?? null} />;
}
