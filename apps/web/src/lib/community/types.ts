/**
 * Community platform types — mirrors the shape used by studentunion-v2's
 * `@su/types/contracts.ts` so we can port UI components verbatim.
 *
 * Kept as plain TS types (not Zod schemas) here because we validate
 * inputs at the server-action boundary with dedicated Zod schemas
 * next to each action, and the read path returns pre-validated rows
 * straight from the repositories.
 */

export type PostKind = 'win' | 'tip' | 'showcase' | 'ask' | 'milestone'

export type PostSource =
  | 'composed'
  | 'auto:grand-test-pass'
  | 'auto:cohort-complete'
  | 'auto:badge-earned'

export type ProfileTone = 'accent' | 'brand' | 'grape' | 'coral' | 'mint' | 'blush' | 'ink'

export type ProfileVisibility = 'public' | 'members' | 'hidden'

/** Everything the profile page + a post card need about a user. */
export type PostAuthorView = {
  id: string
  handle: string
  name: string
  avatarUrl: string | null
  tone: ProfileTone
  verified: boolean
  /**
   * Human-readable subtitle — e.g. "India · Chartered Path · Cohort 4".
   * Derived from LearningEnrollment + Certification data.
   */
  headline: string | null
}

/** Item in a feed or on a profile grid. */
export type FeedPostView = {
  id: string
  kind: PostKind
  body: string
  tags: string[]
  mediaUrl: string | null
  source: PostSource
  linkedEntityType: string | null
  linkedEntityId: string | null
  publishedAt: string
  author: PostAuthorView
  likeCount: number
  commentCount: number
  /** Only populated when the request is authed and the viewer matches. */
  viewerLiked: boolean
  viewerSaved: boolean
}

/** Shape of the /u/[handle] page's server data. */
export type ProfileView = {
  author: PostAuthorView
  bio: string | null
  coverImageUrl: string | null
  posts: FeedPostView[]
  followerCount: number
  followingCount: number
  postCount: number
  /** Only populated when the viewer is signed in. */
  viewerFollowing: boolean
  viewerIsOwner: boolean
  /**
   * Verified achievements — pulled from SA's LMS tables. These are
   * the recruiter-facing signal that makes SA profiles worth more
   * than a LinkedIn page.
   */
  achievements: ProfileAchievement[]
}

export type ProfileAchievement = {
  /** Deterministic id so React lists don't churn. */
  id: string
  kind: 'grand-test' | 'cohort-complete' | 'certificate' | 'badge'
  title: string
  subtitle: string
  earnedAt: string
  /** e.g. `${SITE_URL}/verify/${hash}` for certificates. */
  verifyUrl: string | null
}

export type CommentView = {
  id: string
  body: string
  createdAt: string
  author: PostAuthorView
}
