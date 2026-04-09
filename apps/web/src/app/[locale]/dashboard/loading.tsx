import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Nav stub */}
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Greeting */}
        <Skeleton className="mb-3 h-3 w-40" />
        <Skeleton className="mb-3 h-12 w-80 max-w-full" />
        <Skeleton className="h-4 w-64" />

        {/* Continue + Streak */}
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[260px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[260px] rounded-xl" />
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>

        {/* Today + Phases */}
        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-[280px] rounded-xl lg:col-span-3" />
          <Skeleton className="h-[280px] rounded-xl lg:col-span-2" />
        </div>

      </main>
      <LoadingFacts floating />
    </div>
  )
}
