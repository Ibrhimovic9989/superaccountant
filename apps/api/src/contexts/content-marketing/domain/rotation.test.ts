/**
 * Unit tests for the rotation logic. Pure domain — no I/O.
 *
 * Covers:
 *  - Each day-of-week maps to the right audience (7 tests, one per day)
 *  - Market parity: odd day-of-year → india, even → ksa
 *  - weekLabel returns a stable ISO-ish week string
 */

import { describe, expect, it } from 'vitest'
import { rotate, weekLabel } from './rotation'

// Fixed reference dates so the test is timezone-independent. All dates
// are constructed as UTC noon to avoid any boundary surprise.
const utc = (year: number, monthOneBased: number, day: number): Date =>
  new Date(Date.UTC(year, monthOneBased - 1, day, 12, 0, 0))

describe('rotate — audience by day of week', () => {
  // 2026-01-05 is a Monday. Use it as anchor; step +1 day to walk the week.
  it('Monday → students', () => {
    expect(rotate(utc(2026, 1, 5)).audience).toBe('students')
  })

  it('Tuesday → graduates', () => {
    expect(rotate(utc(2026, 1, 6)).audience).toBe('graduates')
  })

  it('Wednesday → students', () => {
    expect(rotate(utc(2026, 1, 7)).audience).toBe('students')
  })

  it('Thursday → graduates', () => {
    expect(rotate(utc(2026, 1, 8)).audience).toBe('graduates')
  })

  it('Friday → students', () => {
    expect(rotate(utc(2026, 1, 9)).audience).toBe('students')
  })

  it('Saturday → accountants', () => {
    expect(rotate(utc(2026, 1, 10)).audience).toBe('accountants')
  })

  it('Sunday → accountants', () => {
    expect(rotate(utc(2026, 1, 11)).audience).toBe('accountants')
  })
})

describe('rotate — market by day-of-year parity', () => {
  it('Jan 1 (day 1, odd) → india', () => {
    expect(rotate(utc(2026, 1, 1)).market).toBe('india')
  })

  it('Jan 2 (day 2, even) → ksa', () => {
    expect(rotate(utc(2026, 1, 2)).market).toBe('ksa')
  })

  it('Jan 3 (day 3, odd) → india', () => {
    expect(rotate(utc(2026, 1, 3)).market).toBe('india')
  })

  it('mid-year sanity: Jun 5 (day 156, even) → ksa', () => {
    // 31+28+31+30+31+5 = 156 (2026 isn't a leap year)
    expect(rotate(utc(2026, 6, 5)).market).toBe('ksa')
  })

  it('end-of-year sanity: Dec 31 (day 365, odd) → india', () => {
    expect(rotate(utc(2026, 12, 31)).market).toBe('india')
  })
})

describe('rotate — combined output', () => {
  it('returns both audience and market in a single object', () => {
    const r = rotate(utc(2026, 6, 5))
    expect(r).toEqual({ audience: 'graduates', market: 'ksa' })
  })
})

describe('weekLabel', () => {
  it('returns a YYYY-Wnn shape', () => {
    const label = weekLabel(utc(2026, 6, 5))
    expect(label).toMatch(/^2026-W\d{2}$/)
  })

  it('is deterministic for the same date', () => {
    const d = utc(2026, 6, 5)
    expect(weekLabel(d)).toBe(weekLabel(d))
  })
})
