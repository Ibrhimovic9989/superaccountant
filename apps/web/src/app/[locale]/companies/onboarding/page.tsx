import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { SupportedLocale } from '@sa/i18n'
import { Logo } from '@/components/brand/logo'
import { CompanyOnboardingForm } from '@/components/companies/onboarding-form'
import { auth } from '@/lib/auth'
import { getCompanyForUser, signupCompany } from '@/lib/careers/store'

/**
 * One-shot onboarding form. Posting it:
 *   1. Creates a Company in pending_approval state
 *   2. Creates a CompanyMember(role='owner') linking the current user
 *   3. Flips IdentityUser.role to 'company_owner'
 *
 * Then redirects to /companies/dashboard which renders the pending
 * state until an admin approves.
 */
export default async function CompanyOnboardingPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/${locale}/sign-in?callbackUrl=${encodeURIComponent(
        `/${locale}/companies/onboarding`,
      )}`,
    )
  }
  // Already onboarded → bounce to dashboard.
  const existing = await getCompanyForUser(session.user.id)
  if (existing) redirect(`/${locale}/companies/dashboard`)

  async function submitOnboarding(input: {
    name: string
    websiteUrl: string | null
    about: string | null
    country: string
    city: string
    state: string | null
    postalCode: string | null
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    'use server'
    try {
      const s = await auth()
      if (!s?.user?.id) return { ok: false, error: 'not_signed_in' }
      // Re-check existence — a parallel tab could have onboarded already.
      const existing = await getCompanyForUser(s.user.id)
      if (existing) return { ok: true }
      if (!input.name.trim()) return { ok: false, error: 'name_required' }
      if (input.country.trim().length !== 2) return { ok: false, error: 'invalid_country' }
      if (!input.city.trim()) return { ok: false, error: 'city_required' }
      await signupCompany({
        userId: s.user.id,
        name: input.name,
        websiteUrl: input.websiteUrl,
        about: input.about,
        country: input.country,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
      })
      return { ok: true }
    } catch (err) {
      console.error('[company-onboarding] failed', { err })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
          <Building2 className="h-3 w-3" />
          Company onboarding
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Onboard your company
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          You can post jobs once a SuperAccountant admin approves your company. We&apos;ll email
          you when that&apos;s done — usually within a business day.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
          <CompanyOnboardingForm
            locale={locale}
            submitOnboarding={submitOnboarding}
          />
        </div>
      </main>
    </div>
  )
}
