import { Logo } from '@/components/brand/logo'
import { QuizPlayer } from '@/components/quiz/quiz-player'
import { createMarketingLead } from '@/lib/data/leads'
import { QUIZ_BUCKETS, QUIZ_MAX_SCORE } from '@/lib/data/quiz'
import { buildEligibilityPassedEmail, sendEmail } from '@sa/email'
import type { SupportedLocale } from '@sa/i18n'
import { headers } from 'next/headers'
import Link from 'next/link'

/**
 * Public marketing page — no auth gate. Lead-gen funnel into the cohort.
 *
 * Flow: intro → 10 questions → name+email capture → result + CTA.
 * Lead persisted to MarketingLead table the moment the user submits the
 * capture form (before they see their result), so we don't lose the
 * lead if they bounce on the result screen.
 */
export default async function QuizPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params

  async function submitLead(args: {
    name: string
    email: string
    phone: string
    score: number
    bucketKey: string
    answers: Record<string, string>
  }) {
    'use server'
    // Server-side guard — never trust the client. If any of the three
    // required fields is missing or malformed, refuse to persist and
    // bubble the error back to the UI.
    const name = args.name?.trim() ?? ''
    const email = args.email?.trim().toLowerCase() ?? ''
    const phone = args.phone?.trim() ?? ''
    if (name.length < 2) throw new Error('Name is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required')
    if (phone.replace(/\D/g, '').length < 7) throw new Error('Valid phone is required')

    const hdrs = await headers()
    await createMarketingLead({
      name,
      email,
      phone,
      source: '/quiz',
      quizSlug: 'accountant-dna',
      quizScore: args.score,
      quizBucket: args.bucketKey,
      quizAnswers: args.answers,
      locale,
      userAgent: hdrs.get('user-agent') ?? null,
    })

    // Fire-and-forget eligibility email. Resend failures must NOT break
    // the user-facing flow — the lead is already persisted and we'll
    // retry via a background job if delivery fails.
    const bucket = QUIZ_BUCKETS.find((b) => b.key === args.bucketKey)
    if (bucket) {
      const appBaseUrl = (process.env.NEXTAUTH_URL ?? 'https://app.superaccountant.in').replace(
        /\/$/,
        '',
      )
      const { subject, html, text } = buildEligibilityPassedEmail({
        recipientName: name,
        score: args.score,
        maxScore: QUIZ_MAX_SCORE,
        bucketTitle: bucket.title,
        bucketEmoji: bucket.emoji,
        bucketHeadline: bucket.headline,
        cohortUrl: `${appBaseUrl}/${locale}/cohort#apply`,
      })
      sendEmail({ to: email, subject, html, text }).catch((err) => {
        console.error('[quiz] eligibility email failed', err)
      })
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
        <Link href={`/${locale}/cohort`} className="inline-flex items-center gap-2.5">
          <Logo size="sm" />
        </Link>
      </header>
      <main className="mx-auto max-w-5xl">
        <QuizPlayer submitLead={submitLead} />
      </main>
    </div>
  )
}
