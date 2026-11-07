'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, DollarSign, LogOut, PawPrint, Plus, Sun, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUSINESS } from '@/lib/business';
import { Button } from '@/components/ui/button';
import { BookSheet } from '@/features/owner/components/BookSheet';
import type { BookingContext } from '@/features/owner/queries';
import { signOut } from '@/app/sign-in/actions';

const NAV = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/money', label: 'Money', icon: DollarSign },
];

/** Rail on a wide screen, tabs on a phone, and the New appointment sheet on both. */
export function AppShell({ context, children }: { context: BookingContext; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [booking, setBooking] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[200px] shrink-0 flex-col gap-1 border-r bg-muted/40 px-3 py-5 md:flex">
        <div className="flex items-center gap-2 px-2 pb-4 font-display text-base font-bold">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="size-3.5" />
          </span>
          <span className="truncate">{BUSINESS.name}</span>
        </div>
        <Button type="button" className="mb-2 h-10 justify-start" onClick={() => setBooking(true)}>
          <Plus /> New appointment
        </Button>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium', pathname.startsWith(n.href) ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/70')}>
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
        <div className="mt-auto flex flex-col gap-1 border-t pt-3">
          <Link href="/book" target="_blank" className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-card/70">
            View the booking page
          </Link>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-card/70"
            onClick={async () => {
              await signOut();
              router.replace('/sign-in');
            }}
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom,0px)] md:hidden" aria-label="Main">
        {NAV.slice(0, 2).map((n) => (
          <Tab key={n.href} {...n} active={pathname.startsWith(n.href)} />
        ))}
        <button type="button" onClick={() => setBooking(true)} className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-primary" aria-label="New appointment">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Plus className="size-5" />
          </span>
          Book
        </button>
        {NAV.slice(2).map((n) => (
          <Tab key={n.href} {...n} active={pathname.startsWith(n.href)} />
        ))}
      </nav>

      <BookSheet open={booking} context={context} onClose={() => setBooking(false)} />
    </div>
  );
}

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link href={href} className={cn('flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
