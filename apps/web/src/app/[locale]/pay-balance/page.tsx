import { Logo } from '@/components/brand/logo'
import { PayBalanceFlow } from '@/components/cohort/pay-balance-flow'
import { BlurFade } from '@/components/magicui/blur-fade'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { auth } from '@/lib/auth'
import {
  createRazorpayOrder,
  getPublicRazorpayKeyId,
  verifyPaymentSignature,
} from '@/lib/cohort/razorpay'
import {
  formatPrice,
  getApplicationWithBalance,
  markApplicationPaid,
  setBalanceOrderId,
} from '@/lib/cohort/store'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

/**
 * Pay-balance page. Surface for the second installment of an
 * 'installment-2' CohortApplication. Lookup keyed on the signed-in
 * user's email; if the user has no outstanding balance we render a
 * "you're all caught up" state instead of throwing.
 */
export default async function PayBalancePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  const email = session?.user?.email?.toLowerCase()
  if (!email) {
    redirect(`/${locale}/sign-in?callbackUrl=${encodeURIComponent(`/${locale}/pay-balance`)}`)
  }

  const app = await getApplicationWithBalance(email)
  const balanceMinor = app ? Math.max(0, app.totalAmountMinor - app.paidAmountMinor) : 0

  /**
   * Create the Razorpay order for the outstanding balance. Mirrors
   * createOrder in /cohort, but skipping the discount + lead-creation
   * paths: by definition this is a returning paid user clearing a tail.
   */
  async function createBalanceOrder() {
    'use server'
    const s = await auth()
    const sessionEmail = s?.user?.email?.toLowerCase()
    if (!sessionEmail) throw new Error('Please sign in to clear your balance.')

    const current = await getApplicationWithBalance(sessionEmail)
    if (!current) throw new Error('No outstanding balance on your account.')
    const outstanding = Math.max(0, current.totalAmountMinor - current.paidAmountMinor)
    if (outstanding <= 0) throw new Error('No outstanding balance on your account.')

    const order = await createRazorpayOrder({
      amountMinor: outstanding,
      currency: current.currency as 'INR' | 'SAR',
      receipt: `bal_${current.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        applicationId: current.id,
        cohortId: current.cohortId,
        email: current.email,
        kind: 'installment-balance',
      },
    })

    await setBalanceOrderId({
      applicationId: current.id,
      razorpayOrderId: order.id,
      amountMinor: outstanding,
    })

    return {
      orderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
      keyId: getPublicRazorpayKeyId(),
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]">
        <DotPattern
          width={22}
          height={22}
          cr={0.9}
          glow
          className="text-fg-subtle/35 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
      </div>

      <main className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
        <BlurFade delay={0.02}>
          <Link href={`/${locale}/dashboard`} className="mb-10 inline-flex items-center gap-2.5">
            <Logo size="sm" />
          </Link>
        </BlurFade>

        <BlurFade delay={0.05}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">Billing</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Installment balance
          </h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <div className="mt-10">
            {app && balanceMinor > 0 ? (
              <PayBalanceFlow
                cohortName={app.cohortName}
                balanceLabel={formatPrice(balanceMinor, app.currency)}
                paidLabel={formatPrice(app.paidAmountMinor, app.currency)}
                totalLabel={formatPrice(app.totalAmountMinor, app.currency)}
                dueLabel={
                  app.nextInstallmentDueAt
                    ? app.nextInstallmentDueAt.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })
                    : null
                }
                applicantName={app.name}
                applicantEmail={app.email}
                applicantPhone={app.phone}
                successUrl={`/${locale}/dashboard`}
                createBalanceOrder={createBalanceOrder}
                verifyPayment={verifyPayment}
              />
            ) : (
              <NoBalance locale={locale} />
            )}
          </div>
        </BlurFade>
      </main>
    </div>
  )
}

function NoBalance({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="rounded-2xl border-2 border-success/40 bg-success/5 p-8 text-center sm:p-12">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-success/40 bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">You're all caught up.</h2>
      <p className="mt-3 text-base text-fg-muted">
        No outstanding installments on your account. Jump back in below.
      </p>
      <Link
        href={`/${locale}/dashboard`}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-base font-medium text-bg transition-colors hover:bg-accent/90"
      >
        Back to dashboard
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </div>
  )
}
