import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function GrandTestLoading() {
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
        <Skeleton className="mb-10 h-12 w-72" />
        <Skeleton className="h-72 rounded-2xl" />
      </main>
      <LoadingFacts floating />
    </div>
  )
}
