/**
 * NextAuth v5 config for the blog app. Independent session from the
 * student app and the companies app: a blog admin signs in directly
 * on blog.superaccountant.in. Same DB, same NEXTAUTH_SECRET, same
 * providers, so the existing IdentityUser row is reused.
 *
 * Mirrors apps/companies/src/lib/auth/config.ts. The two apps are
 * deliberately separate (not a shared package) so they can diverge.
 *
 * The Google provider requests `analytics.readonly` alongside the
 * default openid/profile/email so the admin's session carries a GA4
 * access token. The token is stored on `IdentityAccount.access_token`
 * (the adapter writes it there) and is later used by the analytics
 * dashboard to query GA4 via the Data API. Admins must click "Continue"
 * on the Google consent screen the first time they sign in.
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
      authorization: {
        params: {
          // Force the consent screen so existing accounts re-prompt for the
          // newly added analytics scope. `access_type=offline` returns a
          // refresh token so we can read GA4 indefinitely.
          prompt: 'consent',
          access_type: 'offline',
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/analytics.readonly',
          ].join(' '),
        },
      },
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
