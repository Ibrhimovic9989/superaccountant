import { AppNav } from '@/components/app-nav'
import { auth } from '@/lib/auth'
import { type SupportedCurrency, pointsToDiscountMinor } from '@/lib/loyalty/conversion'
import {
  DuplicateOpenPayoutError,
  getOpenPayoutForUser,
  requestPayout,
} from '@/lib/loyalty/payout-store'
import { getWalletBalance } from '@/lib/loyalty/store'
import { prisma } from '@sa/db'
import { buildPayoutRequestedEmail, sendEmail } from '@sa/email'
import type { SupportedLocale } from '@sa/i18n'
import { AlertCircle, ArrowLeft, Banknote, CheckCircle2, Coins, Wallet } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PayoutForm } from './payout-form'

/**
 * Student-facing "cash out" form. Lives at /[locale]/rewards/payout.
 *
 *   - Read-only points + computed amount banner (so the student can't
 *     fat-finger a value that exceeds their balance).
 *   - Bank details form (INR rail). SAR users still submit but admin
 *     handles SAR offline — the form copy is locale-aware about that.
 *   - One-open-at-a-time guard: if a request is already in flight,
 *     we show its status instead of the form.
 *
 * Currency comes from IdentityUser.preferredTrack (india → INR, ksa →
 * SAR). If the user hasn't picked yet we default to INR.
 */
