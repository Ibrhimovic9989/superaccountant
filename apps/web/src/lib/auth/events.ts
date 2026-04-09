/**
 * Auth lifecycle events.
 *
 * Patterns adopted from claude-code (logout.tsx:16-48):
 * - **Logout cascade order matters.** Flush telemetry → server session → caches.
 *   In our web context the server session is what NextAuth deletes; we just
 *   ensure derived rows (e.g. tutoring scratch memory) get cleaned up.
 * - **First-time sign-in stamps emailVerifiedAt** so the rest of the app can
 *   trust a single field for "ready to enrol".
 */

import type { NextAuthConfig } from 'next-auth'
import { prisma } from '@sa/db'

type SignInEvent = NonNullable<NonNullable<NextAuthConfig['events']>['signIn']>
type SignOutEvent = NonNullable<NonNullable<NextAuthConfig['events']>['signOut']>

export const onSignIn: SignInEvent = async ({ user, isNewUser }) => {
  if (!user?.id) return

  // Stamp our own emailVerifiedAt the first time we see the user verified.
  // NextAuth maintains its own `emailVerified` column; we mirror it.
  await prisma.identityUser.updateMany({
    where: { id: user.id, emailVerified: { not: null }, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  })

  if (isNewUser) {
    // Future: emit a NewUserCreated domain event for analytics / welcome flow.
    // For now this is a no-op — left as a deliberate hook point.
  }
}

export const onSignOut: SignOutEvent = async (msg) => {
  // NextAuth has already deleted the Session row by the time this fires.
  // Cascade: clear scratch tutoring memory associated with the user's session ids.
  // We can't access the userId reliably here on database sessions (NextAuth
  // gives us the deleted session token), so this is a placeholder for the
  // tutoring/session-cleanup hook to land in once we wire user→session mapping.
  void msg
}
