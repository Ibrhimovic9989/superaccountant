import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function TodayLoading() {
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

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Skeleton className="mb-3 h-6 w-48 rounded-full" />
        <Skeleton className="mb-3 h-12 w-64" />
        <Skeleton className="h-4 w-56" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </main>
      <LoadingFacts floating />
    </div>
  )
}