export default async function PayoutRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>
  searchParams: Promise<{ ok?: string }>
}) {
  const { locale } = await params
  const { ok } = await searchParams
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  const [balance, profileRows, openRequest] = await Promise.all([
    getWalletBalance(userId),
    prisma.$queryRaw<
      Array<{ preferredTrack: 'india' | 'ksa' | null; name: string | null; email: string }>
    >`
      SELECT "preferredTrack", "name", "email"
      FROM "IdentityUser" WHERE "id" = ${userId} LIMIT 1
    `,
    getOpenPayoutForUser(userId),
  ])
  const profile = profileRows[0]
  const currency: SupportedCurrency = profile?.preferredTrack === 'ksa' ? 'SAR' : 'INR'
  const amountMinor = pointsToDiscountMinor(balance.available, currency)
  const major = Math.round(amountMinor / 100)
  const amountLabel =
    currency === 'INR' ? `₹${major.toLocaleString('en-IN')}` : `﷼${major.toLocaleString()}`

  // ── Server action: submit a new payout request ───────────────
  async function submitPayout(formData: FormData): Promise<void> {
    'use server'
    const fields = readBankFields(formData)
    if (!fields.accountHolderName || !fields.ifsc || !fields.accountNumber || !fields.bankName) {
      redirect(`/${locale}/rewards/payout?ok=missing`)
    }
    if (balance.available <= 0) redirect(`/${locale}/rewards/payout?ok=empty`)

    try {
      const result = await requestPayout({
        userId,
        points: balance.available,
        currency,
        bankDetails: fields.upiId
          ? { ...fields, upiId: fields.upiId }
          : {
              accountHolderName: fields.accountHolderName,
              ifsc: fields.ifsc,
              accountNumber: fields.accountNumber,
              bankName: fields.bankName,
            },
      })
      await dispatchConfirmationEmail({
        email: profile?.email,
        name: profile?.name ?? null,
        points: balance.available,
        amountMinor: result.amountMinor,
        currency,
      })
    } catch (e) {
      if (e instanceof DuplicateOpenPayoutError) {
        redirect(`/${locale}/rewards/payout?ok=duplicate`)
      }
      console.error('[payout] submit failed', e)
      redirect(`/${locale}/rewards/payout?ok=error`)
    }
    redirect(`/${locale}/rewards/payout?ok=submitted`)
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link
          href={`/${locale}/rewards`}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
          Back to wallet
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/20 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
          <Banknote className="h-3 w-3" />
          Cash out SA Points
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Convert your wallet to a cheque.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-fg-muted">
          Prefer cash now over a future discount? Submit your bank details and we&apos;ll cut a
          cheque (or direct transfer) within 5 business days.
        </p>

        {ok && <StatusBanner kind={ok} />}

        {/* ── Balance + amount preview ──────────────────────────── */}
        <div className="mt-8 rounded-2xl border border-success/30 bg-success/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                Cashing out
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-fg">
                {balance.available.toLocaleString()}{' '}
                <span className="text-base font-normal text-fg-muted">SA Points</span>
              </p>
              <p className="mt-2 text-sm text-fg-muted">
                ≈ <strong className="text-fg">{amountLabel}</strong>
                {currency === 'SAR' && (
                  <span className="ml-1 text-xs text-fg-subtle">(22 SA = ﷼1 fixed rate)</span>
                )}
              </p>
            </div>
            <Wallet className="h-10 w-10 shrink-0 text-success/50" />
          </div>
        </div>

        {/* ── Open-request guard or form ────────────────────────── */}
        {openRequest ? (
          <div className="mt-8 rounded-2xl border border-warning/30 bg-warning/10 p-6">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <h2 className="text-base font-semibold">A request is already in flight</h2>
            </div>
            <p className="text-sm text-fg-muted">
              You have one open payout request ({openRequest.points.toLocaleString()} SA Points ·
              status: <strong className="text-fg">{openRequest.status}</strong>). Wait for it to be
              paid or rejected before submitting another.
            </p>
          </div>
        ) : balance.available > 0 ? (
          <PayoutForm submitAction={submitPayout} currency={currency} />
        ) : (
          <div className="mt-8 rounded-2xl border border-border bg-bg-elev/40 p-6">
            <div className="mb-2 flex items-center gap-2">
              <Coins className="h-4 w-4 text-fg-muted" />
              <h2 className="text-base font-semibold">Wallet is empty</h2>
            </div>
            <p className="text-sm text-fg-muted">
              You need SA Points before you can cash out. Earn 200 SA per phase, 1,000 SA on grand
              test, or 1,000 SA per converted referral.
            </p>
            <Link
              href={`/${locale}/rewards`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              See ways to earn
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

const BANNERS: Record<string, { tone: 'success' | 'warning' | 'danger'; msg: string }> = {
  submitted: { tone: 'success', msg: "Request received. We'll email you within 5 business days." },
  duplicate: { tone: 'warning', msg: 'You already have an open request.' },
  missing: { tone: 'danger', msg: 'Please fill in all required bank details.' },
  empty: { tone: 'danger', msg: 'No points to redeem.' },
  error: { tone: 'danger', msg: 'Something went wrong. Please try again.' },
}

function StatusBanner({ kind }: { kind: string }) {
  const entry = BANNERS[kind]
  if (!entry) return null
  const cls =
    entry.tone === 'success'
      ? 'border-success/40 bg-success/10 text-success'
      : entry.tone === 'warning'
        ? 'border-warning/40 bg-warning/10 text-warning'
        : 'border-danger/40 bg-danger/10 text-danger'
  const Icon = entry.tone === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`mt-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon className="h-4 w-4" />
      <span>{entry.msg}</span>
    </div>
  )
}

// ── Server-action helpers (kept out of the page closure to cap
//    cognitive complexity per Biome's threshold). ─────────────

function readBankFields(formData: FormData): {
  accountHolderName: string
  ifsc: string
  accountNumber: string
  bankName: string
  upiId: string
} {
  return {
    accountHolderName: String(formData.get('accountHolderName') ?? '').trim(),
    ifsc: String(formData.get('ifsc') ?? '')
      .trim()
      .toUpperCase(),
    accountNumber: String(formData.get('accountNumber') ?? '').trim(),
    bankName: String(formData.get('bankName') ?? '').trim(),
    upiId: String(formData.get('upiId') ?? '').trim(),
  }
}

async function dispatchConfirmationEmail(args: {
  email: string | undefined
  name: string | null
  points: number
  amountMinor: number
  currency: SupportedCurrency
}): Promise<void> {
  if (!args.email) return
  // Best-effort: email failures never roll back the wallet debit.
  const built = buildPayoutRequestedEmail({
    recipientName: args.name ?? args.email.split('@')[0] ?? 'there',
    points: args.points,
    amountMinor: args.amountMinor,
    currency: args.currency,
  })
  sendEmail({
    to: args.email,
    subject: built.subject,
    html: built.html,
    text: built.text,
  }).catch((err: unknown) => console.error('[payout] confirmation email failed', err))
}
