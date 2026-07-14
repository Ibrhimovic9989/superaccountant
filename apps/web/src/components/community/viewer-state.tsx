'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/**
 * Client-side viewer state hydration for anonymous SSG pages.
 *
 * The story: public community pages (/community, /reels, /u/[handle],
 * /p/[postId], /tag/[tag]) render as anonymous static HTML so
 * Googlebot gets `Cache-Control: public, s-maxage=…` instead of the
 * old `no-store`. That means the server hands every FeedCard a
 * `viewerLiked=false` no matter who the viewer actually is.
 *
 * This provider hits POST /api/community/viewer-state after mount
 * with the list of visible post IDs, then feeds the resulting liked
 * / saved sets into LikeButton (and future SaveButton) via context.
 *
 * If the viewer isn't signed in, the endpoint returns empty maps and
 * the initial server-rendered state stands. Signed-in users see the
 * correct filled hearts a fraction of a second after page paint.
 */

type ViewerState = {
  /** Whether the hydration fetch has completed (regardless of outcome). */
  hydrated: boolean
  /** Whether the viewer is signed in (per /api/me). null until hydrated. */
  signedIn: boolean | null
  /** Post IDs the viewer has liked. Empty until hydrated. */
  liked: Set<string>
  /** Post IDs the viewer has saved. Empty until hydrated. */
  saved: Set<string>
  /** Optimistic override used by LikeButton after a successful toggle. */
  markLiked: (postId: string, liked: boolean) => void
}

const noopState: ViewerState = {
  hydrated: false,
  signedIn: null,
  liked: new Set(),
  saved: new Set(),
  markLiked: () => {},
}

const ViewerStateContext = createContext<ViewerState>(noopState)

/**
 * Hydrates viewer state for the given post IDs on mount. Skip
 * mounting this provider on pages that don't render any interactive
 * post cards.
 *
 * Passing an empty `postIds` array is fine — the fetch still checks
 * sign-in status via a small `[]` payload, which is useful when a
 * page has no posts but still needs to know signed-in-ness (e.g. an
 * empty tag page).
 */
export function ViewerStateProvider({
  postIds,
  children,
}: {
  postIds: string[]
  children: ReactNode
}) {
  const [hydrated, setHydrated] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [liked, setLiked] = useState<Set<string>>(() => new Set())
  const [saved, setSaved] = useState<Set<string>>(() => new Set())

  // Guard against React 19 double-invoke in strict mode + stale
  // requests when the parent re-renders with a new postIds set.
  const abortRef = useRef<AbortController | null>(null)

  // We stringify + sort the IDs into a stable key so the effect only
  // reruns when the actual set changes, not every parent re-render.
  const key = useMemo(() => [...postIds].sort().join(','), [postIds])

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    const run = async () => {
      try {
        const [meRes, viewerRes] = await Promise.all([
          fetch('/api/me', { signal: ctrl.signal, cache: 'no-store' }),
          fetch('/api/community/viewer-state', {
            method: 'POST',
            body: JSON.stringify({ postIds }),
            headers: { 'Content-Type': 'application/json' },
            signal: ctrl.signal,
            cache: 'no-store',
          }),
        ])
        if (ctrl.signal.aborted) return
        const me = meRes.ok
          ? ((await meRes.json()) as { signedIn: boolean })
          : { signedIn: false }
        const state = viewerRes.ok
          ? ((await viewerRes.json()) as {
              liked: Record<string, true>
              saved: Record<string, true>
            })
          : { liked: {}, saved: {} }
        setSignedIn(me.signedIn)
        setLiked(new Set(Object.keys(state.liked)))
        setSaved(new Set(Object.keys(state.saved)))
        setHydrated(true)
      } catch {
        // Network failure — leave initial (anonymous) state in place.
        // Not fatal; signed-in users just see incorrect heart states
        // until they interact. Better than a broken page.
        setHydrated(true)
      }
    }
    void run()
    return () => ctrl.abort()
  }, [key, postIds])

  const value = useMemo<ViewerState>(
    () => ({
      hydrated,
      signedIn,
      liked,
      saved,
      markLiked: (postId, isLiked) => {
        setLiked((prev) => {
          const next = new Set(prev)
          if (isLiked) next.add(postId)
          else next.delete(postId)
          return next
        })
      },
    }),
    [hydrated, signedIn, liked, saved],
  )

  return (
    <ViewerStateContext.Provider value={value}>
      {children}
    </ViewerStateContext.Provider>
  )
}

export function useViewerState(): ViewerState {
  return useContext(ViewerStateContext)
}
