/**
 * NextAuth v5 config for the blog app. Independent session from the
 * student app and the companies app: a blog admin signs in directly
 * on blog.superaccountant.in. Same DB, same NEXTAUTH_SECRET, same
 * providers, so the existing IdentityUser row is reused.
 *
 * Mirrors apps/companies/src/lib/auth/config.ts. The two apps are
 * deliberately separate (not a shared package) so they can diverge.
 *
 * Phase 2: the Google provider will gain
 *   https://www.googleapis.com/auth/analytics.readonly
 * once we wire admin GA4 dashboards. Today: basic openid/profile/email.
 */

import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Nodemailer from 'next-auth/providers/nodemailer'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@sa/db'
import { sendEmail, buildVerificationEmail } from '@sa/email'
import { loadEnv } from '@sa/config'

const env = loadEnv()

// Alias the context-namespaced Prisma models to what @auth/prisma-adapter
// expects (account / session / verificationToken / user). Same proxy
// trick as apps/web + apps/companies.
// biome-ignore lint/suspicious/noExplicitAny: aliasing through a Proxy
const adapterPrisma: any = new Proxy(prisma, {
  get(target, prop, receiver) {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic model access
    const t = target as any
    if (prop === 'account') return t.identityAccount
    if (prop === 'session') return t.identityAuthSession
    if (prop === 'verificationToken') return t.identityVerificationToken
    if (prop === 'user') return t.identityUser
    return Reflect.get(target, prop, receiver)
  },
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(adapterPrisma),
  session: { strategy: 'database', maxAge: 60 * 60 * 24 * 30 },
  // The blog runs on its own subdomain and NEXTAUTH_URL points elsewhere.
  trustHost: true,
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in?check=1',
    error: '/sign-in?error=1',
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Nodemailer({
      server: { host: 'unused', port: 0, auth: { user: '', pass: '' } },
      from: env.EMAIL_FROM,
      maxAge: 60 * 60 * 24,
      async sendVerificationRequest({ identifier: email, url }) {
        const { subject, html, text } = buildVerificationEmail({ url, email, locale: 'en' })
        await sendEmail({ to: email, subject, html, text })
      },
    }),
  ],
}
