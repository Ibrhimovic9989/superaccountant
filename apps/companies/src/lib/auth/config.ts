/**
 * NextAuth v5 config for the companies app. Independent of apps/web:
 * company HR is a distinct persona, so they sign in separately on
 * companies.superaccountant.in. Same DB, same secret, same providers —
 * so a user who already has a SuperAccountant account can sign straight
 * in here with the same Google account or email.
 *
 * Mirrors apps/web/src/lib/auth/config.ts. Kept deliberately separate
 * (not a shared package) because the two apps may diverge — e.g. the
 * companies app has no locale routing and a different sign-in page.
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
// trick as apps/web.
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
  // Trust the production host even though NEXTAUTH_URL points at the web
  // app — required because this app runs on a different subdomain.
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
