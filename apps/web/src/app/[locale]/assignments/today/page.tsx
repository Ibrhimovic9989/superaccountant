import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { getAccessTier, hasFullAccess } from '@/lib/cohort/access'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, BookOpen, CalendarDays, CircleDot, RotateCcw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type DailyItem = {
  kind: 'review' | 'weak' | 'new'
  lessonSlug: string
  lessonTitle: string
}
type DailyResponse = { itemCount: number; items: DailyItem[] }

const COPY = {
  en: {
    badge: 'Daily plan',
    title: "Today's plan",
    subtitleWith: (n: number) =>
      n === 1 ? '1 item · approximately 5 minutes' : `${n} items · approximately ${n * 5} minutes`,
    empty: 'No plan yet for today',
    emptyBody: 'A new plan is generated automatically every morning.',
    open: 'Open lesson',
    review: 'Spaced repetition',
    weak: 'Weak area',
    new: 'New lesson',
    reviewBlurb: 'Refresh a topic you saw a while back.',
    weakBlurb: 'Reinforce something you struggled with.',
    newBlurb: 'Move forward with something new.',
  },
  ar: {
    badge: 'خطة اليوم',
    title: 'خطة اليوم',
    subtitleWith: (n: number) =>
      n === 1 ? 'عنصر واحد · تقريباً 5 دقائق' : `${n} عناصر · تقريباً ${n * 5} دقائق`,
    empty: 'لا توجد خطة لليوم بعد',
    emptyBody: 'يتم إنشاء خطة جديدة تلقائياً كل صباح.',
    open: 'افتح الدرس',
    review: 'مراجعة متباعدة',
    weak: 'منطقة ضعف',
    new: 'درس جديد',
    reviewBlurb: 'انعش موضوعاً رأيته منذ فترة.',
    weakBlurb: 'عزز شيئاً واجهت صعوبة فيه.',
    newBlurb: 'تقدم بشيء جديد.',
  },
} as const

const KIND_META = {
  review: {
    icon: RotateCcw,
    cls: 'border-warning/30 bg-warning/10 text-warning',
  },
  weak: {
    icon: CircleDot,
    cls: 'border-danger/30 bg-danger/10 text-danger',
  },
  new: {
    icon: Sparkles,
    cls: 'border-accent/30 bg-accent-soft text-accent',
  },
} as const

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const tier = await getAccessTier(session.user.id)
  if (!hasFullAccess(tier)) redirect(`/${locale}/cohort`)
  const userId = session.user.id
  const t = COPY[locale]

  // Server-side fetch with a lazy-generation fallback. If the cron hasn't run
  // yet for today (common for new users on day 1), kick off generation, then
  // re-read. The cron secret comes from NEXTAUTH_SECRET — the API accepts
  // either CRON_SECRET or NEXTAUTH_SECRET to keep dev simple.
  const cronSecret = process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  const fetchToday = async (): Promise<DailyResponse> => {
    try {
      const res = await fetch(`${PUBLIC_CONFIG.apiUrl}/assignments/today?userId=${userId}`, {
        cache: 'no-store',
      })
      if (res.ok) return (await res.json()) as DailyResponse
    } catch {}
    return { itemCount: 0, items: [] }
  }

  let data = await fetchToday()
  if (data.items.length === 0 && cronSecret) {
    try {
      await fetch(`${PUBLIC_CONFIG.apiUrl}/assignments/generate-daily`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cron-secret': cronSecret,
        },
        body: JSON.stringify({ userId }),
        cache: 'no-store',
      })
      data = await fetchToday()
    } catch {
      // Generation failed — fall through to the empty state.
    }
  }

  const today = new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <CalendarDays className="h-3 w-3 text-accent" />
            {t.badge} · {today}
          </div>
        </BlurFade>

        <BlurFade delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>

        <BlurFade delay={0.15}>
          <p className="mt-3 text-sm text-fg-muted">
            {data.items.length > 0 ? t.subtitleWith(data.items.length) : t.emptyBody}
          </p>
        </BlurFade>

        {/* Items */}
        <div className="mt-10">
          {data.items.length === 0 ? (
            <BlurFade delay={0.2}>
              <div className="rounded-2xl border border-dashed border-border bg-bg-elev p-12 text-center">
                <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg">
                  <BookOpen className="h-6 w-6 text-fg-muted" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{t.empty}</h2>
                <p className="mt-2 text-sm text-fg-muted">{t.emptyBody}</p>
              </div>
            </BlurFade>
          ) : (
            <div className="space-y-3">
              {data.items.map((item, i) => {
                const meta = KIND_META[item.kind]
                const Icon = meta.icon
                return (
                  <BlurFade key={`${item.lessonSlug}-${i}`} delay={0.2 + i * 0.06}>
                    <Link
                      href={`/${locale}/lessons/${item.lessonSlug}`}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-bg-elev p-5 transition-all hover:border-border-strong hover:bg-bg-overlay"
                    >
                      <span
                        className={cn(
                          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                          meta.cls,
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                              meta.cls,
                            )}
                          >
                            {t[item.kind]}
                          </span>
                        </div>
                        <h3 className="mt-1.5 truncate text-base font-medium">
                          {item.lessonTitle}
                        </h3>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {item.kind === 'review'
                            ? t.reviewBlurb
                            : item.kind === 'weak'
                              ? t.weakBlurb
                              : t.newBlurb}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </Link>
                  </BlurFade>
                )
              })}
            </div>
          )}
        </div>

        {data.items.length > 0 && (
          <BlurFade delay={0.4}>
            <div className="mt-10 flex justify-center">
              <Button asChild variant="ghost">
                <Link href={`/${locale}/dashboard`}>
                  ← {locale === 'ar' ? 'العودة إلى لوحة التحكم' : 'Back to dashboard'}
                </Link>
              </Button>
            </div>
          </BlurFade>
        )}
      </main>
    </div>
  )
}
