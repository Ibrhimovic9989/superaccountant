import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function RoadmapLoading() {
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
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <Skeleton className="mb-3 h-6 w-32 rounded-full" />
        <Skeleton className="mb-3 h-12 w-72" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <Skeleton className="mb-6 h-28 rounded-2xl" />
        <Skeleton className="mb-10 h-2 w-full rounded-full" />
        <div className="space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ps-14">
              <Skeleton className="mb-3 h-8 w-48" />
              <Skeleton className="mb-4 h-1 w-full rounded-full" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
      <LoadingFacts floating />
    </div>
  )
}
