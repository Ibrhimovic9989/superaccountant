import { describe, expect, it } from 'vitest'
import { pickRedoLessons, topWeakTopics } from './progress-card'

describe('topWeakTopics', () => {
  it('returns frequency-ordered topics', () => {
    expect(
      topWeakTopics([
        { topic: 'GST' },
        { topic: 'TDS' },
        { topic: 'GST' },
        { topic: 'IFRS' },
        { topic: 'GST' },
      ]),
    ).toEqual(['GST', 'TDS', 'IFRS'])
  })

  it('breaks ties by first-seen order', () => {
    expect(
      topWeakTopics([
        { topic: 'B' },
        { topic: 'A' },
        { topic: 'A' },
        { topic: 'B' },
      ]),
    ).toEqual(['B', 'A'])
  })

  it('caps at the limit', () => {
    const wrong = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((t) => ({ topic: t }))
    expect(topWeakTopics(wrong, 3)).toHaveLength(3)
  })

  it('skips empty topics', () => {
    expect(topWeakTopics([{ topic: '' }, { topic: '  ' }, { topic: 'GST' }])).toEqual(['GST'])
  })

  it('returns empty array on empty input', () => {
    expect(topWeakTopics([])).toEqual([])
  })
})

describe('pickRedoLessons', () => {
  const lessons = [
    {
      slug: 'gst-input-credit',
      titleEn: 'GST Input Credit',
      titleAr: 'الخصم الضريبي للدخل',
      moduleTitleEn: 'GST',
      moduleTitleAr: 'ضريبة السلع والخدمات',
    },
    {
      slug: 'tds-on-salary',
      titleEn: 'TDS on Salary',
      titleAr: 'خصم الضريبة من الراتب',
      moduleTitleEn: 'Income Tax',
      moduleTitleAr: 'ضريبة الدخل',
    },
    {
      slug: 'ifrs-9',
      titleEn: 'IFRS 9 — Financial Instruments',
      titleAr: 'المعيار الدولي 9',
      moduleTitleEn: 'IFRS',
      moduleTitleAr: 'المعايير الدولية',
    },
  ]

  it('matches topic to lesson by substring', () => {
    const picks = pickRedoLessons({
      weakTopics: ['GST', 'IFRS'],
      lessons,
      baseUrl: 'https://app.example.com/en',
      locale: 'en',
    })
    expect(picks).toHaveLength(2)
    expect(picks[0]?.title).toContain('GST')
    expect(picks[0]?.url).toBe('https://app.example.com/en/lessons/gst-input-credit')
    expect(picks[1]?.title).toContain('IFRS')
  })

  it('caps at 3 by default', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      slug: `lesson-${i}`,
      titleEn: `Topic ${i}`,
      titleAr: null,
    }))
    const weak = many.map((m) => m.titleEn)
    const picks = pickRedoLessons({
      weakTopics: weak,
      lessons: many,
      baseUrl: 'https://x',
      locale: 'en',
    })
    expect(picks).toHaveLength(3)
  })

  it('returns empty when nothing matches', () => {
    const picks = pickRedoLessons({
      weakTopics: ['Quantum Mechanics'],
      lessons,
      baseUrl: 'https://x',
      locale: 'en',
    })
    expect(picks).toEqual([])
  })

  it('uses Arabic title for ar locale', () => {
    const picks = pickRedoLessons({
      weakTopics: ['IFRS'],
      lessons,
      baseUrl: 'https://app.example.com/ar',
      locale: 'ar',
    })
    expect(picks[0]?.title).toBe('المعيار الدولي 9')
  })

  it('skips duplicates — one lesson cannot be picked twice', () => {
    const picks = pickRedoLessons({
      weakTopics: ['GST', 'GST Input Credit'],
      lessons,
      baseUrl: 'https://x',
      locale: 'en',
    })
    expect(picks).toHaveLength(1)
  })
})
