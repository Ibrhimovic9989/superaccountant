/**
 * Shared blog types. Co-located with the store so a future migration to
 * a dedicated NestJS context (apps/api/src/contexts/content-marketing)
 * has a single import surface to rewire.
 */

export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type BlogMarket = 'india' | 'ksa' | 'global'
export type Locale = 'en' | 'ar'

export type BlogPost = {
  id: string
  slug: string
  titleEn: string
  titleAr: string | null
  subtitleEn: string | null
  subtitleAr: string | null
  contentEnMdx: string
  contentArMdx: string | null
  metaDescriptionEn: string
  metaDescriptionAr: string | null
  heroImageUrl: string | null
  status: BlogPostStatus
  publishedAt: Date | null
  scheduledFor: Date | null
  authorAgentId: string | null
  authorHumanUserId: string | null
  targetKeywords: string[]
  market: BlogMarket
  viewCount: number
  signupConversions: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type BlogTopicStatus = 'researched' | 'queued' | 'used' | 'archived'
export type BlogTopicAudience = 'students' | 'graduates' | 'accountants'

export type BlogTopic = {
  id: string
  topic: string
  sourceKeywords: string[]
  marketResearch: unknown
  status: BlogTopicStatus
  targetMarket: BlogMarket
  targetAudience: BlogTopicAudience
  generatedAt: Date
  usedAt: Date | null
  usedByBlogPostId: string | null
}
