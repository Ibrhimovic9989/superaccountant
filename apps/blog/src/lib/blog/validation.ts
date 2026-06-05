import { z } from 'zod'

/**
 * Zod schemas at the form / server-action boundary. CLAUDE.md §7.1
 * requires every external boundary to validate.
 */

const slugRe = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const baseShape = {
  slug: z.string().min(1).max(120).regex(slugRe, 'lowercase letters, digits, and dashes only'),
  titleEn: z.string().min(1).max(180),
  subtitleEn: z.string().max(300).optional().nullable(),
  metaDescriptionEn: z.string().min(1).max(320),
  contentEnMdx: z.string().min(1),
  heroImageUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null)),
  market: z.enum(['india', 'ksa', 'global']),
  targetKeywords: z.array(z.string().min(1).max(80)).max(20),
} as const

export const createPostSchema = z.object(baseShape)
export const updatePostSchema = z.object({
  ...baseShape,
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
})

export type CreatePostFormInput = z.infer<typeof createPostSchema>

export function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0)
}

/** Derive a slug from a title — used as the live default in the form. */
export function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}
