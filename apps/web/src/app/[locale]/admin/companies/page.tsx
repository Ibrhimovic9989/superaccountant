import {
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  ShieldX,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { auth } from '@/lib/auth'
import {
  applyCompanyTransition,
  listApprovedCompanies,
  listPendingCompanies,
} from '@/lib/careers/store'
import { getAccessTier, isAdmin } from '@/lib/cohort/access'

/**
 * Admin-only approval queue.
 *
 *   Top section  — companies in 'pending_approval' (action: approve / suspend)
 *   Bottom       — currently approved companies (action: suspend)
 *
 * All mutations go through the state machine in
 * apps/web/src/lib/careers/approval.ts so illegal transitions are
 * impossible. revalidatePath refreshes this page after each action.
 */
export default async function AdminCompaniesPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!isAdmin(tier)) redirect(`/${locale}/dashboard`)
  const adminUserId = session.user.id

  const [pending, approved] = await Promise.all([
    listPendingCompanies(),
    listApprovedCompanies(),
  ])

  async function approve(formData: FormData): Promise<void> {
    'use server'
    const companyId = String(formData.get('companyId') ?? '')
    if (!companyId) return
    await applyCompanyTransition({
      companyId,
      event: { type: 'approve', adminUserId },
    })
    revalidatePath(`/${locale}/admin/companies`)
  }

  async function suspend(formData: FormData): Promise<void> {
    'use server'
    const companyId = String(formData.get('companyId') ?? '')
    const reason = String(formData.get('reason') ?? '').trim() || undefined
    if (!companyId) return
    await applyCompanyTransition({
      companyId,
      event: { type: 'suspend', adminUserId, reason },
    })
    revalidatePath(`/${locale}/admin/companies`)
  }

  async function reinstate(formData: FormData): Promise<void> {
    'use server'
    const companyId = String(formData.get('companyId') ?? '')
    if (!companyId) return
    await applyCompanyTransition({
      companyId,
      event: { type: 'reinstate', adminUserId },
    })
    revalidatePath(`/${locale}/admin/companies`)
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-warning">
          <Sparkles className="h-3 w-3" />
          Admin
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Company approvals
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Only approved companies can post jobs. Suspended companies keep their posted jobs visible
          but can&apos;t mutate them or post new ones until reinstated.
        </p>

        {/* ── Pending queue ──────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            <Clock className="h-3.5 w-3.5" />
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              Nothing waiting.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border-2 border-accent/30 bg-accent-soft/20 p-5"
                >
                  <CompanyHeader name={c.name} city={c.city} country={c.country} website={c.websiteUrl} />
                  {c.about && (
                    <p className="mt-3 line-clamp-3 text-sm text-fg-muted">{c.about}</p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <form action={approve}>
                      <input type="hidden" name="companyId" value={c.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-medium text-bg hover:bg-success/90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    </form>
                    {/* Suspend from pending isn't an allowed transition,
                        so no suspend button here. Admin would have to
                        approve first, then suspend — by design. */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Approved companies ─────────────────────────────── */}
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            <Building2 className="h-3.5 w-3.5" />
            Approved ({approved.length})
          </h2>
          {approved.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              No approved companies yet.
            </p>
          ) : (
            <div className="space-y-3">
              {approved.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-bg-elev/40 p-5"
                >
                  <CompanyHeader name={c.name} city={c.city} country={c.country} website={c.websiteUrl} />
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-fg-subtle hover:text-fg">
                      Suspend company…
                    </summary>
                    <form action={suspend} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="companyId" value={c.id} />
                      <input
                        type="text"
                        name="reason"
                        placeholder="Reason (shown to company)"
                        maxLength={500}
                        className="flex-1 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm outline-none focus:border-danger"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/20"
                      >
                        <ShieldX className="h-3.5 w-3.5" />
                        Suspend
                      </button>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Suspended (collapsed) ──────────────────────────── */}
        <SuspendedSection locale={locale} reinstate={reinstate} />
      </main>
    </div>
  )
}

function CompanyHeader({
  name,
  city,
  country,
  website,
}: {
  name: string
  city: string
  country: string
  website: string | null
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold">{name}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {city}, {country}
          </span>
          {website && (
            <Link
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <Globe className="h-3 w-3" />
              {website.replace(/^https?:\/\//, '')}
            </Link>
          )}
        </p>
      </div>
    </div>
  )
}

async function SuspendedSection({
  locale,
  reinstate,
}: {
  locale: SupportedLocale
  reinstate: (formData: FormData) => Promise<void>
}) {
  const { prisma } = await import('@sa/db')
  type SuspendedRow = {
    id: string
    name: string
    city: string
    country: string
    websiteUrl: string | null
    suspendReason: string | null
    suspendedAt: Date | null
  }
  const suspended = await prisma.$queryRaw<SuspendedRow[]>`
    SELECT "id", "name", "city", "country", "websiteUrl",
           "suspendReason", "suspendedAt"
    FROM "Company"
    WHERE "status" = 'suspended'
    ORDER BY "suspendedAt" DESC NULLS LAST
  `
  if (suspended.length === 0) return null
  return (
    <section className="mt-12">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
        <ShieldX className="h-3.5 w-3.5" />
        Suspended ({suspended.length})
      </h2>
      <div className="space-y-3">
        {suspended.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-danger/30 bg-danger/5 p-5"
          >
            <CompanyHeader name={c.name} city={c.city} country={c.country} website={c.websiteUrl} />
            {c.suspendReason && (
              <p className="mt-2 text-xs text-danger">Reason: {c.suspendReason}</p>
            )}
            <form action={reinstate} className="mt-3">
              <input type="hidden" name="companyId" value={c.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-success/40 bg-success/10 px-3 py-1.5 text-sm font-medium text-success hover:bg-success/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Reinstate
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  )
}
