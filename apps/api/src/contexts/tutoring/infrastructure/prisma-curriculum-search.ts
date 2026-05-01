import { prisma } from '@sa/db'
import type { CurriculumSearchPort, LessonChunkHit, Locale, MarketTrack } from '../domain/session'

/**
 * pgvector-backed curriculum search. Uses raw SQL since Prisma cannot model
 * vector columns. The embedding column was added by the migration in
 * packages/db/prisma/migrations/20260407_pgvector/.
 *
 * Cosine similarity via the `<=>` operator (smaller = closer). We return
 * `score = 1 - distance` so callers can think in "higher = better".
 */
export class PrismaCurriculumSearch implements CurriculumSearchPort {
  async searchByEmbedding(args: {
    market: MarketTrack
    locale: Locale
    queryEmbedding: number[]
    limit: number
  }): Promise<LessonChunkHit[]> {
    const { market, locale, queryEmbedding, limit } = args
    const vectorLiteral = `[${queryEmbedding.join(',')}]`

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        lessonSlug: string
        lessonTitle: string
        heading: string
        body: string
        distance: number
      }>
    >(
      `SELECT
         L.slug          AS "lessonSlug",
         CASE WHEN $1 = 'ar' THEN L."titleAr" ELSE L."titleEn" END AS "lessonTitle",
         C.heading       AS "heading",
         C.body          AS "body",
         (C.embedding <=> $2::vector) AS "distance"
       FROM "CurriculumLessonChunk" C
       JOIN "CurriculumLesson"      L ON L.id = C."lessonId"
       JOIN "CurriculumModule"      M ON M.id = L."moduleId"
       JOIN "CurriculumPhase"       P ON P.id = M."phaseId"
       JOIN "CurriculumTrack"       T ON T.id = P."trackId"
       WHERE T.market = $3::"MarketTrack"
         AND C.locale = $1
       ORDER BY C.embedding <=> $2::vector
       LIMIT $4`,
      locale,
      vectorLiteral,
      market,
      limit,
    )

    return rows.map((r) => ({
      lessonSlug: r.lessonSlug,
      lessonTitle: r.lessonTitle,
      heading: r.heading,
      body: r.body,
      score: 1 - r.distance,
      locale,
    }))
  }
}
