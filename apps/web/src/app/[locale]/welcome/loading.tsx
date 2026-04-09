import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function WelcomeLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="mb-3 h-6 w-32 rounded-full" />
        <Skeleton className="mb-3 h-12 w-3/4" />
        <Skeleton className="mb-10 h-4 w-2/3" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="mt-8 h-11 w-40 rounded-lg" />
      </main>
      <LoadingFacts floating />
    </div>
  )
}
