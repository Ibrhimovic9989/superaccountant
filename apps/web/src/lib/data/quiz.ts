/**
 * "The Accountant DNA Quiz" — top-of-funnel lead-gen quiz on /quiz.
 *
 * Ten light, real-world questions that reveal accounting aptitude without
 * feeling like a test. Every result bucket is framed positively — our
 * target audience (graduates, career switchers, small-business owners)
 * is one of the most neglected and dismissed; the quiz must make them
 * feel seen and capable, not graded.
 *
 * Scoring: each option has weight 1–4. Total range 10–40.
 *
 * Buckets:
 *   30–40 → Born Accountant       (≈75%+)
 *   22–29 → Accountant Material   (≈55–72%)
 *   16–21 → Trainable Talent      (≈40–52%)
 *   10–15 → Hidden Aptitude       (≤37%)
 */

export type QuizOption = {
  /** Stable id for analytics + answer storage. */
  id: string
  /** Display label. */
  label: string
  /** Weight 1–4. Higher = more aligned with accounting aptitude. */
  weight: 1 | 2 | 3 | 4
}

export type QuizQuestion = {
  id: string
  /** What we're really measuring (internal — not shown). */
  trait: string
  prompt: string
  options: QuizOption[]
}

export type QuizBucket = {
  /** Inclusive lower bound (in points). */
  min: number
  key: 'born' | 'material' | 'trainable' | 'hidden'
  title: string
  badge: string
  emoji: string
  /** 1–2 sentence headline shown big on the result screen. */
  headline: string
  /** Longer affirming paragraph. */
  body: string
  /** Three concrete strengths to call out. */
  strengths: string[]
  /** Next-step phrase used on the CTA button. */
  ctaLine: string
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'restaurant-bill',
    trait: 'attention-to-detail',
    prompt: 'You get a restaurant bill at dinner. What do you usually do?',
    options: [
      { id: 'check-every-line', label: 'Quietly check every line', weight: 4 },
      { id: 'glance-total', label: 'Glance at the total and pay', weight: 2 },
      { id: 'just-pay', label: 'Just pay — life is too short', weight: 1 },
      { id: 'depends', label: 'Depends on the bill size', weight: 3 },
    ],
  },
  {
    id: 'spreadsheet',
    trait: 'comfort-with-data',
    prompt: 'A spreadsheet with 200 rows lands in your inbox. First reaction?',
    options: [
      { id: 'exciting', label: "Cool — let's see what's in here", weight: 4 },
      { id: 'sort-filter', label: 'I’ll sort + filter to make sense of it', weight: 3 },
      { id: 'find-summary', label: 'I’ll just look for the totals', weight: 2 },
      { id: 'overwhelmed', label: 'Close it. Too much.', weight: 1 },
    ],
  },
  {
    id: 'change-mistake',
    trait: 'precision-with-money',
    prompt: 'You buy something for ₹47. You hand the shopkeeper ₹50 but get back ₹4. You…',
    options: [
      { id: 'speak-up', label: 'Politely speak up — I’m owed ₹3, not ₹4', weight: 4 },
      { id: 'take-extra', label: 'Take the extra ₹1 quietly', weight: 1 },
      { id: 'mention-tip', label: 'Mention it and let them keep the rupee', weight: 3 },
      { id: 'didnt-notice', label: 'Probably wouldn’t notice', weight: 2 },
    ],
  },
  {
    id: 'fudge-invoice',
    trait: 'ethics',
    prompt: 'A friend asks you to "adjust" an invoice number to save them a bit of tax. You…',
    options: [
      { id: 'no-way', label: 'Politely decline — that’s a line I won’t cross', weight: 4 },
      { id: 'explain-risk', label: 'Refuse and explain the legal risk', weight: 4 },
      { id: 'only-once', label: 'Just this once, for a close friend', weight: 1 },
      { id: 'not-my-job', label: 'Tell them to ask their CA', weight: 3 },
    ],
  },
  {
    id: 'small-mistake',
    trait: 'quality-mindset',
    prompt: 'You spot a small mistake in work you’ve already submitted. You…',
    options: [
      { id: 'flag-fix', label: 'Flag it and send a fix immediately', weight: 4 },
      { id: 'fix-quietly', label: 'Fix it silently in the next version', weight: 3 },
      { id: 'wait-noticed', label: 'Wait — maybe nobody notices', weight: 1 },
      { id: 'depends', label: 'Depends on how visible it is', weight: 2 },
    ],
  },
  {
    id: 'follow-process',
    trait: 'rule-following',
    prompt: 'Someone hands you a 7-step process to follow exactly. How does that feel?',
    options: [
      { id: 'reassuring', label: 'Reassuring — I know what to do', weight: 4 },
      { id: 'manageable', label: 'Manageable, I’ll just follow it', weight: 3 },
      { id: 'shortcut', label: 'I’ll find a shortcut by step 3', weight: 2 },
      { id: 'restrictive', label: 'Restrictive — I’d rather improvise', weight: 1 },
    ],
  },
  {
    id: 'mental-math',
    trait: 'comfort-with-numbers',
    prompt: 'Someone says "₹2,400 split four ways, plus 18% tax on each." You…',
    options: [
      { id: 'solve-head', label: 'Have an answer in my head in 5 seconds', weight: 4 },
      { id: 'paper-quick', label: 'Grab a piece of paper, takes 30 seconds', weight: 3 },
      { id: 'calculator', label: 'Open the calculator app', weight: 2 },
      { id: 'someone-else', label: 'Let someone else do it', weight: 1 },
    ],
  },
  {
    id: 'tax-document',
    trait: 'curiosity',
    prompt: 'You get a tax document you don’t fully understand. You…',
    options: [
      { id: 'read-deep', label: 'Read it slowly and look things up', weight: 4 },
      { id: 'ask-help', label: 'Ask someone who knows', weight: 3 },
      { id: 'skim', label: 'Skim it and hope for the best', weight: 2 },
      { id: 'ignore', label: 'File it away to deal with later', weight: 1 },
    ],
  },
  {
    id: 'long-boring-task',
    trait: 'discipline',
    prompt: 'You’re given a long, slightly boring but important task with a deadline. You…',
    options: [
      { id: 'plan-chunks', label: 'Plan it in chunks and start today', weight: 4 },
      { id: 'steady-pace', label: 'Work on it a bit each day', weight: 3 },
      { id: 'last-minute', label: 'Wait, then power through near the end', weight: 2 },
      { id: 'avoid', label: 'Procrastinate until I can’t anymore', weight: 1 },
    ],
  },
  {
    id: 'monthly-budget',
    trait: 'planning',
    prompt: 'Your monthly spending is…',
    options: [
      { id: 'tracked', label: 'Tracked — I know roughly where every rupee goes', weight: 4 },
      { id: 'sense', label: 'I have a rough sense of it', weight: 3 },
      { id: 'check-end', label: 'I check my bank balance at month-end', weight: 2 },
      { id: 'no-clue', label: 'Honestly, I have no clue', weight: 1 },
    ],
  },
]

