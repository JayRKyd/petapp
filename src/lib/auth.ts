/**
 * The owner's sign-in: one password, kept in OWNER_PASSWORD. A signed cookie
 * marks the browser as signed in for 30 days. Runs in both the Node server
 * and the edge middleware, so it uses Web Crypto only. Supabase Auth can
 * replace this once the database exists.
 */
export const SESSION_COOKIE = 'groom-session';
const DAYS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('Set AUTH_SECRET in .env.local (any long random string).');
  return s;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '');
}

/** The cookie value for a fresh session. */
export async function createSessionToken(): Promise<string> {
  const payload = `owner.${Date.now() + DAYS * 86_400_000}`;
  return `${payload}.${await sign(payload)}`;
}

/** True when the cookie was signed by us and has not expired. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const expires = Number(payload.split('.')[1]);
  if (!(expires > Date.now())) return false;
  try {
    return (await sign(payload)) === token.slice(i + 1);
  } catch {
    return false;
  }
}

export function passwordMatches(password: string): boolean {
  const expected = process.env.OWNER_PASSWORD;
  if (!expected) throw new Error('Set OWNER_PASSWORD in .env.local.');
  return password === expected;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: DAYS * 86_400,
};
