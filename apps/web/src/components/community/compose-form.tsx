'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Award, HelpCircle, ImageIcon, Lightbulb, Loader2, Trophy } from 'lucide-react'
import { createPostAction } from '@/lib/community/actions'
import type { PostKind } from '@/lib/community/types'
import { cn } from '@/lib/utils'

/**
 * Client-side compose form. Kind picker across the top, textarea in
 * the middle, tags input at the bottom.
 *
 * Deliberately no image upload in this slice — we don't have Supabase
 * Storage wired for community posts yet. Users can paste a URL for
 * now; a proper uploader lands in Week 3 alongside the recruiter
 * portal (both need the same signed-upload primitive).
 */

const KINDS: Array<{ key: PostKind; label: string; helper: string; icon: typeof Trophy; tone: string }> = [
  {
    key: 'win',
    label: 'Win',
    helper: 'A concrete result — a lesson done, a badge, a real workpaper.',
    icon: Trophy,
    tone: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100',
  },
  {
    key: 'ask',
    label: 'Ask',
    helper: 'A question the agent + peers can answer. Great long-tail SEO.',
    icon: HelpCircle,
    tone: 'border-orange-500/50 bg-orange-500/10 text-orange-100',
  },
  {
    key: 'tip',
    label: 'Tip',
    helper: 'Something you learned that saved you time.',
    icon: Lightbulb,
    tone: 'border-blue-500/50 bg-blue-500/10 text-blue-100',
  },
  {
    key: 'showcase',
    label: 'Showcase',
    helper: 'A workpaper, a completed assignment, a portfolio piece.',
    icon: ImageIcon,
    tone: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-100',
  },
  {
    key: 'milestone',
    label: 'Milestone',
    helper: 'Achievements not covered by the LMS auto-poster.',
    icon: Award,
    tone: 'border-blue-500/50 bg-blue-500/10 text-blue-100',
  },
]

const MAX_BODY = 2000

export function ComposeForm({ locale }: { locale: 'en' | 'ar' }) {
  const router = useRouter()
  const [kind, setKind] = useState<PostKind>('win')
  const [body, setBody] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
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
    const media = mediaUrl.trim() || null

    startTransition(async () => {
      try {
        const { handle } = await createPostAction({
          kind,
          body: trimmed,
          tags,
          mediaUrl: media,
        })
        router.push(`/${locale}/u/${handle}`)
      } catch (err) {
        setError((err as Error).message || 'Could not post right now.')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Kind picker */}
      <fieldset>
        <legend className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          What kind of post?
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {KINDS.map((k) => {
            const Icon = k.icon
            const selected = kind === k.key
            return (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors',
                  selected
                    ? k.tone
                    : 'border-border bg-bg-elev text-fg-muted hover:border-border-strong',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{k.label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {KINDS.find((k) => k.key === kind)!.helper}
        </p>
      </fieldset>

      {/* Body */}
      <div>
        <label
          htmlFor="body"
          className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
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
          className="w-full resize-y rounded-xl border border-border bg-bg-elev p-4 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {body.length} / {MAX_BODY}
        </p>
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="tags"
          className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
        >
          Tags (optional) — up to 6, comma or space separated
        </label>
        <input
          id="tags"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          type="text"
          placeholder="gst, ind-as, career, workpaper"
          className="w-full rounded-xl border border-border bg-bg-elev p-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
      </div>

      {/* Media URL */}
      <div>
        <label
          htmlFor="mediaUrl"
          className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
        >
          Image URL (optional) — direct hotlink for now
        </label>
        <input
          id="mediaUrl"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          type="url"
          placeholder="https://…"
          className="w-full rounded-xl border border-border bg-bg-elev p-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          Uploader lands next week — paste any public image URL for now.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}
