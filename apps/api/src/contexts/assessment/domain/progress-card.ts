/**
 * Pure helpers for the progress-card email pipeline.
 *
 * No I/O — these run against in-memory question/answer/lesson data so
 * they can be unit-tested without Prisma or Resend. The application
 * layer wires them to the real attempt + lesson rows.
 *
 * Per CLAUDE.md §7.4: domain helpers are pure, no framework imports.
 */

export type WronglyAnswered = {
  /** Topic label as it appears on the question (or lesson title for daily). */
  topic: string
}

/**
 * Counts wrong-answer topics and returns the top N by frequency (ties
 * broken by first-seen order). Defaults to 5 — matches the email
 * template's chip cap.
 */
export function topWeakTopics(
  wrong: WronglyAnswered[],
  limit = 5,
): string[] {
  const counts = new Map<string, { count: number; firstSeen: number }>()
  for (let i = 0; i < wrong.length; i++) {
    const t = (wrong[i]?.topic ?? '').trim()
    if (!t) continue
    const prev = counts.get(t)
    if (prev) {
      prev.count++
    } else {
      counts.set(t, { count: 1, firstSeen: i })
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count || a[1].firstSeen - b[1].firstSeen)
    .slice(0, limit)
    .map(([t]) => t)
}

export type LessonForRedo = {
  slug: string
  titleEn: string
  titleAr: string | null
  /** Module title — used as a coarse topic match when the lesson title
   *  doesn't carry the topic name directly. */
  moduleTitleEn?: string
  moduleTitleAr?: string | null
}

/**
 * Picks at most `limit` lessons to suggest as "redo this" links — one
 * lesson per weak topic, scored by case-insensitive substring overlap
 * between the topic and the lesson title (or module title).
 *
 * Returns empty when nothing matches. Caller is expected to ship the
 * email without redo links in that case — they're a nice-to-have.
 */
export function pickRedoLessons(args: {
  weakTopics: string[]
  lessons: LessonForRedo[]
  baseUrl: string
  locale: 'en' | 'ar'
  limit?: number
}): { title: string; url: string }[] {
  const limit = args.limit ?? 3
  const used = new Set<string>()
  const picks: { title: string; url: string }[] = []
  for (const topic of args.weakTopics) {
    if (picks.length >= limit) break
    const t = topic.toLowerCase().trim()
    if (!t) continue
    let best: { lesson: LessonForRedo; score: number } | null = null
    for (const l of args.lessons) {
      if (used.has(l.slug)) continue
      const score = matchScore(t, l, args.locale)
      if (score > 0 && (!best || score > best.score)) best = { lesson: l, score }
    }
    if (best) {
      used.add(best.lesson.slug)
      const title =
        args.locale === 'ar' ? best.lesson.titleAr ?? best.lesson.titleEn : best.lesson.titleEn
      picks.push({
        title,
        url: joinUrl(args.baseUrl, `/lessons/${best.lesson.slug}`),
      })
    }
  }
  return picks
}

function matchScore(topicLower: string, l: LessonForRedo, _locale: 'en' | 'ar'): number {
  // Topics come from the question pool — always English-leaning today
  // (the entry-test pool stores en topics regardless of session locale).
  // Match against the EN title + AR title in parallel so we still find
  // a hit when the student is on the AR track. The display title picks
  // the locale-correct one separately.
  const titleEn = (l.titleEn ?? '').toLowerCase()
  const titleAr = (l.titleAr ?? '').toLowerCase()
  const modEn = (l.moduleTitleEn ?? '').toLowerCase()
  const modAr = (l.moduleTitleAr ?? '').toLowerCase()
  // Exact substring anywhere → 3 (title) or 2 (module).
  if ((titleEn && titleEn.includes(topicLower)) || (titleAr && titleAr.includes(topicLower))) {
    return 3
  }
  if ((modEn && modEn.includes(topicLower)) || (modAr && modAr.includes(topicLower))) {
    return 2
  }
  // Token overlap fallback — useful for multi-word topics.
  const tokens = topicLower.split(/\s+/).filter((t) => t.length >= 3)
  if (tokens.length === 0) return 0
  const hit = tokens.some(
    (tok) =>
      titleEn.includes(tok) || titleAr.includes(tok) || modEn.includes(tok) || modAr.includes(tok),
  )
  return hit ? 1 : 0
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}
