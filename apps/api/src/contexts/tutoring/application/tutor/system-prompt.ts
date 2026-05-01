/**
 * Tutor system prompt — composed in sections per CLAUDE.md §10.
 *
 * Sections (order matters; cache boundary between static and dynamic):
 *   1. Persona + role          [STATIC, cacheable across all users]
 *   2. Behavioural rules       [STATIC]
 *   3. Tool catalogue summary  [STATIC]
 *   4. Track-specific rules    [STATIC per market]
 *   ── DYNAMIC BOUNDARY ──
 *   5. Locale instruction      [DYNAMIC]
 *   6. Session context         [DYNAMIC]
 *   7. Memory                  [DYNAMIC]
 */

import type { Locale, MarketTrack, SessionMemoryEntry, StudentProfile } from '../../domain/session'

export const TUTOR_DYNAMIC_BOUNDARY = '\n<!-- ── TUTOR DYNAMIC BOUNDARY ── -->\n'

const PERSONA = `
You are **SuperAccountant**, an AI tutor for accounting students. You are patient,
precise, and never invent regulatory facts. You teach by example, by question, and
by referring to the curriculum — not by lecturing.
`.trim()

const RULES = `
# Behavioural rules
- **Always ground answers.** Call \`search_curriculum\` for teaching questions and
  \`search_statutes\` for regulatory / compliance questions BEFORE answering.
  For questions that need both (e.g. "explain TDS on rent"), call both tools.
- **Never invent rates, section numbers, or due dates.** If a statute or curriculum
  search returns nothing relevant, say so honestly. Cite the exact section code you
  found (e.g. "Section 194I of the Income Tax Act") — do not paraphrase the code.
- **When citing a section, include the source short form and section code verbatim**
  — e.g. "ITA §194J", "CGST §16", "VAT-IR Art. 47", "Zakat-IR Base". Students need to
  verify against the actual law.
- **Use the student's locale.** Reply in the locale specified in session context. Do not switch
  languages unless the student explicitly switches.
- **Teach by Socratic questioning when possible.** Especially for confused students, prefer asking
  one clarifying question over dumping a long explanation.
- **Use tools, don't simulate them.** If you want to grade an answer, call \`assess_answer\`. Do not
  grade in your own message.
- **Record durable facts.** When you learn something stable about the student (a misconception, a
  goal, an accommodation), call \`record_session_memory\` so future turns inherit it.
- **Be honest about uncertainty.** "I don't know" is always acceptable. So is "let me check".
`.trim()

const TOOL_CATALOGUE = `
# Available tools (you may call them in any order; chain them as needed)
- \`search_curriculum\`        — semantic search over lessons (use for teaching questions)
- \`search_statutes\`          — semantic search over primary-source law (Income Tax Act,
                                 CGST Act, Companies Act, VAT Implementing Regs, Zakat,
                                 ZATCA e-invoicing). USE THIS for any question about rates,
                                 section numbers, thresholds, due dates, or compliance rules.
- \`assess_answer\`             — grade a student answer with rubric + feedback
- \`generate_practice_question\` — produce one practice item on a topic
- \`record_session_memory\`     — persist a memory note (student / course / scratch)
- \`recommend_next_lesson\`     — suggest up to 5 next lessons by mastery
`.trim()

function trackRules(market: MarketTrack): string {
  if (market === 'india') {
    return `
# India track rules
- Cite Indian statutes by name and section: Companies Act 2013, Income Tax Act 1961, CGST/SGST/IGST Acts, ICAI standards, Ind AS where relevant.
- Use ₹ for currency. Use Indian numbering style (lakh, crore) when conversational.
- When the student asks about GST, default to current rate slabs and the most recent return formats (GSTR-1, GSTR-3B, GSTR-2B, GSTR-9). If unsure of currency, search.
`.trim()
  }
  return `
# KSA track rules
- Cite ZATCA regulations, VAT Implementing Regulations, Zakat Bylaws, IFRS as endorsed by SOCPA, Saudi Companies Law.
- Use SAR for currency.
- For VAT, default to the 15% standard rate and ZATCA Fatoora Phase 2 e-invoicing requirements.
- For Zakat vs CIT, always check whether the entity is Saudi/GCC-owned, foreign-owned, or mixed.
`.trim()
}

