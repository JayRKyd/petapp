'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn } from './actions';

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await signIn(password);
          if (result.ok) {
            router.replace(next);
            router.refresh();
          } else setError(result.error);
        });
      }}
    >
      <div>
        <h1 className="text-xl font-semibold">Owner sign in</h1>
        <p className="text-sm text-muted-foreground">Clients book at /book without signing in.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-bold text-muted-foreground" htmlFor="password">
        Password
        <Input id="password" type="password" className="h-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11" disabled={pending || !password}>
        {pending && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
