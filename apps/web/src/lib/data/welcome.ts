import 'server-only'
import { prisma } from '@sa/db'
import { cache } from 'react'

export type PoolCounts = {
  india: { en: number; ar: number }
  ksa: { en: number; ar: number }
}

/** Live count of EntryTestQuestionPool rows by (market, locale). Used to show
 *  "168 questions" on the welcome market picker so the test feels alive. */
export const getPoolCounts = cache(async (): Promise<PoolCounts> => {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ market: string; locale: string; n: bigint }>
  >(
    `SELECT market, locale, count(*) as n
     FROM "EntryTestQuestionPool"
     GROUP BY market, locale`,
  )
  const out: PoolCounts = {
    india: { en: 0, ar: 0 },
    ksa: { en: 0, ar: 0 },
  }
  for (const r of rows) {
    if (r.market === 'india' || r.market === 'ksa') {
      if (r.locale === 'en' || r.locale === 'ar') {
        out[r.market][r.locale] = Number(r.n)
      }
    }
  }
  return out
})
