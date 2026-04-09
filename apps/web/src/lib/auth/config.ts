/**
 * NextAuth v5 configuration.
 *
 * Providers: Google OAuth + Email magic link via Resend.
 * Adapter:   Prisma adapter against @sa/db.
 * Session:   Database strategy (we want server-side revocation + audit).
 *
 * Two patterns lifted from claude-code (CLAUDE.md §10):
 *
 * 1. Lazy profile fallback — never overwrite cached IdentityUser fields with
 *    empty values from a transient OAuth provider response (auth.ts:196-211).
 * 2. Logout cascade — flush in deterministic order: server session → cookies →
 *    in-memory caches (logout.tsx:16-48). Implemented in events.ts.
 *
 * Email verification is mandatory before any enrollment (CLAUDE.md §9).
 */

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Nodemailer from 'next-auth/providers/nodemailer'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@sa/db'
import { sendEmail, buildVerificationEmail } from '@sa/email'
import { loadEnv } from '@sa/config'
import { signInCallback, sessionCallback } from './callbacks'
import { onSignIn, onSignOut } from './events'

const env = loadEnv()

// The Prisma models are namespaced by bounded context (IdentityAccount,
// IdentityAuthSession, IdentityVerificationToken) but @auth/prisma-adapter
// expects them at `prisma.account`, `prisma.session`, `prisma.verificationToken`.
// We pass a thin proxy that aliases them. The DB tables themselves are already
// named correctly via @@map, so this is a JS-only rename.
// biome-ignore lint/suspicious/noExplicitAny: aliasing through a Proxy
const adapterPrisma: any = new Proxy(prisma, {
  get(target, prop, receiver) {
    if (prop === 'account') return (target as any).identityAccount
    if (prop === 'session') return (target as any).identityAuthSession
    if (prop === 'verificationToken') return (target as any).identityVerificationToken
    if (prop === 'user') return (target as any).identityUser
    return Reflect.get(target, prop, receiver)
  },
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(adapterPrisma),

  session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30 /* 30 days */ },

  pages: {
    signIn: '/en/sign-in',
    verifyRequest: '/en/verify-request',
    error: '/en/auth-error',
  },

  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // PKCE + state are on by default in NextAuth v5; nothing extra needed.
      // Allow account linking by email for users who first signed up via magic link.
      allowDangerousEmailAccountLinking: true,
    }),
    Nodemailer({
      // We don't actually use SMTP — sendVerificationRequest below routes the
      // mail through @sa/email (Resend). The `server` field is required by
      // the provider's type but unused.
      server: { host: 'unused', port: 0, auth: { user: '', pass: '' } },
      from: env.EMAIL_FROM,
      maxAge: 60 * 60 * 24 /* 24h */,
      async sendVerificationRequest({ identifier: email, url }) {
        // Locale is encoded in the callback URL's pathname (`/en/...` or `/ar/...`).
        const locale: 'en' | 'ar' = url.includes('/ar/') ? 'ar' : 'en'
        const { subject, html, text } = buildVerificationEmail({ url, email, locale })
        await sendEmail({ to: email, subject, html, text })
      },
    }),
  ],

  callbacks: {
    signIn: signInCallback,
    session: sessionCallback,
  },

  events: {
    signIn: onSignIn,
    signOut: onSignOut,
  },
}
