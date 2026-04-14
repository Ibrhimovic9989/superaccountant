import { AppNav } from '@/components/app-nav'
import { BlurFade } from '@/components/magicui/blur-fade'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import { getUserProfile } from '@/lib/data/profile'
import type { Song, SongVerse } from '@/lib/data/songs'
import { getSongBySlug, getSongsForMarket } from '@/lib/data/songs'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowLeft, Music2, Sparkles, Youtube } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

const COPY = {
  en: {
    back: 'Back to Song Lab',
    badge: 'Song Lab',
    sungTo: 'Sung to',
    playTune: 'Play the tune',
    intro: 'How to sing this',
    chorus: 'Chorus',
    verse: 'Verse',
    outro: "After you've learned it",
    cheatSheet: 'Quick-reference cheat sheet',
    tip: 'Tip',
    tipBody:
      'Play the tune above on loop. Read the chorus out loud three times. Then work down the verses — one at a time. You will have the whole song memorized in under ten minutes.',
  },
  ar: {
    back: 'العودة إلى معمل الأغاني',
    badge: 'معمل الأغاني',
    sungTo: 'على لحن',
    playTune: 'شغل اللحن',
    intro: 'كيف تغنيها',
    chorus: 'الكورس',
    verse: 'المقطع',
    outro: 'بعد أن تتعلمها',
    cheatSheet: 'ورقة مراجعة سريعة',
    tip: 'نصيحة',
    tipBody:
      'شغل اللحن أعلاه في حلقة. اقرأ الكورس بصوت عالٍ ثلاث مرات. ثم انتقل إلى المقاطع — مقطع واحد في كل مرة. ستحفظ الأغنية كاملة في أقل من عشر دقائق.',
  },
} as const

const TILE_CLASSES: Record<Song['color'], string> = {
  accent: 'border-accent/30 bg-accent-soft',
  warning: 'border-warning/30 bg-warning/10',
  success: 'border-success/30 bg-success/10',
  danger: 'border-danger/30 bg-danger/10',
}

const CHORUS_BORDER_CLASSES: Record<Song['color'], string> = {
  accent: 'border-accent/40 bg-accent-soft/40',
  warning: 'border-warning/40 bg-warning/5',
  success: 'border-success/40 bg-success/5',
  danger: 'border-danger/40 bg-danger/5',
}

function VerseBlock({
  verse,
  index,
  fallbackLabel,
}: {
  verse: SongVerse
  index: number
  fallbackLabel: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/30 p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-bg-overlay px-1.5 font-mono text-[10px] font-medium text-fg-muted">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {verse.label ?? `${fallbackLabel} ${index + 1}`}
        </span>
      </div>
      <div className="space-y-1">
        {verse.lines.map((line, j) => (
          <p key={`${j}-${line}`} className="text-base leading-relaxed text-fg sm:text-lg">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale; slug: string }>
}) {
  const { locale, slug } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)

  const song = getSongBySlug(slug)
  if (!song) notFound()

  // Hide songs outside the student's market scope.
  const visible = getSongsForMarket(u.preferredTrack).some((s) => s.slug === song.slug)
  if (!visible) notFound()

  const t = COPY[locale]
  const colorTile = `inline-flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl ${TILE_CLASSES[song.color]}`
  const chorusBorder = `rounded-2xl border-2 p-6 ${CHORUS_BORDER_CLASSES[song.color]}`

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back link */}
        <BlurFade delay={0.05}>
          <Link
            href={`/${locale}/songs`}
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {t.back}
          </Link>
        </BlurFade>

        {/* Header */}
        <BlurFade delay={0.1}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <Music2 className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div className="flex items-start gap-4">
            <span className={colorTile}>{song.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{song.title}</h1>
              <p className="mt-1 text-sm text-fg-muted sm:text-base">{song.subtitle}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                ♫ {t.sungTo} {song.tune.name}
              </p>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
            {song.hook}
          </p>
        </BlurFade>

        {/* YouTube embed — play the tune */}
        <BlurFade delay={0.25}>
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-bg-elev/50 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-fg">
                <Youtube className="h-3.5 w-3.5 text-danger" />
                {t.playTune}
              </div>
              <Badge variant="default">{song.tune.name}</Badge>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${song.tune.youtubeId}`}
                title={song.tune.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        </BlurFade>

        {/* Intro */}
        {song.intro && (
          <BlurFade delay={0.3}>
            <section className="mt-10">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {t.intro}
              </h2>
              <p className="text-sm leading-relaxed text-fg sm:text-base">{song.intro}</p>
            </section>
          </BlurFade>
        )}

        {/* Chorus box — always visible at top of lyrics */}
        <BlurFade delay={0.35}>
          <section className="mt-8">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              <Sparkles className="h-3 w-3 text-accent" />
              {t.chorus}
            </div>
            <div className={chorusBorder}>
              {song.chorus.map((line, i) => (
                <p
                  key={`${i}-${line}`}
                  className="text-base font-medium leading-relaxed text-fg sm:text-lg"
                >
                  {line}
                </p>
              ))}
            </div>
          </section>
        </BlurFade>

        {/* Verses */}
        <section className="mt-10 space-y-6">
          {song.verses.map((verse, i) => (
            <BlurFade key={verse.label ?? `v-${i}`} delay={0.4 + i * 0.04}>
              <VerseBlock verse={verse} index={i} fallbackLabel={t.verse} />
            </BlurFade>
          ))}
        </section>

        {/* Chorus repeat reminder */}
        <BlurFade delay={0.55}>
          <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            ♫ {t.chorus} ×
          </p>
        </BlurFade>

        {/* Outro */}
        {song.outro && (
          <BlurFade delay={0.6}>
            <section className="mt-10 rounded-2xl border border-border bg-bg-elev/40 p-5 sm:p-6">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {t.outro}
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted sm:text-base">{song.outro}</p>
            </section>
          </BlurFade>
        )}

        {/* Cheat sheet */}
        {song.cheatSheet && song.cheatSheet.length > 0 && (
          <BlurFade delay={0.65}>
            <section className="mt-8">
              <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                {t.cheatSheet}
              </h2>
              <ul className="space-y-1.5 rounded-2xl border border-dashed border-border bg-bg-overlay/30 p-5">
                {song.cheatSheet.map((row) => (
                  <li
                    key={row}
                    className="font-mono text-xs leading-relaxed text-fg-muted sm:text-sm"
                  >
                    {row}
                  </li>
                ))}
              </ul>
            </section>
          </BlurFade>
        )}

        {/* Tip */}
        <BlurFade delay={0.7}>
          <div className="mt-10 rounded-2xl border border-accent/30 bg-accent-soft/40 p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-accent">
              <Sparkles className="h-3 w-3" />
              {t.tip}
            </div>
            <p className="text-sm leading-relaxed text-fg sm:text-base">{t.tipBody}</p>
          </div>
        </BlurFade>
      </main>
    </div>
  )
}
