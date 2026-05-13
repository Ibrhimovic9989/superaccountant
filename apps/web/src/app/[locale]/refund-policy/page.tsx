import { Logo } from '@/components/brand/logo'
import { BlurFade } from '@/components/magicui/blur-fade'
import type { SupportedLocale } from '@sa/i18n'
import Link from 'next/link'

/**
 * Public refund + cancellation policy. Linked from the footer and
 * required by Razorpay for KYC. Written in plain English / Hindi-
 * friendly language, India consumer-protection compliant.
 */

export const metadata = {
  title: 'Refund & Cancellation Policy · Superaccountant',
  description:
    'Refund and cancellation terms for Superaccountant cohort enrolments. 7-day cooling-off, cohort cancellation rules, and how to request a refund.',
}

const COPY = {
  en: {
    title: 'Refund & Cancellation Policy',
    lastUpdated: 'Last updated: 13 May 2026',
    contactPrompt:
      'Email us at info@superaccountant.in. Refund requests are processed within 5–7 business days.',
    backToCohort: '← Back to cohort details',
  },
  ar: {
    title: 'سياسة الاسترداد والإلغاء',
    lastUpdated: 'آخر تحديث: ١٣ مايو ٢٠٢٦',
    contactPrompt:
      'راسلنا على info@superaccountant.in. تتم معالجة طلبات الاسترداد خلال 5-7 أيام عمل.',
    backToCohort: '← العودة إلى تفاصيل الكوهورت',
  },
} as const

export default async function RefundPolicyPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const t = COPY[locale]

  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <BlurFade delay={0.02}>
          <Link href={`/${locale}/cohort`} className="mb-10 inline-flex items-center gap-2.5">
            <Logo size="sm" />
          </Link>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-fg-subtle">
            {t.lastUpdated}
          </p>
        </BlurFade>

        <BlurFade delay={0.1}>
          <div className="prose prose-invert mt-10 max-w-none space-y-7 text-base leading-relaxed text-fg-muted">
            <Section heading="1. Overview">
              <p>
                This Refund &amp; Cancellation Policy applies to all paid enrolments on
                Superaccountant cohorts (the &quot;Cohorts&quot;) operated by{' '}
                <strong>Finacra Edutech</strong> (the &quot;Company&quot;, &quot;we&quot;,
                &quot;us&quot;) through the website at <strong>superaccountant.in</strong>. By
                paying the cohort fee, you (the &quot;Student&quot;) agree to the terms set out
                here.
              </p>
            </Section>

            <Section heading="2. 7-day cooling-off window">
              <p>
                You may request a <strong>full refund within 7 calendar days</strong> of payment,
                provided the cohort has not yet started.{' '}
                <em>
                  No questions asked. No reason required. The full amount is returned to the
                  original payment method.
                </em>
              </p>
              <p>
                If the cohort has already started within those 7 days, the refund is{' '}
                <strong>pro-rated</strong> based on the number of sessions you have attended (see
                §4).
              </p>
            </Section>

            <Section heading="3. Cohort cancelled by Superaccountant">
              <p>
                If we cancel a cohort for any reason — instructor unavailability, insufficient
                enrolment, force majeure — you receive a <strong>100% refund</strong> within 7
                business days, or, at your option, full credit to roll over to the next cohort.
              </p>
            </Section>

            <Section heading="4. Refund after the cohort has started">
              <p>
                Once the cohort has formally begun, refunds are calculated as follows, based on the
                date we receive your written refund request:
              </p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>
                  <strong>Day 1 – Day 7:</strong> 75% refund.
                </li>
                <li>
                  <strong>Day 8 – Day 14:</strong> 50% refund.
                </li>
                <li>
                  <strong>Day 15 – Day 21:</strong> 25% refund.
                </li>
                <li>
                  <strong>After Day 21:</strong> No refund. The remaining sessions, AI tutor access,
                  and placement support are reserved for you for the full cohort duration.
                </li>
              </ul>
            </Section>

            <Section heading="5. Non-refundable items">
              <p>
                The following are non-refundable once issued or used: (a) verified e-certificates
                already generated under your name; (b) bespoke 1:1 mentorship sessions that have
                already been delivered; (c) third-party study materials shipped to your address.
              </p>
            </Section>

            <Section heading="6. How to request a refund">
              <p>
                Email <strong>info@superaccountant.in</strong> from the email address used at
                checkout, with subject line &quot;Refund request — [Your Name] — [Cohort name]&quot;
                and a one-line reason. We will acknowledge within 1 business day and process the
                refund within 5–7 business days to the original payment method.
              </p>
              <p>
                Razorpay typically takes an additional 5–7 business days to settle the refund into
                your bank / card statement. Total turnaround is therefore approximately 7–14
                business days end-to-end.
              </p>
            </Section>

            <Section heading="7. Currency &amp; taxes">
              <p>
                Refunds are issued in the original currency of the payment. Any payment-gateway
                charges, currency-conversion fees, or GST already remitted to the government are
                non-refundable and are deducted from the refund amount where applicable by law.
              </p>
            </Section>

            <Section heading="8. Chargebacks">
              <p>
                If you initiate a chargeback or payment dispute without first contacting us, your
                access to the platform may be suspended pending resolution. Please email us first —
                we resolve almost everything within one business day.
              </p>
            </Section>

            <Section heading="9. Contact">
              <p>{t.contactPrompt}</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>Email: info@superaccountant.in</li>
                <li>Operator: Finacra Edutech</li>
                <li>Jurisdiction: India — disputes resolved under Indian law</li>
              </ul>
            </Section>
          </div>
        </BlurFade>

        <footer className="mt-16 border-t border-border pt-8 text-center text-xs text-fg-subtle">
          <p>
            <Link href={`/${locale}/cohort`} className="hover:text-fg">
              {t.backToCohort}
            </Link>
          </p>
          <p className="mt-2">
            <Link href={`/${locale}/terms`} className="hover:text-fg">
              Terms &amp; Conditions
            </Link>
            {' · '}
            <Link href={`/${locale}/refund-policy`} className="hover:text-fg">
              Refund Policy
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{heading}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}
