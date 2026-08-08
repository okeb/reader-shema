import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/server';

/**
 * Handler d'API catch-all pour Better Auth (self-hosted) — spec 26.
 * Expose `/api/auth/*` (sign-in, sign-up, sign-out, get-session, verify-email,
 * request-password-reset, reset-password, magic-link/*, …).
 * 503 tant que Better Auth n'est pas configuré (mode local-only).
 */
const handler = auth ? toNextJsHandler(auth) : null;

export const GET =
  handler?.GET ?? (() => new Response('Auth non configuré', { status: 503 }));

export const POST =
  handler?.POST ?? (() => new Response('Auth non configuré', { status: 503 }));