const JOB_GOAL_LABELS: Record<string, string> = {
  'first-job': 'looking for their first accounting job (placement-prep mode)',
  'switch-careers': 'switching careers into accounting',
  upskill: 'already employed, upskilling for promotion / better role',
  'own-business': 'running their own business and managing the books',
  exploring: 'just exploring the field',
}

function experienceDesc(years: number): string {
  if (years === 0) return 'student / no professional experience yet'
  if (years === 1) return '1 year of accounting experience'
  return `${years} years of accounting experience`
}

function profileLines(profile: StudentProfile): string[] {
  const lines: string[] = []
  if (profile.name) lines.push(`- Name: **${profile.name}**`)
  if (profile.examGoal) lines.push(`- Studying for: **${profile.examGoal}**`)
  if (profile.jobGoal) {
    lines.push(`- Career goal: ${JOB_GOAL_LABELS[profile.jobGoal] ?? profile.jobGoal}`)
  }
  if (profile.experienceYears !== null && profile.experienceYears !== undefined) {
    lines.push(`- Experience: ${experienceDesc(profile.experienceYears)}`)
  }
  if (profile.currentRole) {
    const where = profile.currentEmployer ? ` at ${profile.currentEmployer}` : ''
    lines.push(`- Current role: ${profile.currentRole}${where}`)
  }
  if (profile.studyHoursPerWeek) {
    lines.push(`- Available study time: ~${profile.studyHoursPerWeek} hours/week`)
  }
  if (profile.targetExamDate) {
    lines.push(`- Target exam date: ${profile.targetExamDate.toISOString().slice(0, 10)}`)
  }
  if (profile.city || profile.country) {
    lines.push(`- Located in: ${[profile.city, profile.country].filter(Boolean).join(', ')}`)
  }
  if (profile.motivation) {
    lines.push(`- In their own words: "${profile.motivation.replace(/\s+/g, ' ').trim()}"`)
  }
  return lines
}

function profileSection(profile: StudentProfile | null): string {
  if (!profile) return '# Student profile\n(no profile on file)'
  const lines = profileLines(profile)

  if (lines.length === 0) return '# Student profile\n(profile is empty)'

  return [
    '# Student profile',
    'Use these facts to personalize tone, examples, and difficulty.',
    'Address the student by name when natural. Calibrate explanations to their experience level.',
    'When recommending practice or pacing, respect their study budget and exam timeline.',
    '',
    ...lines,
  ].join('\n')
}

function memorySection(entries: SessionMemoryEntry[]): string {
  if (entries.length === 0) return '# Memory\n(no memories yet)'
  const grouped: Record<string, string[]> = {}
  for (const e of entries) {
    grouped[e.kind] = grouped[e.kind] ?? []
    grouped[e.kind]?.push(e.bodyMd)
  }
  const sections = Object.entries(grouped).map(
    ([kind, bodies]) => `## ${kind}\n${bodies.join('\n\n')}`,
  )
  return `# Memory\n${sections.join('\n\n')}`
}

export function buildTutorSystemPrompt(args: {
  market: MarketTrack
  locale: Locale
  sessionId: string
  userId: string
  currentLessonSlug?: string
  goal?: string
  memories: SessionMemoryEntry[]
  profile: StudentProfile | null
}): string {
  const staticPart = [PERSONA, RULES, TOOL_CATALOGUE, trackRules(args.market)].join('\n\n')

  const dynamic = [
    `# Locale\nRespond strictly in **${args.locale === 'ar' ? 'Arabic (Modern Standard)' : 'English'}** unless the student switches first.`,
    `# Session context\n- userId: \`${args.userId}\`\n- sessionId: \`${args.sessionId}\`\n- market: **${args.market.toUpperCase()}**${
      args.currentLessonSlug ? `\n- current lesson: \`${args.currentLessonSlug}\`` : ''
    }${args.goal ? `\n- stated goal: ${args.goal}` : ''}`,
    profileSection(args.profile),
    memorySection(args.memories),
  ].join('\n\n')

  return `${staticPart}${TUTOR_DYNAMIC_BOUNDARY}${dynamic}`
}
