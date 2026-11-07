'use server';

import { cookies } from 'next/headers';
import { SESSION_COOKIE, createSessionToken, passwordMatches, sessionCookieOptions } from '@/lib/auth';

export async function signIn(password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!passwordMatches(password)) return { ok: false, error: 'That password is not right.' };
    (await cookies()).set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not sign in' };
  }
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
