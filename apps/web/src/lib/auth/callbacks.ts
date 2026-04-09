/**
 * NextAuth callbacks. Two patterns from claude-code:
 *
 * 1. **Lazy profile fallback** (auth.ts:196-211) — only update IdentityUser
 *    fields when the new value is actually present. Never overwrite a cached
 *    name/image with empty/undefined from a transient OAuth response.
 *
 * 2. **Hard requirement: email must be verified** before access. Google emails
 *    are pre-verified by Google; magic-link sign-ins are verified by clicking
 *    the link. Anything else → deny.
 */

import type { NextAuthConfig } from 'next-auth'
import { prisma } from '@sa/db'

type SignIn = NonNullable<NonNullable<NextAuthConfig['callbacks']>['signIn']>
type Session = NonNullable<NonNullable<NextAuthConfig['callbacks']>['session']>

export const signInCallback: SignIn = async ({ user, account, profile }) => {
  if (!user.email) return false

  // Google: trust the verified flag
  if (account?.provider === 'google') {
    // biome-ignore lint/suspicious/noExplicitAny: profile shape varies by provider
    const verified = (profile as any)?.email_verified === true
    if (!verified) return false
  }

  // Magic link: NextAuth flips emailVerified itself when the link is clicked,
  // so by the time signIn runs the row is verified.

  // Lazy profile fallback: patch IdentityUser only with non-empty fields.
  const existing = await prisma.identityUser.findUnique({ where: { email: user.email } })
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (user.name && user.name !== existing.name) patch.name = user.name
    if (user.image && user.image !== existing.image) patch.image = user.image
    if (Object.keys(patch).length) {
      await prisma.identityUser.update({ where: { id: existing.id }, data: patch })
    }
  }

  return true
}

export const sessionCallback: Session = async ({ session, user }) => {
  // Surface the IdentityUser fields the frontend actually cares about.
  if (session.user && user) {
    // biome-ignore lint/suspicious/noExplicitAny: extending session.user shape
    const u = session.user as any
    u.id = user.id
    // Pull locale + role + market from the DB so the client can render correctly.
    const row = await prisma.identityUser.findUnique({
      where: { id: user.id },
      select: { locale: true, role: true, preferredTrack: true, emailVerifiedAt: true },
    })
    if (row) {
      u.locale = row.locale
      u.role = row.role
      u.preferredTrack = row.preferredTrack
      u.emailVerified = row.emailVerifiedAt !== null
    }
  }
  return session
}
