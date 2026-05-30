import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  Infinity as InfinityIcon,
  Sparkles,
  Trophy,
  UserPlus,
  Wallet,
} from 'lucide-react'
import Link from 'next/link'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { Logo } from '@/components/brand/logo'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { auth } from '@/lib/auth'
import { MILESTONE_CATALOG, SA_POINTS_POLICY } from '@/lib/loyalty/milestones'
import { getWalletBalance } from '@/lib/loyalty/store'

/**
 * Public-facing SA Points explainer + (if signed in) the user's
 * current wallet balance. One page that covers:
 *   • What SA Cash is + the 1-to-1 INR / 22-to-1 SAR conversion.
 *   • Every way to earn, with the locked point values.
 *   • The 12-month expiry policy.
 *   • How to redeem (the "Use SA Cash" toggle at checkout).
 *
 * Linked from the wallet tile, every lesson hint, and the dashboard.
 */
export default async function RewardsPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  const balance = session?.user?.id
    ? await getWalletBalance(session.user.id).catch(() => null)
    : null

  return (
    <div className="min-h-screen bg-bg text-fg">
      {session?.user ? (
        <AppNav
          locale={locale}
          userName={session.user.name ?? null}
          userEmail={session.user.email ?? ''}
        />
      ) : (
        <header className="border-b border-border bg-bg-elev/50 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href={`/${locale}`} className="inline-flex items-center gap-2">
              <Logo size="sm" />
            </Link>
            <Link
              href={`/${locale}/sign-in`}
              className="text-sm font-medium text-fg-muted hover:text-fg"
            >
              Sign in →
            </Link>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
          <Coins className="h-3 w-3" />
          SA Cash · loyalty rewards
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Learn here, save on the next cohort.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-fg-muted">
          SA Points are SuperAccountant&apos;s built-in reward currency. Hit a milestone, get
          credited automatically, redeem up to <strong className="text-fg">100%</strong> of any
          cohort fee at checkout. <strong className="text-fg">1 SA = ₹1 INR · 22 SA = ﷼1 SAR</strong>.
        </p>

        {/* ── If signed-in: their balance ────────────────────── */}
        {balance && (
          <div className="mt-8 rounded-2xl border border-success/30 bg-success/10 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                  Your wallet
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <NumberTicker
                    value={balance.available}
                    className="font-mono text-4xl font-semibold tracking-tight text-fg sm:text-5xl"
                  />
                  <span className="text-base text-fg-muted">SA available</span>
                </div>
                <p className="mt-1 text-sm text-fg-muted">
                  Lifetime earned: {balance.lifetimeEarned.toLocaleString()} SA
                  {balance.pendingExpiry > 0 && (
                    <> · {balance.pendingExpiry.toLocaleString()} SA expiring soon</>
                  )}
                </p>
              </div>
              <Wallet className="h-10 w-10 shrink-0 text-success/50" />
            </div>
          </div>
        )}

        {/* ── Earn — the milestone catalog ───────────────────── */}
        <h2 className="mt-12 mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
          Ways to earn
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MILESTONE_CATALOG.map((m) => (
            <div
              key={m.key}
              className="relative overflow-hidden rounded-2xl border border-border bg-bg-elev/40 p-5"
            >
              <div className="mb-2 flex items-center gap-2">
                {iconFor(m.key)}
                <h3 className="text-base font-semibold tracking-tight">{m.title}</h3>
              </div>
              <p className="text-sm text-fg-muted">{m.description}</p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-semibold tracking-tight text-success">
                  +{m.points.toLocaleString()}
                </span>
                <span className="text-sm text-fg-muted">SA per award</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-fg-subtle">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5">
                  {m.maxAwards === 'unlimited' ? (
                    <>
                      <InfinityIcon className="h-3 w-3" /> Unlimited times
                    </>
                  ) : (
                    <>Up to {m.maxAwards}× per student</>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5">
                  Lifetime cap: {m.lifetimeCapPoints === 'unlimited'
                    ? 'unlimited'
                    : `${m.lifetimeCapPoints.toLocaleString()} SA`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Spend — how redemption works ───────────────────── */}
        <h2 className="mt-12 mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
          How to spend
        </h2>
        <div className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-6 sm:p-8">
          <p className="text-base text-fg sm:text-lg">
            Open <strong>Reserve seat</strong> on any cohort page and check the{' '}
            <strong className="inline-flex items-center gap-1">
              <Wallet className="h-4 w-4" /> Use SA Cash
            </strong>{' '}
            box. The Pay amount drops live as you toggle it.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-fg-muted">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Redeem up to <strong className="text-fg">{SA_POINTS_POLICY.maxRedemptionPercent}%</strong>{' '}
              of the cohort fee — pay the rest via Razorpay (UPI / card / EMI).
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Conversion is fixed: <strong className="text-fg">1 SA = ₹1</strong> for the India
              track, <strong className="text-fg">22 SA = ﷼1</strong> for the Saudi track.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Doesn&apos;t stack with discount codes or the 2-installment plan — pick the best one
              for you.
            </li>
          </ul>
          <Link
            href={`/${locale}/cohort#apply`}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-bg hover:bg-accent/90"
          >
            See cohort options
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </div>

        {/* ── Rules / fine print ─────────────────────────────── */}
        <h2 className="mt-12 mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
          The fine print
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <RuleCard
            icon={<Clock className="h-4 w-4 text-warning" />}
            title="12-month expiry"
            body={`Every credit expires ${SA_POINTS_POLICY.expiryMonths} months after it lands. Use them — they're cash equivalent until then.`}
          />
          <RuleCard
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            title="Auto-credited"
            body="No claim forms. The moment a phase completes or your grand-test passes, the points are in your wallet."
          />
          <RuleCard
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Audit-trail ledger"
            body="Every credit and debit is logged. You see the full history in your wallet tile on the dashboard."
          />
          <RuleCard
            icon={<UserPlus className="h-4 w-4 text-accent" />}
            title="Referrals coming"
            body="The referral programme is wired — invite UX ships next; once live, each conversion drops 1,000 SA in your wallet."
          />
        </div>
      </main>
    </div>
  )
}

function iconFor(key: string) {
  if (key === 'phase_complete') return <Sparkles className="h-4 w-4 text-accent" />
  if (key === 'grand_test_pass') return <Trophy className="h-4 w-4 text-warning" />
  if (key === 'referral_conversion') return <UserPlus className="h-4 w-4 text-success" />
  return <Coins className="h-4 w-4 text-fg-muted" />
}

function RuleCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-fg-muted">{body}</p>
    </div>
  )
}
