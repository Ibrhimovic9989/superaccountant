import { Logo } from '@/components/brand/logo'
import { BlurFade } from '@/components/magicui/blur-fade'
import type { SupportedLocale } from '@sa/i18n'
import Link from 'next/link'

/**
 * Public Terms & Conditions. Linked from the footer and required by
 * Razorpay for KYC. Plain-English; covers enrolment, conduct, IP,
 * liability, jurisdiction.
 */

export const metadata = {
  title: 'Terms & Conditions · Superaccountant',
  description:
    'Terms and conditions governing use of the Superaccountant platform, cohort enrolments, certificates, and AI tutor.',
}

const COPY = {
  en: {
    title: 'Terms & Conditions',
    lastUpdated: 'Last updated: 13 May 2026',
    backToCohort: '← Back to cohort details',
  },
  ar: {
    title: 'الشروط والأحكام',
    lastUpdated: 'آخر تحديث: ١٣ مايو ٢٠٢٦',
    backToCohort: '← العودة إلى تفاصيل الكوهورت',
  },
} as const

export default async function TermsPage({
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
            <Section heading="1. Acceptance">
              <p>
                These Terms govern your use of the website at <strong>superaccountant.in</strong>{' '}
                and any Superaccountant cohort, AI tutor, e-certificate, or other service (the
                &quot;Platform&quot;) operated by <strong>Finacra Edutech</strong> (the
                &quot;Company&quot;, &quot;we&quot;). By creating an account, enrolling in a cohort,
                or making a payment, you agree to be bound by these Terms and the Refund &amp;
                Cancellation Policy.
              </p>
            </Section>

            <Section heading="2. Eligibility">
              <p>
                You must be at least 18 years old, or 16+ with verifiable parental consent. You
                represent that the information you provide at sign-up and checkout is accurate and
                belongs to you.
              </p>
            </Section>

            <Section heading="3. Cohort enrolment">
              <p>
                Enrolment in a cohort is confirmed only after successful payment via our payment
                processor (Razorpay) and receipt of your enrolment-confirmation email. Seat counts
                are limited; we reserve the right to close enrolment without notice when the cohort
                fills.
              </p>
              <p>
                You agree to attend classes in good faith, observe the cohort code of conduct, and
                refrain from disrupting other students or instructors. We may suspend or terminate
                access for serious or repeated violations with no refund.
              </p>
            </Section>

            <Section heading="4. Fees, refunds, taxes">
              <p>
                The cohort fee shown at checkout is inclusive of all applicable taxes for the
                jurisdiction listed at checkout. Refund eligibility is governed by our{' '}
                <Link href={`/${locale}/refund-policy`} className="text-accent hover:underline">
                  Refund &amp; Cancellation Policy
                </Link>
                . Payment-gateway charges already paid to Razorpay are not refundable.
              </p>
            </Section>

            <Section heading="5. AI tutor — disclaimer">
              <p>
                The Superaccountant AI tutor is a tool that generates explanations and practice
                content based on large language models. <strong>It can make mistakes.</strong>{' '}
                Nothing produced by the AI tutor constitutes professional accounting, tax, legal, or
                financial advice. Always verify before acting in a professional context.
              </p>
              <p>
                Statutory references (Income Tax Act 1961, CGST Act 2017, ZATCA regulations, IFRS,
                etc.) shown in lessons are accurate to the best of our knowledge at the date of
                publishing but may change. The Student is responsible for staying current.
              </p>
            </Section>

            <Section heading="6. Certificates">
              <p>
                E-certificates issued through Superaccountant are signed and verifiable at a public
                URL controlled by us. A certificate confirms completion of a specific cohort or
                course — it does not constitute a statutory accounting qualification (such as CA,
                CMA, or CPA) and must not be presented as such.
              </p>
              <p>
                We may revoke certificates obtained by fraud, plagiarism, or material breach of
                these Terms.
              </p>
            </Section>

            <Section heading="7. Intellectual property">
              <p>
                All content on the Platform — lesson text, audio, video, problem banks, prompts,
                source code, brand assets — is owned by the Company or its licensors. You receive a
                non-transferable, non-sublicensable, revocable licence to use the content personally
                for the duration of your enrolment, plus 12 months for review.
              </p>
              <p>
                You may not redistribute, scrape, train machine-learning models on, or otherwise
                reproduce our content without express written consent.
              </p>
            </Section>

            <Section heading="8. User content">
              <p>
                When you submit answers, code, comments, or other content on the Platform, you grant
                the Company a worldwide, royalty-free licence to host, display, and use that content
                to operate and improve the Platform (including anonymised training of grading and
                tutoring models). You retain ownership of your content.
              </p>
            </Section>

            <Section heading="9. Acceptable use">
              <p>You agree not to:</p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>share your account credentials or transfer your seat to another person;</li>
                <li>
                  scrape, mirror, or systematically download lesson content, problem banks, or
                  prompts;
                </li>
                <li>
                  attempt to bypass the AI tutor&apos;s safety filters, prompt-injection
                  protections, or access controls;
                </li>
                <li>
                  use the Platform to generate fraudulent invoices, certificates, or other documents
                  intended to deceive third parties;
                </li>
                <li>upload viruses, malware, or any code intended to compromise the Platform.</li>
              </ul>
            </Section>

            <Section heading="10. Privacy">
              <p>
                We collect only the data needed to operate the Platform — name, email, phone, track
                preference, payment metadata, learning progress. We do not sell your data. See our
                Privacy notice for details (email <strong>info@superaccountant.in</strong> for the
                current version).
              </p>
            </Section>

            <Section heading="11. Limitation of liability">
              <p>
                To the maximum extent permitted by law, the Company&apos;s total liability for any
                claim arising out of or relating to the Platform is limited to the amount actually
                paid by you for the relevant cohort in the 12 months preceding the claim. We
                disclaim all implied warranties of merchantability or fitness for a particular
                purpose. The Platform is provided &quot;as is&quot;.
              </p>
            </Section>

            <Section heading="12. Termination">
              <p>
                We may suspend or terminate your access for breach of these Terms, fraud, chargeback
                abuse, or violation of acceptable use. You may close your account at any time by
                emailing us; closure does not entitle you to a refund outside the Refund Policy.
              </p>
            </Section>

            <Section heading="13. Governing law">
              <p>
                These Terms are governed by the laws of India. Any dispute is subject to the
                exclusive jurisdiction of the courts at <strong>Mumbai, Maharashtra</strong>. For
                Saudi Mu&apos;tamad cohort students residing in KSA, you additionally consent to
                cooperate via the Saudi Centre for Commercial Arbitration where the dispute relates
                solely to a KSA cohort.
              </p>
            </Section>

            <Section heading="14. Changes">
              <p>
                We may update these Terms from time to time. Material changes are communicated via
                email to your registered address at least 14 days before they take effect. Continued
                use of the Platform after the effective date constitutes acceptance.
              </p>
            </Section>

            <Section heading="15. Contact">
              <p>
                Email: <strong>info@superaccountant.in</strong>
                <br />
                Operator: <strong>Finacra Edutech</strong>
                <br />
                Website: <strong>superaccountant.in</strong>
              </p>
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
