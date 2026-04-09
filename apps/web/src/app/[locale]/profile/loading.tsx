import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function ProfileLoading() {
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
        <Skeleton className="mb-3 h-6 w-32 rounded-full" />
        <Skeleton className="mb-3 h-12 w-64" />
        <Skeleton className="mb-10 h-4 w-96 max-w-full" />
        <div className="space-y-6 rounded-2xl border border-border bg-bg-elev/50 p-6 sm:p-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3 w-24" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-11 rounded-lg" />
                <Skeleton className="h-11 rounded-lg" />
                <Skeleton className="h-11 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
      <LoadingFacts floating />
    </div>
  )
}
