import { Building2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCompanyForUser, signupCompany } from '@/lib/api'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/sign-in')
  const { company } = await getCompanyForUser(session.user.id)
  if (company) redirect('/dashboard')

  async function submit(input: {
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
      const existing = await getCompanyForUser(s.user.id)
      if (existing.company) return { ok: true }
      await signupCompany({ userId: s.user.id, ...input })
      return { ok: true }
    } catch (err) {
      console.error('[companies/onboarding] failed', { err })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
        <Building2 className="h-3 w-3" />
        Company onboarding
      </div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Onboard your company</h1>
      <p className="mt-2 text-sm text-fg-muted">
        You can post jobs once a SuperAccountant admin approves your company — usually within a
        business day. We&apos;ll email you when it&apos;s live.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
        <OnboardingForm submit={submit} />
      </div>
    </main>
  )
}
