import { LoadingCard } from '@/components/ui/loading'
import { Award } from 'lucide-react'

export default function VerifyLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
        <div className="w-full">
          <LoadingCard
            icon={<Award className="h-5 w-5 animate-pulse text-accent" />}
            messages={[
              'Verifying certificate…',
              'Checking the signature…',
              'Loading details…',
            ]}
            showFact
          />
        </div>
      </main>
    </div>
  )
}
