import { describe, expect, it } from 'vitest'
import { buildProgressCardEmail } from '@sa/email'

/**
 * Snapshot-lite: exercise the template across the 3 assessment kinds
 * and confirm subject / score / dashboard URL / recipient name are all
 * interpolated. The HTML body is verified by `toContain` rather than a
 * full snapshot — palette / spacing tweaks shouldn't break the test.
 */
describe('buildProgressCardEmail', () => {
  it('entry-test subject mentions placement + phase', () => {
    const m = buildProgressCardEmail({
      recipientName: 'Aarav Sharma',
      recipientEmail: 'aarav@example.com',
      assessmentKind: 'entry-test',
      scorePct: 72,
      totalQuestions: 10,
      correctCount: 7,
      weakTopics: ['GST', 'TDS'],
      dashboardUrl: 'https://app.example.com/en/learn',
      locale: 'en',
    })
    expect(m.subject).toMatch(/placement test/i)
    expect(m.subject).toMatch(/Phase 3/)
    expect(m.html).toContain('Aarav')
    expect(m.html).toContain('7/10')
    expect(m.html).toContain('72%')
    expect(m.html).toContain('GST')
    expect(m.html).toContain('https://app.example.com/en/learn')
    expect(m.text).toContain('Aarav')
  })

  it('daily-assignment subject mentions correct/total', () => {
    const m = buildProgressCardEmail({
      recipientName: 'Priya',
      recipientEmail: 'p@example.com',
      assessmentKind: 'daily-assignment',
      scorePct: 50,
      totalQuestions: 6,
      correctCount: 3,
      weakTopics: ['Bank Reconciliation'],
      redoLinks: [
        { title: 'Bank Reconciliation Basics', url: 'https://app.example.com/en/lessons/bank-rec' },
      ],
      dashboardUrl: 'https://app.example.com/en/learn',
      locale: 'en',
    })
    expect(m.subject).toBe("Today's progress · 3/6 correct")
    expect(m.html).toContain('Bank Reconciliation')
    expect(m.html).toContain('https://app.example.com/en/lessons/bank-rec')
  })

  it('grand-test passed gets celebratory subject', () => {
    const m = buildProgressCardEmail({
      recipientName: 'Mohammed',
      recipientEmail: 'm@example.com',
      assessmentKind: 'grand-test',
      passed: true,
      scorePct: 80,
      totalQuestions: 30,
      correctCount: 24,
      weakTopics: [],
      dashboardUrl: 'https://app.example.com/en/learn',
      locale: 'en',
    })
    expect(m.subject).toMatch(/passed/i)
    expect(m.html).toContain('24/30')
  })

  it('grand-test failed states the score', () => {
    const m = buildProgressCardEmail({
      recipientName: 'Mohammed',
      recipientEmail: 'm@example.com',
      assessmentKind: 'grand-test',
      passed: false,
      scorePct: 55,
      totalQuestions: 30,
      correctCount: 16,
      weakTopics: ['ZATCA', 'VAT', 'Zakat'],
      dashboardUrl: 'https://app.example.com/en/learn',
      locale: 'en',
    })
    expect(m.subject).toMatch(/grand test result/i)
    expect(m.subject).toContain('55%')
    expect(m.html).toContain('ZATCA')
  })

  it('renders RTL when locale is ar', () => {
    const m = buildProgressCardEmail({
      recipientName: 'محمد',
      recipientEmail: 'm@example.com',
      assessmentKind: 'daily-assignment',
      scorePct: 60,
      totalQuestions: 5,
      correctCount: 3,
      weakTopics: ['ضريبة القيمة المضافة'],
      dashboardUrl: 'https://app.example.com/ar/learn',
      locale: 'ar',
    })
    expect(m.html).toContain('dir="rtl"')
    expect(m.html).toContain('lang="ar"')
    expect(m.html).toContain('محمد')
  })

  it('escapes HTML in recipient name', () => {
    const m = buildProgressCardEmail({
      recipientName: 'Bobby <script>alert(1)</script>',
      recipientEmail: 'b@example.com',
      assessmentKind: 'daily-assignment',
      scorePct: 0,
      totalQuestions: 0,
      correctCount: 0,
      weakTopics: [],
      dashboardUrl: 'https://x',
      locale: 'en',
    })
    expect(m.html).not.toContain('<script>')
    expect(m.html).toContain('&lt;script&gt;')
  })
})
