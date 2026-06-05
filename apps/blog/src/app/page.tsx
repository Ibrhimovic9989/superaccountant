import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { listRecentPublished } from '@/lib/blog/store'
import { PostCard } from '@/components/post-card'
import { CtaStrip } from '@/components/cta-strip'

export const revalidate = 300

export default async function HomePage() {
  const featured = await listRecentPublished({ limit: 3 })
  const recent = await listRecentPublished({ limit: 12, offset: featured.length })

  return (
    <>
      {/* Hero — polished landing that visually pairs with apps/marketing */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-70" />
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-12 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            The SuperAccountant Journal
          </div>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Practical accounting,
            <br />
            written for the people doing the work.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            GST returns, TDS reconciliations, ZATCA e-invoicing, Ind AS adoption, and the career
            choices that get you to the next role. India and KSA, in plain English.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tag/india"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              India track
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/tag/ksa"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              KSA track
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/tag/careers"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              Careers
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {featured.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <section>
              <h2 className="mb-5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                Latest
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>

            {recent.length > 0 && (
              <section className="mt-14">
                <h2 className="mb-5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
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
    </>
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
