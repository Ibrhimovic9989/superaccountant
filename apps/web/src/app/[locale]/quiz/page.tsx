import { QuizPlayer } from '@/components/quiz/quiz-player'
import { createMarketingLead } from '@/lib/data/leads'
import type { SupportedLocale } from '@sa/i18n'
import { headers } from 'next/headers'

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
    const hdrs = await headers()
    await createMarketingLead({
      name: args.name,
      email: args.email,
      phone: args.phone.length > 0 ? args.phone : null,
      source: '/quiz',
      quizSlug: 'accountant-dna',
      quizScore: args.score,
      quizBucket: args.bucketKey,
      quizAnswers: args.answers,
      locale,
      userAgent: hdrs.get('user-agent') ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto max-w-5xl">
        <QuizPlayer submitLead={submitLead} />
      </main>
    </div>
  )
}