export const QUIZ_BUCKETS: QuizBucket[] = [
  {
    min: 30,
    key: 'born',
    title: 'Born Accountant',
    badge: 'Top 5% match',
    emoji: '🌟',
    headline: "You're already wired for this.",
    body: "Most people see a spreadsheet and feel tired — you see a puzzle worth solving. The instincts that make a great accountant (attention to detail, honesty under pressure, comfort with rules, calm with numbers) are already in you. What's missing is just the technical layer — Tally, GST, TDS, the workflow. That's learnable in 45 days.",
    strengths: [
      'You catch what others miss — the ₹3 mistake, the wrong invoice number',
      'You stay calm with data + rules — most people freeze, you focus',
      "Your ethics aren't negotiable, even when the pressure’s on",
    ],
    ctaLine: 'You’re ready. Join the next cohort.',
  },
  {
    min: 22,
    key: 'material',
    title: 'Accountant Material',
    badge: 'Strong potential',
    emoji: '💎',
    headline: 'Your instincts are strong. The skills are next.',
    body: 'Some of accounting comes naturally to you — you’re detail-aware, comfortable with numbers, and you treat money seriously. The few areas where you scored lower are exactly what good training fixes: process discipline, audit-grade rigor, the actual tools. You’re the kind of student who walks out of our cohort with a job — because the foundation is already there.',
    strengths: [
      'You take money seriously — that’s half the battle won',
      'You’re comfortable with numbers and patterns',
      'You’re willing to learn the process rather than fight it',
    ],
    ctaLine: 'You’re closer than you think. Start the cohort.',
  },
  {
    min: 16,
    key: 'trainable',
    title: 'Trainable Talent',
    badge: 'Big upside',
    emoji: '🚀',
    headline: 'You have what matters most — willingness.',
    body: 'Accounting isn’t about being born "good with numbers" — it’s about showing up, following process, and caring about the truth. You have the most important ingredient: you’re here, taking a quiz, thinking seriously about a career. The technical confidence comes from practice. 45 days of guided practice with real instructors + AI tutoring closes the gap fast.',
    strengths: [
      'You’re willing to learn — most people aren’t',
      'You take action — quizzes, applications, reading job descriptions',
      'You’re honest with yourself — that’s the rarest accounting trait',
    ],
    ctaLine: 'This is exactly the right place to start.',
  },
  {
    min: 10,
    key: 'hidden',
    title: 'Hidden Aptitude',
    badge: 'Underestimated',
    emoji: '🌱',
    headline: 'Skills are learnable. You showed up — that’s rare.',
    body: 'Here’s the truth nobody tells you: most working accountants didn’t score high on a quiz like this when they started. They learned the precision, the patience, the rules — all of it — in their first year on the job. What got them there was the same thing that got you to this page: curiosity and the willingness to try. That’s the only non-learnable trait in this field, and you have it.',
    strengths: [
      'You’re curious enough to take a quiz about your career',
      'You’re open about what you don’t know yet',
      'You’re looking for change — most people just complain about their situation',
    ],
    ctaLine: 'Start with the basics. We’ll teach you everything.',
  },
]

/** Best total achievable = 40 (10 questions × max weight 4). */
export const QUIZ_MAX_SCORE = 40

export function scoreAnswers(answers: Record<string, string>): {
  score: number
  bucket: QuizBucket
} {
  let score = 0
  for (const q of QUIZ_QUESTIONS) {
    const chosenId = answers[q.id]
    if (!chosenId) continue
    const option = q.options.find((o) => o.id === chosenId)
    if (option) score += option.weight
  }
  // Walk buckets from highest min down; first one we’re ≥ is ours.
  const sorted = [...QUIZ_BUCKETS].sort((a, b) => b.min - a.min)
  const bucket = sorted.find((b) => score >= b.min) ?? sorted[sorted.length - 1]
  return { score, bucket: bucket as QuizBucket }
}
