import Link from 'next/link'
import { listRecentPublished } from '@/lib/blog/store'
import { PostCard } from '@/components/post-card'
import { CtaStrip } from '@/components/cta-strip'

export const revalidate = 300 // 5 min ISR

export default async function HomePage() {
  const featured = await listRecentPublished({ limit: 3 })
  const recent = await listRecentPublished({ limit: 12, offset: featured.length })

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <section className="mb-12">
        <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
          The SuperAccountant Journal
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
          Practical accounting, written for the people doing the work.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-fg-muted">
          GST returns, TDS reconciliations, ZATCA e-invoicing, Ind AS adoption, and the career
          choices that get you to the next role. India and KSA, in plain English.
        </p>
      </section>

      {featured.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </section>

          {recent.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-5 font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                More from the journal
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-16">
        <CtaStrip />
      </section>
    </main>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-bg-overlay p-10 text-center">
      <h2 className="text-2xl font-semibold">First posts coming soon.</h2>
      <p className="mt-2 text-sm text-fg-muted">
        We&apos;re seeding the journal now. In the meantime,{' '}
        <Link href="/sign-in" className="text-accent hover:underline">
          editorial team can sign in
        </Link>{' '}
        to start drafting.
      </p>
    </div>
  )
}
