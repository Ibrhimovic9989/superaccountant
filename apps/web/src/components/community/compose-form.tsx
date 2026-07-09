'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { createPostAction } from '@/lib/community/actions'
import type { PostKind } from '@/lib/community/types'
import { ImageUploader } from './image-uploader'

/**
 * Neobrutal compose form. Emoji-forward kind picker, chunky textarea,
 * tags row, media uploader, sticker submit button.
 */

const KINDS: Array<{
  key: PostKind
  label: string
  emoji: string
  helper: string
  bg: string
}> = [
  { key: 'win', label: 'Win', emoji: '🏆', helper: 'A concrete result — a lesson done, a badge, a real workpaper.', bg: 'bg-mint text-white' },
  { key: 'ask', label: 'Ask', emoji: '💬', helper: 'A question the agent + peers can answer. Great long-tail SEO.', bg: 'bg-coral text-white' },
  { key: 'tip', label: 'Tip', emoji: '💡', helper: "Something you learned that saved you time.", bg: 'bg-brand text-white' },
  { key: 'showcase', label: 'Showcase', emoji: '🎨', helper: 'A workpaper, a completed assignment, a portfolio piece.', bg: 'bg-grape text-white' },
  { key: 'milestone', label: 'Milestone', emoji: '⭐', helper: "Achievements not covered by the LMS auto-poster.", bg: 'bg-sky text-ink' },
]

const MAX_BODY = 2000

export function ComposeForm({ locale }: { locale: 'en' | 'ar' }) {
  const router = useRouter()
  const [kind, setKind] = useState<PostKind>('win')
  const [body, setBody] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = body.trim()
    if (trimmed.length < 4) {
      setError('Body must be at least 4 characters.')
      return
    }
    const tags = tagsStr
      .split(/[\s,#]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6)

    startTransition(async () => {
      try {
        const { handle } = await createPostAction({
          kind,
          body: trimmed,
          tags,
          mediaUrl: mediaUrl,
        })
        router.push(`/${locale}/u/${handle}`)
      } catch (err) {
        setError((err as Error).message || 'Could not post right now.')
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border-2 border-ink bg-white p-6 shadow-pop-md sm:p-8"
    >
      {/* Kind picker */}
      <fieldset>
        <legend className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink/60">
          What kind of post?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {KINDS.map((k) => {
            const selected = kind === k.key
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                style={selected ? { rotate: '-2deg' } : undefined}
                className={
                  selected
                    ? `flex flex-col items-start gap-1 rounded-2xl border-2 border-ink p-3 text-left shadow-pop-sm ${k.bg}`
                    : `flex flex-col items-start gap-1 rounded-2xl border-2 border-ink bg-cream p-3 text-left text-ink transition-all hover:-translate-y-0.5 hover:shadow-pop-xs`
                }
              >
                <span className="text-xl leading-none">{k.emoji}</span>
                <span className="font-display text-sm font-extrabold">{k.label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 rounded-lg border-2 border-dashed border-ink/20 bg-cream px-3 py-2 text-xs font-medium text-ink/70">
          {KINDS.find((k) => k.key === kind)!.helper}
        </p>
      </fieldset>

      {/* Body */}
      <div>
        <label
          htmlFor="body"
          className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink/60"
        >
          Your post
        </label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
          rows={7}
          required
          placeholder="Share what happened, what you're stuck on, or a tip that would've saved past-you a week."
          className="w-full resize-y rounded-2xl border-2 border-ink bg-cream p-4 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink/40 focus:ring-4 focus:ring-brand/25"
        />
        <p className="mt-1 text-right font-mono text-[10px] font-bold uppercase tracking-wider text-ink/50">
          {body.length} / {MAX_BODY}
        </p>
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="tags"
          className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink/60"
        >
          Tags (optional) — up to 6, comma or space separated
        </label>
        <input
          id="tags"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          type="text"
          placeholder="gst, ind-as, career, workpaper"
          className="w-full rounded-2xl border-2 border-ink bg-cream p-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:ring-4 focus:ring-brand/25"
        />
      </div>

      {/* Image upload */}
      <ImageUploader value={mediaUrl} onChange={setMediaUrl} />

      {error && (
        <div className="rounded-2xl border-2 border-coral bg-coral/10 p-3 text-sm font-medium text-coral">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-brand px-6 py-3 text-sm font-bold text-white shadow-pop-sm transition-all hover:-translate-y-0.5 hover:shadow-pop-md active:translate-y-[2px] active:shadow-pop-xs disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Posting…' : 'Post it →'}
        </button>
      </div>
    </form>
  )
}
