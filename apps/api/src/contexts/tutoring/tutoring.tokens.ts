/** DI tokens for the tutoring context. Keeping them in their own file
 *  avoids circular imports between module + controller. */
export const TUTORING_AGENT = Symbol('TUTORING_AGENT')
export const CURRICULUM_SEARCH = Symbol('CURRICULUM_SEARCH')
export const SESSION_MEMORY = Symbol('SESSION_MEMORY')
export const MASTERY = Symbol('MASTERY')
export const USER_PROFILE = Symbol('USER_PROFILE')
