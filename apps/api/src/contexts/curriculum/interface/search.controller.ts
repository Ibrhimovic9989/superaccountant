import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { embed } from '@sa/ai'
import { prisma } from '@sa/db'

/**
 * Semantic curriculum search. Takes a natural-language query, embeds it,
 * and returns the top-N matching lesson chunks via pgvector cosine similarity.
 *
 * GET /curriculum/search?q=...&market=ksa&locale=en&limit=10
 */
@Controller('curriculum')
export class CurriculumSearchController {
  @Get('search')
  async search(
    @Query('q') q: string | undefined,
    @Query('market') market: string | undefined,
    @Query('locale') locale: string | undefined,
    @Query('limit') limitStr: string | undefined,
  ) {
    if (!q || q.trim().length < 2) {
      throw new BadRequestException('q must be at least 2 characters')
    }
    const m = market === 'india' || market === 'ksa' ? market : 'india'
    const l = locale === 'ar' ? 'ar' : 'en'
    const limit = Math.min(Math.max(Number(limitStr) || 10, 1), 25)

    const [queryVec] = await embed(q.trim())
    if (!queryVec) throw new BadRequestException('embedding failed')

    const vectorLiteral = `[${queryVec.join(',')}]`

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        lessonSlug: string
        lessonTitle: string
        heading: string
        body: string
        distance: number
        phaseOrder: number
        moduleTitle: string
      }>
    >(
      `SELECT
         L.slug          AS "lessonSlug",
         CASE WHEN $1 = 'ar' THEN COALESCE(L."titleAr", L."titleEn") ELSE L."titleEn" END AS "lessonTitle",
         C.heading       AS "heading",
         C.body          AS "body",
         (C.embedding <=> $2::vector) AS "distance",
         P."order"       AS "phaseOrder",
         CASE WHEN $1 = 'ar' THEN COALESCE(M."titleAr", M."titleEn") ELSE M."titleEn" END AS "moduleTitle"
       FROM "CurriculumLessonChunk" C
       JOIN "CurriculumLesson"      L ON L.id = C."lessonId"
       JOIN "CurriculumModule"      M ON M.id = L."moduleId"
       JOIN "CurriculumPhase"       P ON P.id = M."phaseId"
       JOIN "CurriculumTrack"       T ON T.id = P."trackId"
       WHERE T.market = $3::"MarketTrack"
         AND C.locale = $1
       ORDER BY C.embedding <=> $2::vector
       LIMIT $4`,
      l,
      vectorLiteral,
      m,
      limit,
    )

    return {
      query: q.trim(),
      market: m,
      locale: l,
      results: rows.map((r) => ({
        lessonSlug: r.lessonSlug,
        lessonTitle: r.lessonTitle,
        heading: r.heading,
        excerpt: r.body.slice(0, 300),
        score: Math.round((1 - r.distance) * 100) / 100,
        phaseOrder: r.phaseOrder,
        moduleTitle: r.moduleTitle,
      })),
    }
  }
}
