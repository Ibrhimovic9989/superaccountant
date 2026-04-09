'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Loader2, Search as SearchIcon, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { AppNav } from '@/components/app-nav'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { cn } from '@/lib/utils'

type Result = {
  lessonSlug: string
  lessonTitle: string
  heading: string
  excerpt: string
  score: number
  phaseOrder: number
  moduleTitle: string
}

const COPY = {
  en: {
    badge: 'Semantic search',
    title: 'Search the curriculum',
    subtitle: 'Ask anything — the search uses the same embeddings as the tutor.',
    placeholder: 'e.g. "reverse charge mechanism" or "how does Zakat work"',
    searching: 'Searching…',
    noResults: 'No matches found. Try a different query.',
    phase: 'Phase',
    score: 'Relevance',
  },
  ar: {
    badge: 'بحث دلالي',
    title: 'ابحث في المنهج',
    subtitle: 'اسأل عن أي شيء — البحث يستخدم نفس التضمينات التي يستخدمها المدرس.',
    placeholder: 'مثال: "آلية الاحتساب العكسي" أو "كيف تعمل الزكاة"',
    searching: 'جارٍ البحث…',
    noResults: 'لم يتم العثور على نتائج. جرب استعلامًا مختلفًا.',
    phase: 'المرحلة',
    score: 'الصلة',
  },
} as const

export default function SearchPage() {
  const path = usePathname()
  const locale: 'en' | 'ar' = path?.startsWith('/ar') ? 'ar' : 'en'
  const t = COPY[locale]
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = React.useState(initialQ)
  const [results, setResults] = React.useState<Result[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searched, setSearched] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Auto-search if ?q= is in the URL on mount.
  React.useEffect(() => {
    if (initialQ.trim().length >= 2) doSearch(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function doSearch(q: string) {
    if (q.trim().length < 2) return
    setLoading(true)
    setSearched(true)
    // Update URL without navigation.
    const url = new URL(window.location.href)
    url.searchParams.set('q', q.trim())
    window.history.replaceState({}, '', url.toString())

    try {
      const res = await fetch(
        `${PUBLIC_CONFIG.apiUrl}/curriculum/search?q=${encodeURIComponent(q.trim())}&market=ksa&locale=${locale}&limit=12`,
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doSearch(query)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      {/* Can't use the server AppNav here since this is a client component.
          Render a minimal header instead. */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href={`/${locale}/dashboard`} className="flex shrink-0 items-center gap-2">
            <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-fg text-bg">
              <span className="font-mono text-[11px] font-bold leading-none">SA</span>
            </span>
            <span className="text-sm font-semibold tracking-tight max-[420px]:hidden">
              SuperAccountant
            </span>
          </Link>
          <Link
            href={`/${locale}/dashboard`}
            className="text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {locale === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <Sparkles className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-xl text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
        </BlurFade>

        {/* Search input */}
        <BlurFade delay={0.2}>
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-bg-elev p-2 focus-within:border-accent">
              <SearchIcon className="ms-3 h-4 w-4 shrink-0 text-fg-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1 bg-transparent px-2 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
              />
              <Button type="submit" variant="accent" size="sm" disabled={loading || query.trim().length < 2}>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                )}
              </Button>
            </div>
          </form>
        </BlurFade>

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.searching}
          </div>
        )}

        {/* Results */}
        {!loading && searched && results.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-fg-muted">{t.noResults}</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="mt-10 space-y-3">
            <AnimatePresence mode="popLayout">
              {results.map((r, i) => (
                <motion.div
                  key={`${r.lessonSlug}-${r.heading}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <Link
                    href={`/${locale}/lessons/${r.lessonSlug}`}
                    className="group flex flex-col gap-2 rounded-xl border border-border bg-bg-elev/50 p-4 transition-all hover:border-border-strong hover:bg-bg-elev sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                        {t.phase} {r.phaseOrder}
                      </span>
                      <span className="text-fg-subtle/40">·</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                        {r.moduleTitle}
                      </span>
                      <span className="ms-auto font-mono text-[9px] tabular-nums text-accent">
                        {Math.round(r.score * 100)}%
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-fg sm:text-base">
                      {r.lessonTitle}
                    </h3>
                    {r.heading && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                        § {r.heading}
                      </p>
                    )}
                    <p className="line-clamp-2 text-xs leading-relaxed text-fg-muted">
                      {r.excerpt}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      {locale === 'ar' ? 'اذهب إلى الدرس' : 'Go to lesson'}
                      <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
