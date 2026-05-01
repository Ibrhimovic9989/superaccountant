import { describe, expect, it } from 'vitest'
import type { SessionMemoryEntry, StudentProfile } from '../../domain/session'
import { TUTOR_DYNAMIC_BOUNDARY, buildTutorSystemPrompt } from './system-prompt'

/**
 * System prompt assembly is the heart of the tutor — it decides what the
 * model knows about the student on every turn. Lock down the contract:
 *
 *  1. Static prefix is identical across users (cache boundary correctness).
 *  2. Profile facts only appear after the boundary.
 *  3. Empty profile renders gracefully.
 *  4. Memory section groups entries by kind.
 *  5. Locale flips the language directive.
 */

const baseArgs = {
  market: 'india' as const,
  locale: 'en' as const,
  sessionId: 'sess_123',
  userId: 'user_abc',
  memories: [] as SessionMemoryEntry[],
  profile: null as StudentProfile | null,
}

describe('buildTutorSystemPrompt', () => {
  it('always includes the dynamic boundary marker', () => {
    const prompt = buildTutorSystemPrompt(baseArgs)
    expect(prompt).toContain(TUTOR_DYNAMIC_BOUNDARY)
  })

  it('keeps the static prefix identical for two different users', () => {
    const a = buildTutorSystemPrompt({ ...baseArgs, userId: 'user_a', sessionId: 'sess_a' })
    const b = buildTutorSystemPrompt({ ...baseArgs, userId: 'user_b', sessionId: 'sess_b' })

    const staticA = a.split(TUTOR_DYNAMIC_BOUNDARY)[0]
    const staticB = b.split(TUTOR_DYNAMIC_BOUNDARY)[0]

    expect(staticA).toBe(staticB)
  })

  it('emits track-specific rules for India vs KSA', () => {
    const india = buildTutorSystemPrompt({ ...baseArgs, market: 'india' })
    const ksa = buildTutorSystemPrompt({ ...baseArgs, market: 'ksa' })

    expect(india).toContain('# India track rules')
    expect(india).toMatch(/Companies Act 2013/)
    expect(india).toContain('₹')

    expect(ksa).toContain('# KSA track rules')
    expect(ksa).toMatch(/ZATCA/)
    expect(ksa).toContain('SAR')
  })

  it('flips the locale instruction for AR sessions', () => {
    const en = buildTutorSystemPrompt({ ...baseArgs, locale: 'en' })
    const ar = buildTutorSystemPrompt({ ...baseArgs, locale: 'ar' })

    expect(en).toMatch(/Respond strictly in \*\*English\*\*/)
    expect(ar).toMatch(/Respond strictly in \*\*Arabic/)
  })

  it('renders a graceful placeholder when no profile is on file', () => {
    const prompt = buildTutorSystemPrompt({ ...baseArgs, profile: null })
    expect(prompt).toContain('# Student profile')
    expect(prompt).toContain('(no profile on file)')
  })

  it('formats profile facts after the dynamic boundary', () => {
    const profile: StudentProfile = {
      name: 'Aisha Al-Rashid',
      examGoal: 'SOCPA',
      jobGoal: 'upskill',
      experienceYears: 3,
      currentRole: 'Audit associate',
      currentEmployer: 'Big4 KSA',
      studyHoursPerWeek: 10,
      targetExamDate: new Date('2026-12-15T00:00:00Z'),
      motivation: 'I want to qualify before our second child arrives.',
      country: 'Saudi Arabia',
      city: 'Riyadh',
    }

    const prompt = buildTutorSystemPrompt({ ...baseArgs, profile })
    const dynamic = prompt.split(TUTOR_DYNAMIC_BOUNDARY)[1] ?? ''

    expect(dynamic).toContain('# Student profile')
    expect(dynamic).toContain('Aisha Al-Rashid')
    expect(dynamic).toContain('SOCPA')
    expect(dynamic).toContain('3 years of accounting experience')
    expect(dynamic).toContain('Audit associate')
    expect(dynamic).toContain('Big4 KSA')
    expect(dynamic).toContain('10 hours/week')
    expect(dynamic).toContain('2026-12-15')
    expect(dynamic).toContain('Riyadh, Saudi Arabia')
    expect(dynamic).toContain('"I want to qualify')

    // None of these should leak into the static prefix.
    const staticPart = prompt.split(TUTOR_DYNAMIC_BOUNDARY)[0] ?? ''
    expect(staticPart).not.toContain('Aisha')
    expect(staticPart).not.toContain('SOCPA')
  })

  it('uses singular phrasing for 1 year of experience', () => {
    const profile: StudentProfile = {
      name: null,
      examGoal: null,
      jobGoal: null,
      experienceYears: 1,
      currentRole: null,
      currentEmployer: null,
      studyHoursPerWeek: null,
      targetExamDate: null,
      motivation: null,
      country: null,
      city: null,
    }
    const prompt = buildTutorSystemPrompt({ ...baseArgs, profile })
    expect(prompt).toContain('1 year of accounting experience')
  })

  it('uses student phrasing for 0 years of experience', () => {
    const profile: StudentProfile = {
      name: 'Test',
      examGoal: null,
      jobGoal: null,
      experienceYears: 0,
      currentRole: null,
      currentEmployer: null,
      studyHoursPerWeek: null,
      targetExamDate: null,
      motivation: null,
      country: null,
      city: null,
    }
    const prompt = buildTutorSystemPrompt({ ...baseArgs, profile })
    expect(prompt).toContain('student / no professional experience')
  })

  it('groups memory entries by kind', () => {
    const memories: SessionMemoryEntry[] = [
      {
        id: 'm1',
        sessionId: 'sess_123',
        kind: 'student',
        bodyMd: 'Strong on GST, weak on TDS.',
        updatedAt: new Date(),
      },
      {
        id: 'm2',
        sessionId: 'sess_123',
        kind: 'student',
        bodyMd: 'Prefers worked examples.',
        updatedAt: new Date(),
      },
      {
        id: 'm3',
        sessionId: 'sess_123',
        kind: 'course',
        bodyMd: 'Currently in Phase 2.',
        updatedAt: new Date(),
      },
    ]

    const prompt = buildTutorSystemPrompt({ ...baseArgs, memories })
    expect(prompt).toContain('# Memory')
    expect(prompt).toContain('## student')
    expect(prompt).toContain('## course')
    expect(prompt).toContain('Strong on GST')
    expect(prompt).toContain('Prefers worked examples')
    expect(prompt).toContain('Currently in Phase 2')
  })

  it('shows "no memories yet" placeholder when memory list is empty', () => {
    const prompt = buildTutorSystemPrompt({ ...baseArgs, memories: [] })
    expect(prompt).toContain('# Memory')
    expect(prompt).toContain('(no memories yet)')
  })
})
