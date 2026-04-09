import { LoadingCard } from '@/components/ui/loading'
import { Sparkles } from 'lucide-react'

export default function EntryTestLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <LoadingCard
          icon={<Sparkles className="h-5 w-5 animate-pulse text-accent" />}
          messages={[
            'Calibrating your placement test…',
            'Pulling questions from the question bank…',
            'Tuning difficulty to your track…',
            'Almost ready…',
          ]}
          showFact
        />
      </main>
    </div>
  )
}
