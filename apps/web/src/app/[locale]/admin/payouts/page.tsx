import { AppNav } from '@/components/app-nav'
import { auth } from '@/lib/auth'
import { getAccessTier, isAdmin } from '@/lib/cohort/access'
import {
  approvePayout,
  listPayoutRequests,
  markPaidPayout,
  rejectPayout,
  revealBankDetails,
} from '@/lib/loyalty/payout-store'
import { loadEnv } from '@sa/config'
import { buildPayoutPaidEmail, buildPayoutRejectedEmail, sendEmail } from '@sa/email'
import type { SupportedLocale } from '@sa/i18n'
import { Banknote, CheckCircle2, Clock, Coins, ShieldX, Sparkles } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { PayoutRow } from './payout-row'

/**
 * Admin queue for SA Cash cheque payouts.
 *
 *   Open queue       — status IN ('requested','approved'), action buttons
 *   Recently paid    — last 25 paid
 *   Recently rejected — last 25 rejected
 *
 * All mutations route through server actions that re-check isAdmin.
 * Each action sends an email to the student on transition (approve is
 * silent — only paid/rejected notify).
 */
export default async function AdminPayoutsPage({
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

  const [open, paid, rejected] = await Promise.all([
    listPayoutRequests({ status: ['requested', 'approved'] }),
    listPayoutRequests({ status: 'paid' }),
    listPayoutRequests({ status: 'rejected' }),
  ])

  async function approve(formData: FormData): Promise<void> {
    'use server'
    const id = String(formData.get('id') ?? '')
    if (!id) return
    await approvePayout(id, adminUserId)
    revalidatePath(`/${locale}/admin/payouts`)
  }

  async function markPaid(formData: FormData): Promise<void> {
    'use server'
    const id = String(formData.get('id') ?? '')
    const notes = String(formData.get('notes') ?? '').trim() || undefined
    if (!id) return
    await markPaidPayout(id, adminUserId, notes)
    // Best-effort student notification
    const row = open.find((r) => r.id === id)
    if (row) {
      const email = buildPayoutPaidEmail({
        recipientName: row.userName ?? row.userEmail.split('@')[0] ?? 'there',
        amountMinor: row.amountMinor,
        currency: row.currency,
        reference: notes ?? null,
      })
      sendEmail({
        to: row.userEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }).catch((e: unknown) => console.error('[payout] paid email failed', e))
    }
    revalidatePath(`/${locale}/admin/payouts`)
  }

  async function reject(formData: FormData): Promise<void> {
    'use server'
    const id = String(formData.get('id') ?? '')
    const reason = String(formData.get('reason') ?? '').trim()
    if (!id || !reason) return
    const row = open.find((r) => r.id === id)
    await rejectPayout({ id, adminUserId, reason })
    if (row) {
      const env = loadEnv()
      const email = buildPayoutRejectedEmail({
        recipientName: row.userName ?? row.userEmail.split('@')[0] ?? 'there',
        points: row.points,
        amountMinor: row.amountMinor,
        currency: row.currency,
        reason,
        rewardsUrl: `${env.NEXTAUTH_URL}/${locale}/rewards`,
      })
      sendEmail({
        to: row.userEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }).catch((e: unknown) => console.error('[payout] rejected email failed', e))
    }
    revalidatePath(`/${locale}/admin/payouts`)
  }

  const openRows = open.map((r) => ({ row: r, bank: revealBankDetails(r) }))

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
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">SA Cash payouts</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Process student cheque payout requests. Approving keeps points debited but signals
          processing has started; marking paid records the cheque #/UTR and emails the student.
          Rejecting refunds the points automatically.
        </p>

        {/* ── Open queue ─────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
            <Clock className="h-3.5 w-3.5" />
            Open ({openRows.length})
          </h2>
          {openRows.length === 0 ? (
            <p className="rounded-2xl border border-border bg-bg-elev/40 p-6 text-sm text-fg-muted">
              No open payouts.
            </p>
          ) : (
            <div className="space-y-3">
              {openRows.map(({ row, bank }) => (
                <PayoutRow
                  key={row.id}
                  row={row}
                  bank={bank}
                  approveAction={approve}
                  markPaidAction={markPaid}
                  rejectAction={reject}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Recently paid ──────────────────────────────────── */}
        <ClosedSection
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title={`Paid (${paid.length})`}
          rows={paid.slice(0, 25)}
          tone="success"
        />

        {/* ── Recently rejected ──────────────────────────────── */}
        <ClosedSection
          icon={<ShieldX className="h-3.5 w-3.5" />}
          title={`Rejected (${rejected.length})`}
          rows={rejected.slice(0, 25)}
          tone="danger"
        />
      </main>
    </div>
  )
}

function ClosedSection({
  icon,
  title,
  rows,
  tone,
}: {
  icon: React.ReactNode
  title: string
  rows: Array<{
    id: string
    userName: string | null
    userEmail: string
    points: number
    amountMinor: number
    currency: 'INR' | 'SAR'
    notes: string | null
    processedAt: Date | null
  }>
  tone: 'success' | 'danger'
}) {
  if (rows.length === 0) return null
  const wrap =
    tone === 'success' ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'
  return (
    <section className="mt-12">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${wrap}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {r.userName ?? r.userEmail.split('@')[0]}
                <span className="ms-2 text-fg-subtle">· {r.userEmail}</span>
              </p>
              <p className="mt-0.5 text-fg-muted">
                <Coins className="me-1 inline h-3 w-3" />
                {r.points.toLocaleString()} SA · <Banknote className="me-1 inline h-3 w-3" />
                {formatMoney(r.amountMinor, r.currency)}
                {r.processedAt && (
                  <span className="ms-2 text-fg-subtle">
                    {new Date(r.processedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
              {r.notes && <p className="mt-0.5 text-fg-subtle">{r.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatMoney(amountMinor: number, currency: 'INR' | 'SAR'): string {
  const major = Math.round(amountMinor / 100)
  return currency === 'INR' ? `₹${major.toLocaleString('en-IN')}` : `﷼${major.toLocaleString()}`
}
