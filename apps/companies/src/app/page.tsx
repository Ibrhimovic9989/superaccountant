import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCompanyForUser } from '@/lib/api'

/**
 * Root router for the companies app:
 *   signed out  → /sign-in
 *   no company  → /onboarding
 *   has company → /dashboard
 */
export default async function Home() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const { company } = await getCompanyForUser(session.user.id)
  redirect(company ? '/dashboard' : '/onboarding')
}
