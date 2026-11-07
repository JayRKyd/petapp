import { Toaster } from 'sonner';
import { AppShell } from '@/components/app-shell/AppShell';
import { getBookingContext } from '@/features/owner/queries';

export const dynamic = 'force-dynamic';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const context = await getBookingContext();
  return (
    <AppShell context={context}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </AppShell>
  );
}
