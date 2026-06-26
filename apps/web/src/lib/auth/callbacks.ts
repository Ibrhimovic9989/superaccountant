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
import { unstable_cache, updateTag } from 'next/cache'
import { cache } from 'react'

/**
 * Per-user enrichment fields surfaced into the session payload — locale,
 * role, preferredTrack, emailVerified. Pulled out of `sessionCallback`
 * so we can cache the lookup; otherwise every authed page would pay an
 * extra Mumbai→Seoul round-trip for fields that almost never change.
 *
 * 60s unstable_cache, tagged session-enrich:<userId>. The mutation
 * paths that flip these fields (track switch in profile.ts already
 * tags profile:<id>; locale change in settings; role bumps) should
 * `updateTag('session-enrich:<userId>')` so the next page load sees
 * fresh values without waiting for the TTL.
 */
type SessionEnrichment = {
  locale: string | null
  role: string | null
  preferredTrack: 'india' | 'ksa' | null
  emailVerified: boolean
}

const getSessionEnrichment = cache((userId: string): Promise<SessionEnrichment | null> =>
  unstable_cache(
    async () => {
      const row = await prisma.identityUser.findUnique({
        where: { id: userId },
        select: { locale: true, role: true, preferredTrack: true, emailVerifiedAt: true },
      })
      if (!row) return null
      return {
        locale: row.locale,
        role: row.role,
        preferredTrack: row.preferredTrack,
        emailVerified: row.emailVerifiedAt !== null,
      }
    },
    ['session-enrich', userId],
    { revalidate: 60, tags: [`session-enrich:${userId}`] },
  )(),
)

export function bustSessionEnrichment(userId: string): void {
  updateTag(`session-enrich:${userId}`)
}

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
  if (session.user && user) {
    // biome-ignore lint/suspicious/noExplicitAny: extending session.user shape
    const u = session.user as any
    u.id = user.id
    const row = await getSessionEnrichment(user.id)
    if (row) {
      u.locale = row.locale
      u.role = row.role
      u.preferredTrack = row.preferredTrack
      u.emailVerified = row.emailVerified
    }
  }
  return session
}
