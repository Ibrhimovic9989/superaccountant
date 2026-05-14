import { Logo } from '@/components/brand/logo'
import { ApplyAndPay } from '@/components/cohort/apply-and-pay'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { auth } from '@/lib/auth'
import {
  createRazorpayOrder,
  getPublicRazorpayKeyId,
  verifyPaymentSignature,
} from '@/lib/cohort/razorpay'
import {
  consumeDiscountCode,
  createPaidApplicationFree,
  formatPrice,
  getActiveCohorts,
  getCohortById,
  getPaidSeatCounts,
  markApplicationPaid,
  upsertPendingApplication,
  validateDiscountCode,
} from '@/lib/cohort/store'
import { createMarketingLead } from '@/lib/data/leads'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@sa/i18n'
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Headphones,
  IndianRupee,
  MapPin,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'

/**
 * Public cohort details page. Lead-gen target from /quiz and any
 * marketing channel. Single-file marketing layout — hero, what you'll
 * learn, who it's for, format, schedule, instructors, placement, FAQs,
 * enrollment form at the bottom.
 *
 * Lead capture writes to MarketingLead with source='/cohort'.
 */
export default async function CohortPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  const sessionUser = session?.user?.email
    ? {
        email: session.user.email.toLowerCase(),
        name: session.user.name ?? '',
      }
    : null

  // Fetch every active cohort. The applicant picks their track in the
  // form; the chosen cohort's price + currency drives Razorpay.
  const [cohorts, paidSeats] = await Promise.all([getActiveCohorts(), getPaidSeatCounts()])
  const indianCohort = cohorts.find((c) => c.track === 'india') ?? null
  const primaryCohort = indianCohort ?? cohorts[0] ?? null
  const now = Date.now()

  /**
   * Apply a discount code. Server-only — codes are never enumerated to
   * the client. Returns the resulting amount; if 100% off, the caller
   * uses `enrollFree` instead of `createOrder`.
   */
  async function applyDiscountCode(input: {
    cohortId: string
    code: string
  }): Promise<
    | { ok: true; discountPercent: number; discountedAmountMinor: number; isFree: boolean }
    | { ok: false; reason: string }
  > {
    'use server'
    try {
      const target = await getCohortById(input.cohortId)
      if (!target || target.status !== 'open') {
        return { ok: false, reason: 'no_active_cohort' }
      }
      const res = await validateDiscountCode({
        code: input.code,
        cohortId: target.id,
        baseAmountMinor: target.discountedPriceMinor,
      })
      if (!res.ok) return { ok: false, reason: res.reason }
      return {
        ok: true,
        discountPercent: res.code.discountPercent,
        discountedAmountMinor: res.discountedAmountMinor,
        isFree: res.discountedAmountMinor === 0,
      }
    } catch (err) {
      console.error('[applyDiscountCode] failed', {
        cohortId: input.cohortId,
        codeLength: input.code?.length ?? 0,
        err,
      })
      return { ok: false, reason: 'server_error' }
    }
  }

  async function createOrder(input: {
    cohortId: string
    name: string
    phone: string
    goal: string
    /** Optional discount code applied at apply-time. */
    discountCode?: string | null
  }) {
    'use server'
    try {
      // Re-fetch session inside the action — never trust closure auth.
      const s = await auth()
      const email = s?.user?.email?.toLowerCase()
      if (!email) throw new Error('Please sign in to reserve your seat.')
      const target = await getCohortById(input.cohortId)
      if (!target || target.status !== 'open') throw new Error('Cohort is not open')
      const name = input.name.trim()
      const phone = input.phone.trim()
      if (name.length < 2) throw new Error('Name is required')
      if (phone.replace(/\D/g, '').length < 7) throw new Error('Valid phone is required')

      // Re-validate the discount code server-side (never trust the
      // client). If invalid, fall through to full price — the client
      // form already validates before showing the Pay button, so this
      // is just a safety net.
      let chargeAmountMinor = target.discountedPriceMinor
      let appliedCode: { id: string; code: string; discountPercent: number } | null = null
      if (input.discountCode) {
        const res = await validateDiscountCode({
          code: input.discountCode,
          cohortId: target.id,
          baseAmountMinor: target.discountedPriceMinor,
        })
        if (res.ok) {
          if (res.discountedAmountMinor === 0) {
            throw new Error('Free codes must use enrollFree path')
          }
          chargeAmountMinor = res.discountedAmountMinor
          appliedCode = res.code
        }
      }

      // Atomically consume one use of the code BEFORE creating the
      // Razorpay order — this is the race-safe boundary. A failed
      // payment will leave the use consumed (acceptable slippage for
      // small-volume codes; we can refund + restore manually).
      if (appliedCode) {
        const ok = await consumeDiscountCode(appliedCode.id)
        if (!ok) throw new Error('Discount code is no longer available')
      }

      // Always log the marketing lead too — even if payment is abandoned,
      // we keep the contact for follow-up.
      const hdrs = await headers()
      await createMarketingLead({
        name,
        email,
        phone,
        source: '/cohort',
        quizAnswers: {
          jobGoal: input.goal,
          ...(appliedCode ? { discountCode: appliedCode.code } : {}),
        },
        locale,
        track: target.track,
        userAgent: hdrs.get('user-agent') ?? null,
      }).catch(() => {
        // Non-fatal — duplicate inserts will just fail silently.
      })

      const order = await createRazorpayOrder({
        amountMinor: chargeAmountMinor,
        currency: target.currency,
        receipt: `coh_${target.slug}_${Date.now()}`,
        notes: {
          cohortSlug: target.slug,
          cohortName: target.name,
          name,
          email,
          phone,
          jobGoal: input.goal,
          ...(appliedCode ? { discountCode: appliedCode.code } : {}),
        },
      })

      const applicationId = await upsertPendingApplication({
        cohortId: target.id,
        name,
        email,
        phone,
        jobGoal: input.goal,
        razorpayOrderId: order.id,
        amountMinor: chargeAmountMinor,
        currency: target.currency,
        discountCode: appliedCode?.code ?? null,
        discountPercent: appliedCode?.discountPercent ?? 0,
        originalAmountMinor: appliedCode ? target.discountedPriceMinor : null,
      })

      return {
        applicationId,
        orderId: order.id,
        amountMinor: order.amount,
        currency: order.currency,
        keyId: getPublicRazorpayKeyId(),
      }
    } catch (err) {
      console.error('[createOrder] failed', {
        cohortId: input.cohortId,
        err,
      })
      throw err instanceof Error ? err : new Error('Could not start payment.')
    }
  }

  async function verifyPayment(input: {
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
  }) {
    'use server'
    const ok = verifyPaymentSignature(input)
    if (!ok) {
      return { ok: false as const, error: 'invalid_signature' }
    }
    await markApplicationPaid(input)
    return { ok: true as const }
  }

  /**
   * 100% discount path — skip Razorpay entirely. Re-validates the code
   * server-side (never trust the client), atomically increments usage,
   * inserts a paid CohortApplication. Returns ok=false if anything
   * fails so the caller can show a sensible error.
   */
  async function enrollFree(input: {
    cohortId: string
    name: string
    phone: string
    goal: string
    code: string
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    'use server'
    try {
      const s = await auth()
      const email = s?.user?.email?.toLowerCase()
      if (!email) return { ok: false, error: 'unauthenticated' }
      const target = await getCohortById(input.cohortId)
      if (!target || target.status !== 'open') return { ok: false, error: 'no_active_cohort' }
      const name = input.name.trim()
      const phone = input.phone.trim()
      const formError = checkApplicantFields({ name, email, phone })
      if (formError) return { ok: false, error: formError }

      const res = await validateDiscountCode({
        code: input.code,
        cohortId: target.id,
        baseAmountMinor: target.discountedPriceMinor,
      })
      if (!res.ok || res.discountedAmountMinor !== 0) {
        return { ok: false, error: 'invalid_code' }
      }

      const consumed = await consumeDiscountCode(res.code.id)
      if (!consumed) {
        return { ok: false, error: 'code_exhausted' }
      }

      const hdrs = await headers()
      await createMarketingLead({
        name,
        email,
        phone,
        source: '/cohort',
        quizAnswers: { jobGoal: input.goal, discountCode: res.code.code },
        locale,
        track: target.track,
        userAgent: hdrs.get('user-agent') ?? null,
      }).catch(() => {})

      await createPaidApplicationFree({
        cohortId: target.id,
        name,
        email,
        phone,
        jobGoal: input.goal,
        discountCode: res.code.code,
        originalAmountMinor: target.discountedPriceMinor,
        currency: target.currency,
      })

      return { ok: true }
    } catch (err) {
      console.error('[enrollFree] failed', {
        cohortId: input.cohortId,
        err,
      })
      return { ok: false, error: 'server_error' }
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      {/* Hero-zone dot grid — fades out as you scroll past the fold. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]">
        <DotPattern
          width={22}
          height={22}
          cr={0.9}
          glow
          className="text-fg-subtle/35 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        {/* ── Brand header ──────────────────────────────────── */}
        <BlurFade delay={0.02}>
          <Link href={`/${locale}/cohort`} className="mb-10 inline-flex items-center gap-2.5">
            <Logo size="sm" />
          </Link>
        </BlurFade>

        {/* ── Hero ───────────────────────────────────────────── */}
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-bg-elev/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted backdrop-blur-sm">
            <LivePulse />
            <span className="text-accent">Enrolment open</span>
            <span className="text-fg-subtle/60">·</span>
            <span>45-day offline cohort</span>
            <span className="text-fg-subtle/60">·</span>
            <span>Two tracks</span>
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Superaccountant&nbsp;—{' '}
            <span className="bg-gradient-to-br from-accent via-fg to-accent bg-clip-text text-transparent">
              Get Job Ready
            </span>
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-5 max-w-2xl text-lg text-fg-muted sm:text-xl">
            Become a hireable accountant in 45 days. Real classroom + real instructors, backed by an
            AI tutor in your pocket. No CA exam required.
          </p>
        </BlurFade>
        <BlurFade delay={0.2}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#apply"
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_8px_32px_-12px_rgba(139,92,246,0.5)] transition-all hover:-translate-y-0.5 hover:bg-accent/90 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.6),0_12px_40px_-12px_rgba(139,92,246,0.7)]"
            >
              <span aria-hidden className="absolute inset-0 -z-10 rounded-xl">
                <BorderBeam size={70} duration={6} colorFrom="#f5f3ff" colorTo="#a78bfa" />
              </span>
              {primaryCohort
                ? `Reserve seat — from ${formatPrice(
                    primaryCohort.discountedPriceMinor,
                    primaryCohort.currency,
                  )}`
                : 'Apply for the next cohort'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </a>
            <Link
              href={`/${locale}/quiz`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-elev/80 px-6 py-4 text-base font-medium text-fg backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-bg-overlay"
            >
              Take the 2-minute quiz first
            </Link>
          </div>
        </BlurFade>

        {/* ── Active cohorts highlight ──────────────────────── */}
        {cohorts.length > 0 && (
          <BlurFade delay={0.22}>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {cohorts.map((c) => {
                const claimed = paidSeats.get(c.id) ?? 0
                const remaining = Math.max(0, c.seatsTotal - claimed)
                const fillPct = Math.min(
                  100,
                  Math.round((claimed / Math.max(c.seatsTotal, 1)) * 100),
                )
                const daysToStart = Math.max(
                  0,
                  Math.ceil((c.startDate.getTime() - now) / (24 * 60 * 60 * 1000)),
                )
                const discountPct = Math.round(
                  ((c.originalPriceMinor - c.discountedPriceMinor) / c.originalPriceMinor) * 100,
                )
                const isIndia = c.track === 'india'
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border-2 p-6 backdrop-blur-sm transition-all hover:-translate-y-1',
                      isIndia
                        ? 'border-accent/40 bg-gradient-to-br from-accent-soft/40 via-bg-elev/40 to-bg-elev/40 hover:border-accent/70'
                        : 'border-success/40 bg-gradient-to-br from-success/10 via-bg-elev/40 to-bg-elev/40 hover:border-success/70',
                    )}
                  >
                    {/* Animated halo on hover */}
                    <BorderBeam
                      size={140}
                      duration={9}
                      colorFrom={isIndia ? '#a78bfa' : '#10b981'}
                      colorTo={isIndia ? '#8b5cf6' : '#059669'}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    />

                    <div className="flex items-start justify-between gap-3">
                      <p
                        className={cn(
                          'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider',
                          isIndia ? 'text-accent' : 'text-success',
                        )}
                      >
                        <span aria-hidden className="text-base leading-none">
                          {isIndia ? '🇮🇳' : '🇸🇦'}
                        </span>
                        {isIndia ? 'Indian Chartered' : "Saudi Mu'tamad"}
                      </p>
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                          isIndia
                            ? 'border-accent/30 bg-accent-soft/60 text-accent'
                            : 'border-success/30 bg-success/10 text-success',
                        )}
                      >
                        {discountPct}% off · launch
                      </span>
                    </div>

                    {/* Cohort code rendered as a stylised token */}
                    <div className="mt-3 inline-flex items-baseline gap-2 font-mono">
                      <span className="text-fg-subtle">[</span>
                      <span
                        className={cn(
                          'text-3xl font-bold tracking-tight sm:text-4xl',
                          isIndia ? 'text-accent' : 'text-success',
                        )}
                      >
                        {c.name}
                      </span>
                      <span className="text-fg-subtle">]</span>
                    </div>

                    <p className="mt-3 text-sm text-fg-muted">
                      <strong className="text-fg">
                        {c.startDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </strong>
                      {c.city ? ` · ${c.city}` : ''} · {c.durationDays} days
                    </p>

                    {/* Seats progress bar — live data */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                        <span className="text-fg-subtle">
                          {remaining} of {c.seatsTotal} seats left
                        </span>
                        <span className={cn(isIndia ? 'text-accent' : 'text-success')}>
                          T-{daysToStart}d
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-overlay">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-700',
                            isIndia ? 'bg-accent' : 'bg-success',
                          )}
                          style={{ width: `${Math.max(fillPct, 4)}%` }}
                        />
                      </div>
                    </div>

                    {/* Price + strikethrough */}
                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                        {formatPrice(c.discountedPriceMinor, c.currency)}
                      </span>
                      <span className="text-base text-fg-subtle line-through">
                        {formatPrice(c.originalPriceMinor, c.currency)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </BlurFade>
        )}

        {/* ── Quick facts strip ──────────────────────────────── */}
        <BlurFade delay={0.25}>
          <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:grid-cols-4">
            <Fact icon={<Clock className="h-4 w-4" />} label="Duration" value="45 days" />
            <Fact icon={<MapPin className="h-4 w-4" />} label="Format" value="Offline + app" />
            <Fact icon={<Users className="h-4 w-4" />} label="Cohort size" value="~30 students" />
            <Fact icon={<Trophy className="h-4 w-4" />} label="Placement" value="Included" />
          </div>
        </BlurFade>

        {/* ── Two tracks ─────────────────────────────────────── */}
        <Section
          delay={0.28}
          eyebrow="Pick your track"
          title="Two cohorts. Same depth. Built for where you actually work."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft/20 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  🇮🇳
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                    Track 1
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight">Indian Chartered</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                For India-based students. Companies Act 2013, Income Tax Act 1961, CGST/SGST/IGST,
                TDS, ICAI standards, Ind AS where relevant. Tally Prime is the primary tool, with
                Zoho Books + QuickBooks as bonus skills.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Companies Act', 'GST', 'TDS', 'Ind AS', 'Tally Prime', '₹'].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-border bg-bg-elev px-2 py-0.5 text-xs text-fg-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>
                  🇸🇦
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                    Track 2
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight">Saudi Mu'tamad</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-fg-muted">
                For KSA-based students. ZATCA regulations, VAT Implementing Regs, Zakat Bylaws, IFRS
                as endorsed by SOCPA, Saudi Companies Law. Fatoora Phase 2 e-invoicing is built into
                the curriculum, not an afterthought.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['ZATCA', 'VAT 15%', 'Zakat', 'Fatoora', 'IFRS · SOCPA', 'SAR'].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-md border border-border bg-bg-elev px-2 py-0.5 text-xs text-fg-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-fg-subtle">
            You pick your track during sign-up. The cohort calendar, instructors, and tutor are all
            tuned to your jurisdiction — no mixed content.
          </p>
        </Section>

        {/* ── Who it's for ───────────────────────────────────── */}
        <Section
          delay={0.3}
          eyebrow="Who this is for"
          title="Built for the people most other programs ignore"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Persona
              emoji="🎓"
              title="Graduates"
              body="Commerce / non-commerce graduates looking for their first proper job. We don't care about your percentage — we care about your effort."
            />
            <Persona
              emoji="🔁"
              title="Career switchers"
              body="Working in sales, ops, BPO, or anything else and want to move into accounting? 45 days closes the gap."
            />
            <Persona
              emoji="🏪"
              title="Small business owners"
              body="Tired of depending on your CA for every little thing? Run your own books with confidence."
            />
          </div>
        </Section>

        {/* ── What you'll learn ──────────────────────────────── */}
        <Section
          delay={0.35}
          eyebrow="Curriculum"
          title="Everything you need to start booking entries on day 46"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Curriculum
              icon={<BookOpen className="h-4 w-4" />}
              title="Accounting fundamentals"
              body="Double-entry, journals, ledgers, trial balance, P&L, balance sheet — taught the way a working accountant actually uses them."
            />
            <Curriculum
              icon={<IndianRupee className="h-4 w-4" />}
              title="Tally Prime end-to-end"
              body="Install, masters, vouchers (sales/purchase/payment/receipt), inventory, GST, TDS, payroll, year-end."
            />
            <Curriculum
              icon={<Award className="h-4 w-4" />}
              title="GST + TDS compliance"
              body="GSTR-1 and 3B end-to-end, 2B reconciliation, TDS sections 192/194A/C/H/I/J, Form 26Q filing."
            />
            <Curriculum
              icon={<Briefcase className="h-4 w-4" />}
              title="Excel for accountants"
              body="VLOOKUP, pivots, IF, SUMIFS — the 20 functions that make 80% of an accountant's spreadsheet work."
            />
            <Curriculum
              icon={<GraduationCap className="h-4 w-4" />}
              title="Zoho Books + QuickBooks intro"
              body="Most jobs ask for at least one cloud tool. We give you working knowledge of both for the interview."
            />
            <Curriculum
              icon={<MessageCircle className="h-4 w-4" />}
              title="Interview + placement prep"
              body="Resume rebuild, mock interviews, common accounting interview questions, salary negotiation basics."
            />
          </div>
        </Section>

        {/* ── How it works ───────────────────────────────────── */}
        <Section delay={0.4} eyebrow="Format" title="Real classroom + AI in your pocket">
          <div className="grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              icon={<MapPin className="h-4 w-4" />}
              title="Offline classes"
              body="3-hour evening sessions, Monday–Saturday, with an experienced instructor. Hands-on Tally + Excel from day one."
            />
            <Step
              n={2}
              icon={<Sparkles className="h-4 w-4" />}
              title="AI tutor at night"
              body="24/7 AI tutor on the Superaccountant app. Daily homework personalised to what you struggled with. Bilingual — English or Hindi."
            />
            <Step
              n={3}
              icon={<Headphones className="h-4 w-4" />}
              title="Live doubt support"
              body="WhatsApp group with your instructor + cohort. Get a real human in under 4 hours, any weekday."
            />
          </div>
        </Section>

        {/* ── Schedule ───────────────────────────────────────── */}
        <Section
          delay={0.45}
          eyebrow="Schedule"
          title="Daily rhythm so the habit forms before the cohort ends"
        >
          <div className="rounded-2xl border border-border bg-bg-elev/40 p-6 sm:p-8">
            <div className="space-y-4">
              <Schedule
                time="6:30 PM – 9:30 PM"
                day="Mon – Sat"
                what="Offline classroom — concept, demo, hands-on practice"
              />
              <Schedule
                time="10:00 PM – 11:00 PM"
                day="Every night"
                what="AI tutor homework — 5 practice questions tuned to your weak areas"
              />
              <Schedule
                time="Sunday"
                day="Optional"
                what="Doubt-clearing session + practice tests + placement workshops"
              />
              <Schedule
                time="Day 46+"
                day="Placement"
                what="Mock interviews, resume reviews, employer introductions"
              />
            </div>
          </div>
        </Section>

        {/* ── Placement ──────────────────────────────────────── */}
        <Section
          delay={0.5}
          eyebrow="Placement"
          title="We don't hand you a certificate and wave goodbye"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Bullet>
              <strong>Resume rebuild.</strong> One-on-one session to write a resume that actually
              gets responses for accounting roles.
            </Bullet>
            <Bullet>
              <strong>Mock interviews.</strong> 3 mock interviews with real accountants + recruiters
              before you ever sit in front of an employer.
            </Bullet>
            <Bullet>
              <strong>Hiring partner intros.</strong> CA firms, SMEs, e-commerce companies, and
              shared-service centres actively looking for entry-level accountants.
            </Bullet>
            <Bullet>
              <strong>Salary negotiation.</strong> Most freshers under-negotiate by ₹40k+ a year. We
              show you how to ask for what the market actually pays.
            </Bullet>
          </div>
        </Section>

        {/* ── Certificate ────────────────────────────────────── */}
        <Section delay={0.55} eyebrow="Certificate" title="Verified, signed, can't be faked">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent-soft">
              <Award className="h-8 w-8 text-accent" />
            </div>
            <p className="text-base text-fg-muted sm:text-lg">
              Each certificate is hash-signed and verifiable at a public URL. Employers can confirm
              authenticity in one click — no PDF forgery possible. It's not just a piece of paper;
              it's a record you can defend in any interview.
            </p>
          </div>
        </Section>

        {/* ── FAQs ───────────────────────────────────────────── */}
        <Section delay={0.6} eyebrow="FAQs" title="The questions everyone asks before applying">
          <div className="space-y-3">
            <Faq q="I'm not from a commerce background. Can I still join?">
              Yes. The first week is a fast crash course on debit/credit fundamentals. By week 2
              you'll be at the same level as commerce graduates. We've placed students from
              engineering, BBA, BA, and even arts backgrounds.
            </Faq>
            <Faq q="Do I need to know Tally already?">
              No. We start from "how to install Tally Prime" and build to "file GSTR-3B from a
              month's worth of vouchers." Total hand-holding for the first week.
            </Faq>
            <Faq q="What kind of jobs do graduates get?">
              Junior accountant, accounts executive, accounts assistant, audit associate. Typical
              starting salary: ₹2.2L – ₹3.6L p.a. for freshers in Tier 2 / Tier 3 cities, ₹3.0L –
              ₹4.5L in Tier 1.
            </Faq>
            <Faq q="What's the fee structure?">
              Limited information online — we walk you through it on the application call. There's a
              flexible payment plan (3 / 6 EMIs) and a placement-linked option for graduates from
              financially-constrained backgrounds.
            </Faq>
            <Faq q="What if I miss a class?">
              Every classroom session is also recorded. Your AI tutor on the app has full curriculum
              context so you can catch up at your own pace. Miss more than 6 classes in the 45 days,
              though, and we'll have a chat about whether this is the right time.
            </Faq>
            <Faq q="Is placement guaranteed?">
              Honest answer: no. What's guaranteed is the support — resume rebuild, 3 mocks, hiring
              partner intros, salary negotiation help. Whether you land depends on you doing the
              work. ~80% of our graduates have a job within 90 days of the cohort ending.
            </Faq>
          </div>
        </Section>

        {/* ── Apply + pay form ──────────────────────────────── */}
        <section id="apply" className="mt-20 scroll-mt-12">
          <BlurFade delay={0.7}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Sparkles className="h-3 w-3 text-accent" />
              Apply + pay
            </div>
          </BlurFade>
          <BlurFade delay={0.72}>
            {cohorts.length > 0 ? (
              <ApplyAndPay
                cohorts={cohorts.map((c) => ({
                  id: c.id,
                  name: c.name,
                  track: c.track,
                  amountMinor: c.discountedPriceMinor,
                  originalPriceMinor: c.originalPriceMinor,
                  currency: c.currency,
                  priceLabel: formatPrice(c.discountedPriceMinor, c.currency),
                  originalPriceLabel: formatPrice(c.originalPriceMinor, c.currency),
                }))}
                sessionUser={sessionUser}
                signInUrl={`/${locale}/sign-in?callbackUrl=${encodeURIComponent(
                  `/${locale}/cohort#apply`,
                )}`}
                successUrl={`/${locale}/dashboard`}
                createOrder={createOrder}
                verifyPayment={verifyPayment}
                applyDiscountCode={applyDiscountCode}
                enrollFree={enrollFree}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-bg-elev/40 p-6 sm:p-8">
                <p className="text-base text-fg-muted">
                  No cohort is currently open for enrolment. Drop us a note and we'll WhatsApp you
                  the moment the next cohort opens.
                </p>
              </div>
            )}
          </BlurFade>
        </section>

        <footer className="mt-20 border-t border-border pt-8 text-center text-xs text-fg-subtle">
          <p>
            Superaccountant · Built for the people most other programs ignore · Bilingual (EN /
            हिंदी)
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link href={`/${locale}/terms`} className="hover:text-fg">
              Terms &amp; Conditions
            </Link>
            <span className="text-fg-subtle/40">·</span>
            <Link href={`/${locale}/refund-policy`} className="hover:text-fg">
              Refund Policy
            </Link>
            <span className="text-fg-subtle/40">·</span>
            <span>info@superaccountant.in</span>
          </p>
        </footer>
      </main>

      {/* Subtle background glow on the apply form */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <BorderBeam size={200} duration={20} colorFrom="#a78bfa" colorTo="#8b5cf6" />
      </div>
    </div>
  )
}

// Pure validator — kept at module scope so it doesn't push the
// closing server actions over biome's complexity budget.
function checkApplicantFields(args: { name: string; email: string; phone: string }): string | null {
  if (args.name.length < 2) return 'invalid_name'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) return 'invalid_email'
  if (args.phone.replace(/\D/g, '').length < 7) return 'invalid_phone'
  return null
}

// ── Reusable little sub-components ────────────────────────────

function LivePulse() {
  return (
    <span aria-hidden className="relative inline-flex h-2 w-2 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  )
}

function Section({
  delay,
  eyebrow,
  title,
  children,
}: {
  delay: number
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-20">
      <BlurFade delay={delay}>
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </BlurFade>
      <BlurFade delay={delay + 0.04}>
        <div className="mt-6">{children}</div>
      </BlurFade>
    </section>
  )
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <span className="text-accent">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function Persona({
  emoji,
  title,
  body,
}: {
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5 sm:p-6">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  )
}

function Curriculum({
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
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Step {n}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  )
}

function Schedule({ time, day, what }: { time: string; day: string; what: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-center gap-2 sm:w-56">
        <Calendar className="h-3.5 w-3.5 text-accent" />
        <p className="font-mono text-xs uppercase tracking-wider text-fg-muted">
          {time} <span className="text-fg-subtle">· {day}</span>
        </p>
      </div>
      <p className="text-sm text-fg sm:text-base">{what}</p>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-bg-elev/40 p-5">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <p className="text-sm leading-relaxed text-fg-muted sm:text-base">{children}</p>
    </div>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-bg-elev/40 p-5 sm:p-6">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-medium tracking-tight">
        {q}
        <span className="font-mono text-xl text-fg-subtle transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{children}</p>
    </details>
  )
}
