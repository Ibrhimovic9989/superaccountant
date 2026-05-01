/**
 * Shared types for the interactive smart-setup guides.
 *
 * Step routing model:
 *   - Each step has a unique `id` (string).
 *   - A step's `next` is either the id of the step to jump to next,
 *     or null to end the guide.
 *   - A step with a `check` becomes a fork: each option's `next` wins.
 *   - Otherwise, "Continue" advances to step.next.
 *   - Steps with no check and no next + `terminal: true` are success
 *     screens.
 *   - Steps without a `label` are treated as troubleshooting branches
 *     and don't count toward happy-path progress.
 */

export type GuideStep = {
  id: string
  /** Optional short label for the step list (e.g. "Install Tally"). */
  label?: string
  title: string
  /** Markdown body. Multi-paragraph supported. */
  body: string
  /** Optional inline screenshot (public path or full URL). */
  image?: string
  /**
   * Optional video reference. Renders as a "watch on YouTube" launcher
   * (opens in new tab) — never embedded, so uploader embed restrictions
   * can't break the UI. If `youtubeId` is given we link straight to the
   * watch page; otherwise we search YouTube for `caption`.
   */
  video?: { youtubeId?: string; caption?: string }
  /** Optional callout above the action area. */
  callout?: { kind: 'tip' | 'warning' | 'success'; text: string }
  /** Branching question. If present, replaces the default Continue button. */
  check?: {
    question: string
    options: { label: string; next: string | null }[]
  }
  /** Default next step id when there's no check. null = end of guide. */
  next?: string | null
  terminal?: boolean
}

export type Guide = {
  slug: string
  title: string
  subtitle: string
  hook: string
  /** Filter by market — 'india' | 'ksa' | 'both'. */
  market: 'india' | 'ksa' | 'both'
  /** Software / product family this guide belongs to (for grouping). */
  family: 'tally-prime' | 'zoho-books' | 'quickbooks-online' | 'other'
  estimatedMinutes: number
  emoji: string
  color: 'accent' | 'success' | 'warning' | 'danger'
  prerequisites?: string[]
  outcomes: string[]
  startStepId: string
  steps: GuideStep[]
}
