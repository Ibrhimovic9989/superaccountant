import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { AppNav } from '@/components/app-nav'
import { PageBackdrop } from '@/components/page-backdrop'
import { auth } from '@/lib/auth'
import { prisma } from '@sa/db'
import { isAdmin } from '@/lib/community/recruiter-store'
import { AdminRecruiterApprovalRow } from '@/components/community/admin-recruiter-approval-row'

export const metadata: Metadata = {
  title: 'Recruiter access · admin · SuperAccountant',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type PageParams = { locale: 'en' | 'ar' }

type ApplicationRow = {
  userId: string
  name: string | null
  email: string
  companyName: string | null
  companyDomain: string | null
  notes: string | null
  approvedAt: Date | null
  approvedBy: string | null
  createdAt: Date
}

export default async function AdminRecruiterAccessPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  if (!(await isAdmin(session.user.id))) redirect(`/${locale}/dashboard`)

  const rows = await prisma.$queryRawUnsafe<ApplicationRow[]>(
    `SELECT ra."userId", iu.name, iu.email, ra."companyName", ra."companyDomain",
            ra.notes, ra."approvedAt", ra."approvedBy", ra."createdAt"
       FROM "RecruiterAccess" ra
       JOIN "IdentityUser" iu ON iu.id = ra."userId"
       ORDER BY ra."approvedAt" IS NULL DESC, ra."createdAt" DESC
       LIMIT 100`,
  )

  const pending = rows.filter((r) => !r.approvedAt)
  const approved = rows.filter((r) => !!r.approvedAt)

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      <PageBackdrop />
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Recruiter access
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {pending.length} pending · {approved.length} approved
          </p>
        </header>

        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            Pending review
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-bg-elev p-6 text-center text-sm text-fg-muted">
              Nothing waiting.
            </p>
          ) : (
            <ul className="space-y-3">
              {pending.map((r) => (
                <li
                  key={r.userId}
                  className="rounded-2xl border border-border bg-bg-elev p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.name ?? r.email}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {r.companyName} · {r.companyDomain} · {r.email}
                      </p>
                      {r.notes && (
                        <p className="mt-3 rounded-lg border border-border bg-bg p-3 text-xs text-fg-muted">
                          {r.notes}
                        </p>
                      )}
                    </div>
                    <AdminRecruiterApprovalRow userId={r.userId} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {approved.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              Approved · {approved.length}
            </h2>
            <ul className="space-y-2">
              {approved.slice(0, 25).map((r) => (
                <li
                  key={r.userId}
                  className="flex items-center justify-between rounded-xl border border-border bg-bg-elev px-4 py-3"
                >
                  <div>
                    <p className="text-sm">{r.name ?? r.email}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {r.companyName} · {r.companyDomain}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-success">
                    approved
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
