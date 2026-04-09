import { LoadingFacts, Skeleton } from '@/components/ui/loading'

export default function SignInLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Skeleton className="mb-3 h-10 w-48" />
        <Skeleton className="mb-10 h-4 w-64" />
        <Skeleton className="mb-3 h-11 w-full rounded-lg" />
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <Skeleton className="h-3 w-8" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-3 h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </main>
      <LoadingFacts floating />
    </div>
  )
}
