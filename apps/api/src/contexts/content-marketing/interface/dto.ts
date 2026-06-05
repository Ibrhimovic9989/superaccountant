/**
 * REST DTOs for the content-marketing context.
 *
 * Only one endpoint at MVP — `POST /blog/auto-generate` — and it takes
 * no body. The shape exists so future overrides (force a specific
 * market, force a specific date for backfills) slot in without breaking
 * the contract.
 */

import { z } from 'zod'

export const AutoGenerateBody = z
  .object({
    /**
     * Optional ISO-8601 date override. The orchestrator passes this
     * through to the rotation rule. Useful for backfills or manual
     * "publish for tomorrow" runs from the admin panel. Cron always
     * sends an empty body.
     */
    now: z
      .string()
      .datetime({ offset: true })
      .optional(),
  })
  .strict()

export type AutoGenerateBody = z.infer<typeof AutoGenerateBody>

export const AutoGenerateResponse = z.union([
  z.object({
    ok: z.literal(true),
    blogPostId: z.string(),
    slug: z.string(),
    title: z.string(),
    audience: z.enum(['students', 'graduates', 'accountants']),
    market: z.enum(['india', 'ksa']),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])
