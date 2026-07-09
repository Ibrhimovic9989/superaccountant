/**
 * Neobrutal skeleton placeholders for Suspense streaming.
 *
 * Rendered while a section's server component is still resolving.
 * Same shape + shadow + border as the real components so the layout
 * doesn't jump when the real content lands.
 *
 * No animation on purpose — a subtle pulse is Instagram-standard, but
 * on a cream-and-ink page it reads as sloppy. Static ghost cards look
 * more like a design decision.
 */

export function StoryRowSkeleton() {
  return (
    <div className="mb-6 rounded-2xl border-2 border-ink bg-white p-4 shadow-pop-md">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="h-3 w-32 rounded-full bg-ink/10" />
      </div>
      <div className="-mx-1 flex items-start gap-3 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div className="h-14 w-14 rounded-2xl border-2 border-ink bg-ink/5 shadow-pop-sm" />
            <div className="h-2 w-10 rounded-full bg-ink/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <FeedCardSkeleton key={i} />
      ))}
    </div>
  )
}

function FeedCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-pop-md">
      {/* Author row */}
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="h-12 w-12 shrink-0 rounded-2xl border-2 border-ink bg-ink/5" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded-full bg-ink/10" />
          <div className="h-2 w-48 rounded-full bg-ink/10" />
        </div>
      </div>
      {/* Body block */}
      <div className="mx-5 mt-4 space-y-2 rounded-2xl border-2 border-ink bg-ink/5 px-5 py-6">
        <div className="h-3 w-11/12 rounded-full bg-ink/10" />
        <div className="h-3 w-9/12 rounded-full bg-ink/10" />
        <div className="h-3 w-8/12 rounded-full bg-ink/10" />
      </div>
      {/* Action row */}
      <div className="mt-4 flex items-center gap-5 border-t-2 border-ink/10 px-5 py-3">
        <div className="h-3 w-10 rounded-full bg-ink/10" />
        <div className="h-3 w-10 rounded-full bg-ink/10" />
      </div>
    </article>
  )
}
