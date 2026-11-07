import Link from 'next/link';
import { BUSINESS } from '@/lib/business';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-5 py-10 text-center">
      <h1 className="font-display text-2xl font-bold">That page doesn&apos;t exist</h1>
      <p className="text-muted-foreground">{BUSINESS.name} has two places to go.</p>
      <div className="flex flex-col gap-2">
        <Link href="/book" className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">
          Book a groom
        </Link>
        <Link href="/today" className="rounded-xl border px-4 py-3 font-semibold">
          Owner sign in
        </Link>
      </div>
    </main>
  );
}
