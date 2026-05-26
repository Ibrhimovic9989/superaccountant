import { redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { auth } from '@/lib/auth'
import { getCompanyForUser } from '@/lib/careers/store'

/**
 * Companies landing — pure router. Forks based on whether the user
 * already has a Company:
 *   - signed out  → /sign-in
 *   - no company  → /companies/onboarding
 *   - has company → /companies/dashboard
 *
 * Keeping this here means we have one stable URL ("/companies") to
 * direct prospects to from the marketing site.
 */
export default async function CompaniesLandingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/companies`)}`,
    )
  }
  const company = await getCompanyForUser(session.user.id)
  redirect(company ? `/${locale}/companies/dashboard` : `/${locale}/companies/onboarding`)
}
