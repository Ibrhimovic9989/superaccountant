import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function LessonLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto grid max-w-5xl gap-x-10 gap-y-4 px-6 py-12 md:grid-cols-[120px_minmax(0,1fr)]">
        {/* Nav rail */}
        <aside className="hidden md:block">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </aside>

        {/* Body */}
        <div>
          <Skeleton className="mb-3 h-3 w-32" />
          <Skeleton className="mb-6 h-10 w-3/4" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-11/12" />
          <Skeleton className="mb-8 h-4 w-9/12" />

          <Skeleton className="mb-6 aspect-video w-full rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </main>
      <LoadingFacts floating />
    </div>
  )
}
