/**
 * Media-kind derivation from the URL extension.
 *
 * The community post schema stores `mediaUrl` as a plain string with
 * no adjacent `mediaKind` column — the kind is derivable from the
 * file extension. This module is the single source of truth for that
 * derivation so the feed card, profile tile, and OG image agree.
 *
 * Keep this list in lockstep with the extensions that
 * `signCommunityUploadAction` will write to disk.
 */

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v'])

export type MediaKind = 'image' | 'video'

export function mediaKind(url: string | null | undefined): MediaKind | null {
  if (!url) return null
  // Strip a query string / hash so `?token=…` doesn't fool us.
  const clean = url.split('?')[0]!.split('#')[0]!
  const dot = clean.lastIndexOf('.')
  if (dot < 0) return null
  const ext = clean.slice(dot + 1).toLowerCase()
  if (VIDEO_EXTS.has(ext)) return 'video'
  return 'image'
}

export function isVideoUrl(url: string | null | undefined): boolean {
  return mediaKind(url) === 'video'
}
