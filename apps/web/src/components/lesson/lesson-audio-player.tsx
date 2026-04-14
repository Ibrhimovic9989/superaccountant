'use client'

import * as React from 'react'
import { Headphones, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact lesson audio player. Narrates the full lesson content in the
 * session locale using pre-generated Azure TTS MP3s cached in Supabase
 * Storage.
 *
 * Features:
 * - Play / pause toggle with a big primary button
 * - Scrubbable progress bar
 * - Playback rate toggle (1× / 1.25× / 1.5×)
 * - Skip forward/back 15s
 * - Current time / duration display
 * - Theme-aware, matches the lesson page aesthetic
 */

type Props = {
  audioUrl: string
  locale: 'en' | 'ar'
  title?: string
}

const RATES = [1, 1.25, 1.5, 2] as const

export function LessonAudioPlayer({ audioUrl, locale, title }: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [rate, setRate] = React.useState<(typeof RATES)[number]>(1)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onLoad = () => {
      setDuration(audio.duration)
      setLoading(false)
    }
    const onEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoad)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoad)
      audio.removeEventListener('ended', onEnd)
    }
  }, [audioUrl])

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  function skip(seconds: number) {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(duration, audioRef.current.currentTime + seconds),
    )
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = val
    setCurrentTime(val)
  }

  function restart() {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
  }

  function cycleRate() {
    const idx = RATES.indexOf(rate)
    setRate(RATES[(idx + 1) % RATES.length]!)
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3 p-4 sm:p-5">
        {/* Play button */}
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          aria-label={playing ? 'Pause' : 'Play'}
          className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all',
            loading
              ? 'bg-bg-overlay text-fg-subtle'
              : 'bg-accent text-accent-fg shadow-[0_0_0_1px_var(--accent),0_0_24px_-8px_var(--accent)] hover:brightness-110',
          )}
        >
          {playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>

        {/* Middle: title + scrubber */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <Headphones className="h-3 w-3 shrink-0 text-accent" />
              <span className="truncate font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                {title ??
                  (locale === 'ar' ? 'استمع إلى الدرس' : 'Listen to this lesson')}
              </span>
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-subtle">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>

          {/* Custom scrubber */}
          <div className="relative h-1.5 rounded-full bg-bg-overlay">
            <div
              className="absolute inset-y-0 start-0 rounded-full bg-accent transition-[width] duration-100"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={seek}
              aria-label="Seek"
              disabled={loading}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0"
            />
          </div>
        </div>

        {/* Right controls: skip, rate, restart */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => skip(-15)}
            disabled={loading}
            aria-label="Skip back 15 seconds"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg sm:inline-flex"
          >
            <span className="text-[10px] font-mono font-semibold">-15</span>
          </button>
          <button
            type="button"
            onClick={() => skip(15)}
            disabled={loading}
            aria-label="Skip forward 15 seconds"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg sm:inline-flex"
          >
            <span className="text-[10px] font-mono font-semibold">+15</span>
          </button>
          <button
            type="button"
            onClick={cycleRate}
            disabled={loading}
            aria-label="Playback speed"
            className="inline-flex h-8 min-w-10 items-center justify-center rounded-md border border-border bg-bg px-2 font-mono text-[10px] font-semibold tabular-nums text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
          >
            {rate}×
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={loading}
            aria-label="Restart"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
