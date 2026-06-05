/**
 * Audience segment catalogue for the SEO/GEO blog writer agent.
 *
 * Three segments, each with:
 *   - displayName + description (used in writer system prompt)
 *   - topicSeeds[] — handed to Perplexity as research prompts. `{market}`
 *     and `{this_week}` are templated at call-time.
 *   - tonePrompt — voice anchor injected into the writer's system prompt
 *   - ctaTemplate — end-of-article CTA. Different per segment so we
 *     always send the reader to the highest-converting next step.
 *
 * Open/closed (CLAUDE.md §3.4): adding a fourth segment (e.g. "founders")
 * is one new entry here + one rotation rule. No dispatcher edits.
 */

import type { AudienceSegmentKey } from './types'

export type AudienceSegment = {
  key: AudienceSegmentKey
  displayName: string
  description: string
  topicSeeds: string[]
  tonePrompt: string
  ctaTemplate: string
}

/**
 * Catalogue. Exported as a const object so other modules can iterate
 * and TypeScript narrows the key type.
 */
export const AUDIENCE_SEGMENTS: Record<AudienceSegmentKey, AudienceSegment> = {
  students: {
    key: 'students',
    displayName: 'B.Com / M.Com / CA Inter students',
    description:
      'Undergraduate and CA Inter level students learning accounting fundamentals — currently studying or preparing for exams.',
    topicSeeds: [
      'What accounting concepts are B.Com students in {market} googling most this week ({this_week})?',
      'Trending CA Inter / CA Foundation exam topics in {market} this week ({this_week}) — what doubts are most repeated on Quora and student forums?',
      'Hottest "how to study" accounting questions from commerce students in {market} ({this_week})',
      'Which entry-level accounting concepts (depreciation, journal entries, BRS, trial balance) are trending in {market} student communities this week?',
      'Most-searched career questions from B.Com students in {market} ({this_week}) — "is CA worth it", "BCom vs CMA", etc.',
      'Top-of-funnel "basics of accounting" explainer keywords gaining volume in {market} ({this_week})',
      'New syllabus / paper-pattern questions from CA students in {market} this week ({this_week})',
      'Trending Tally / Excel / Zoho hands-on tutorials students in {market} are searching for ({this_week})',
      'What internship-related accounting questions are commerce students in {market} asking right now?',
      '"X explained simply" style demand from commerce students in {market} for the {this_week} window',
    ],
    tonePrompt: [
      'Write like a friendly senior who just cleared the same exams.',
      'Use plain English, short sentences, lots of worked mini-examples with real numbers.',
      'Acknowledge the reader is a student — show empathy for exam stress without being patronising.',
      'Avoid jargon stuffing. When you must use a technical term, define it in one line before continuing.',
      'Open with the practical "why does this matter" before the theory.',
    ].join(' '),
    ctaTemplate: [
      "If you're not sure where to start, take SuperAccountant's free 10-minute quiz at https://app.superaccountant.in/en/quiz —",
      'it places you at the exact phase of our curriculum that matches your current level, so you stop revising what you already know.',
    ].join(' '),
  },

  graduates: {
    key: 'graduates',
    displayName: 'Recent commerce graduates + job seekers',
    description:
      'Fresh B.Com / M.Com graduates and early-career job hunters looking to break into accounting, audit, or finance roles.',
    topicSeeds: [
      'Trending "first accounting job" questions from fresh commerce graduates in {market} ({this_week})',
      'Most-searched resume + interview prep topics for entry-level accountants in {market} this week ({this_week})',
      'Which Tally / Zoho Books / SAP hands-on tutorials are gaining traffic for job-seekers in {market} ({this_week})?',
      'Hottest career-roadmap searches from new commerce grads in {market} — CPA, ACCA, CMA pathway questions ({this_week})',
      'Salary + role expectations questions trending among fresh accounting candidates in {market} this week',
      '"Accounting jobs near me" longtails surging in {market} for the {this_week} window',
      'Articleship / internship hunt questions from CA students transitioning to industry in {market} ({this_week})',
      'Trending "skills to learn" for first accounting job topics in {market} this week ({this_week})',
      'Most-asked LinkedIn + recruiter etiquette questions from accounting freshers in {market} ({this_week})',
      'Which accounting software certifications are job-seekers in {market} searching for the most right now?',
    ],
    tonePrompt: [
      'Write like a placement-cell mentor who has seen 500 freshers get hired.',
      'Be brisk, action-oriented, and concrete — checklists, role-by-role salary bands, week-by-week prep plans.',
      'Use real company names where they\'re public (Big 4, KPMG, Deloitte, Lulu Group, STC, Tally Solutions) to ground the post in reality.',
      'Address anxieties (rejection, low-CTC offers, switching tracks) head-on without sugar-coating.',
    ].join(' '),
    ctaTemplate: [
      'Browse current openings curated for new accounting graduates at https://app.superaccountant.in/en/jobs —',
      'we list both India and KSA roles, with filters by location and required skills, so you can apply where you actually fit.',
    ].join(' '),
  },

  accountants: {
    key: 'accountants',
    displayName: 'Working accountants (1-5 years experience)',
    description:
      'Practising accountants, junior auditors, and tax professionals who need to stay ahead of regulatory changes and sharpen specialist skills.',
    topicSeeds: [
      'Latest GST notifications + circulars trending in {market} practitioner forums this week ({this_week})',
      'New TDS / TCS edge cases CAs in {market} are debating right now ({this_week})',
      'ZATCA e-invoicing Phase 2 changes + VAT compliance topics trending for KSA accountants this week ({this_week})',
      'Ind AS / IFRS implementation issues that mid-career accountants in {market} are searching this week',
      'Best-practice playbooks (month-end close, audit trail, payroll reconciliation) trending in {market} ({this_week})',
      'Hottest accounting software comparisons (Tally vs Zoho, Xero vs QuickBooks, Mu\'tamad ERPs) trending in {market} ({this_week})',
      'Recent regulatory rulings + case law in accounting / tax that {market} professionals are discussing this week',
      'CFO + controller-track skill-up topics trending among 3-5 year experienced accountants in {market} ({this_week})',
      'Trending audit / SOX / SOCPA technical topics in {market} for the {this_week} window',
      'Which automation + AI-for-accounting workflows are practitioners in {market} researching right now?',
    ],
    tonePrompt: [
      'Write like a senior manager briefing the team on a Monday morning — precise, no hedging, no fluff.',
      'Quote section numbers and rule citations (e.g. "Sec 16(2)(c) of CGST Act", "ZATCA Implementing Regulation Article 53") so readers can verify.',
      'Surface the practical consequence first ("this changes your reverse-charge workflow"), then the technical detail.',
      'Assume the reader knows the basics — do not redefine standard terms.',
      'Where a topic touches recent litigation or notifications, link to the official portal (cbic-gst.gov.in, zatca.gov.sa) rather than inventing citations.',
    ].join(' '),
    ctaTemplate: [
      'Sharpen your edge with SuperAccountant\'s next live cohort — small batches, real client workpapers, taught by partners. ',
      'Details and seats at https://app.superaccountant.in/en/cohort.',
    ].join(' '),
  },
}

/**
 * Convenience accessor that throws on miss — saves callers from
 * repeating the null-check pattern. Domain-pure, no side effects.
 */
export function getAudienceSegment(key: AudienceSegmentKey): AudienceSegment {
  const seg = AUDIENCE_SEGMENTS[key]
  if (!seg) throw new Error(`[content-marketing] unknown audience segment: ${key}`)
  return seg
}

/**
 * Materialise a topic seed against today's market + week. Pure helper
 * — accepting an explicit `weekLabel` keeps it deterministic so the
 * research-topics service stays test-friendly.
 */
export function fillTopicSeed(seed: string, market: string, weekLabel: string): string {
  return seed.replace(/\{market\}/g, market).replace(/\{this_week\}/g, weekLabel)
}
