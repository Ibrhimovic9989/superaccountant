import { redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'

/**
 * The app domain (apps/web) has no landing page — that lives in apps/marketing
 * on the public domain. Anyone hitting `/[locale]` here gets bounced to the
 * dashboard, which then handles auth gating.
 */
export default async function AppRoot({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard`)
}
