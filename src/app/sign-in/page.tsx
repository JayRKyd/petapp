import type { Metadata } from 'next';
import { PawPrint } from 'lucide-react';
import { BUSINESS } from '@/lib/business';
import { SignInForm } from './SignInForm';

export const metadata: Metadata = { title: `Sign in · ${BUSINESS.name}` };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center gap-2.5 font-display text-xl font-bold">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
          <PawPrint className="size-4" />
        </span>
        {BUSINESS.name}
      </div>
      <SignInForm next={next && next.startsWith('/') ? next : '/today'} />
    </main>
  );
}
