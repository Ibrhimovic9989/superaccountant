import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import type { Guide } from '@/lib/data/guides'
import { getGuidesForMarket } from '@/lib/data/guides'
import { getUserProfile } from '@/lib/data/profile'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, BookOpen, Clock } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const COPY = {
  en: {
    badge: 'Smart Setup Guides',
    title: 'Step-by-step, with you the whole way',
    subtitle:
      'Interactive walkthroughs that ask "did this work?" at every step and route you to a fix when it doesn\'t. Pick a guide and we\'ll handhold you to the finish line.',
    minutes: 'min',
    steps: 'steps',
    open: 'Start guide',
  },
  ar: {
    badge: 'أدلة الإعداد الذكية',
    title: 'خطوة بخطوة، نحن معك طوال الطريق',
    subtitle:
      'إرشادات تفاعلية تسألك "هل نجح ذلك؟" في كل خطوة وتوجهك إلى حل عند الحاجة. اختر دليلاً وسنرافقك حتى النهاية.',
    minutes: 'د',
    steps: 'خطوات',
    open: 'ابدأ الدليل',
  },
} as const

const TILE_CLASSES: Record<Guide['color'], string> = {
  accent: 'border-accent/30 bg-accent-soft',
  warning: 'border-warning/30 bg-warning/10',
  success: 'border-success/30 bg-success/10',
  danger: 'border-danger/30 bg-danger/10',
}

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  const t = COPY[locale]
  const guides = getGuidesForMarket(u.preferredTrack)

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <BookOpen className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-2xl text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
        </BlurFade>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide, i) => {
            const happyPathLength = guide.steps.filter((s) => s.label).length
            return (
              <BlurFade key={guide.slug} delay={0.1 + i * 0.06}>
                <Link
                  href={`/${locale}/guides/${guide.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-elev/50 backdrop-blur transition-all hover:border-border-strong hover:bg-bg-elev"
                >
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl',
                          TILE_CLASSES[guide.color],
                        )}
                      >
                        {guide.emoji}
                      </span>
                      <Badge variant="default">
                        {happyPathLength} {t.steps}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-base font-semibold tracking-tight">{guide.title}</h3>
                    <p className="mt-1 text-xs text-fg-muted">{guide.subtitle}</p>
                    <p className="mt-4 flex-1 text-xs leading-relaxed text-fg-muted">
                      {guide.hook}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      <Clock className="h-3 w-3" />~{guide.estimatedMinutes} {t.minutes}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border bg-bg-overlay/50 px-5 py-3 text-sm font-medium text-accent">
                    <span>{t.open}</span>
                    <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <BorderBeam size={80} duration={10} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                </Link>
              </BlurFade>
            )
          })}
        </div>
      </main>
    </div>
  )
}
