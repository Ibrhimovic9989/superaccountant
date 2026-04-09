import { LoadingCard } from '@/components/ui/loading'
import { Award } from 'lucide-react'

export default function CertificateLoading() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <LoadingCard
          icon={<Award className="h-5 w-5 animate-pulse text-accent" />}
          messages={[
            'Verifying your certificate…',
            'Checking the signature…',
            'Loading the parchment…',
          ]}
        />
      </main>
    </div>
  )
}
