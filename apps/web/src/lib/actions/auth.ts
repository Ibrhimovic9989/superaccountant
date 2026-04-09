'use server'

import { signOut } from '@/lib/auth'

/**
 * Server action invoked from the user menu sign-out button.
 * Clears the NextAuth session and sends the user back to sign-in.
 */
export async function signOutAction(locale: 'en' | 'ar') {
  await signOut({ redirectTo: `/${locale}/sign-in` })
}
