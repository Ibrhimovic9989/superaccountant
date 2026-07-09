'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { createCommentAction } from '@/lib/community/actions'
import type { CommentView } from '@/lib/community/types'

/**
 * Comment thread with an inline composer at the bottom for signed-in
 * viewers. Optimistic-append: the comment shows up immediately with a
 * "sending…" opacity, then either promotes to full opacity or rolls
 * back on error.
 *
 * No threading (yet). Flat list. Handles LinkedIn-scale conversation
 * without needing tree state.
 */

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  const min = Math.round((Date.now() - t) / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export function CommentThread({
  postId,
  comments,
  locale,
  signedIn,
}: {
  postId: string
  comments: CommentView[]
  locale: 'en' | 'ar'
  signedIn: boolean
}) {
  const [items, setItems] = useState(comments)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [_, startTransition] = useTransition()

  const onSubmit = async (formData: FormData) => {
    const body = String(formData.get('body') || '').trim()
    if (body.length === 0) return
    const tempId = `tmp_${Math.random().toString(36).slice(2, 10)}`
    const optimistic: CommentView = {
      id: tempId,
      body,
      createdAt: new Date().toISOString(),
      author: {
        id: 'viewer',
        handle: 'you',
        name: 'You',
        avatarUrl: null,
        tone: 'accent',
        verified: false,
        headline: null,
      },
    }
    setItems((prev) => [...prev, optimistic])
    setPending(tempId)
    setError(null)
    startTransition(async () => {
      try {
        await createCommentAction({ postId, body })
        // Server bumped commentCount; the parent page will refetch on next
        // navigation. For now clear the pending marker.
        setPending(null)
      } catch (e) {
        setError((e as Error).message || 'Comment failed')
        setItems((prev) => prev.filter((c) => c.id !== tempId))
        setPending(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-ink bg-white p-6 text-center text-sm font-semibold text-ink/60">
          Be the first to reply.
        </p>
      )}
      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.id}
            className={`rounded-2xl border-2 border-ink bg-white p-4 shadow-pop-xs ${
              pending === c.id ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <Link
                href={`/${locale}/u/${c.author.handle}`}
                className="font-display font-extrabold text-ink hover:text-brand"
              >
                {c.author.name}
              </Link>
              <span className="font-mono text-[10px] font-bold text-ink/50">
                @{c.author.handle} · {timeAgo(c.createdAt)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
              {c.body}
            </p>
          </li>
        ))}
      </ul>

      {signedIn ? (
        <form action={onSubmit} className="rounded-2xl border-2 border-ink bg-white p-4 shadow-pop-sm">
          <label htmlFor="comment-body" className="sr-only">
            Comment
          </label>
          <textarea
            id="comment-body"
            name="body"
            required
            maxLength={1000}
            rows={2}
            placeholder="Add a comment…"
            className="w-full resize-y bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
          <div className="mt-2 flex items-center justify-between">
            {error ? (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-coral">
                {error}
              </span>
            ) : (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/50">
                Max 1000 characters
              </span>
            )}
            <button
              type="submit"
              className="rounded-full border-2 border-ink bg-brand px-4 py-1.5 text-xs font-bold text-white shadow-pop-xs transition-all hover:-translate-y-0.5 hover:shadow-pop-sm active:translate-y-[2px]"
            >
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl border-2 border-ink bg-white p-4 text-center text-sm font-semibold text-ink/60 shadow-pop-xs">
          <Link href={`/${locale}/sign-in`} className="font-bold text-brand underline decoration-2 underline-offset-4">
            Sign in
          </Link>{' '}
          to add a comment.
        </p>
      )}
    </div>
  )
}
