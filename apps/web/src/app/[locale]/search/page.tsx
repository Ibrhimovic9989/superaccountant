import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import type { SupportedLocale } from '@sa/i18n'
import { redirect } from 'next/navigation'
import SearchClient from './search-client'

/**
 * Server-side gate wrapper around the client SearchClient component.
 * Cohort-paid / staff / admin pass through; preview-tier users get
 * bounced to /cohort to enrol.
 */
export default async function SearchPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)

  return <SearchClient />
}
