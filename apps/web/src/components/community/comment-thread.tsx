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
        <p className="rounded-xl border border-dashed border-border bg-bg-elev p-6 text-center text-sm text-fg-muted">
          Be the first to reply.
        </p>
      )}
      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.id}
            className={`rounded-xl border border-border bg-bg-elev p-4 ${
              pending === c.id ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <Link
                href={`/${locale}/u/${c.author.handle}`}
                className="font-medium text-fg hover:text-accent"
              >
                {c.author.name}
              </Link>
              <span className="font-mono text-[10px] text-fg-subtle">
                @{c.author.handle} · {timeAgo(c.createdAt)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{c.body}</p>
          </li>
        ))}
      </ul>

      {signedIn ? (
        <form action={onSubmit} className="rounded-xl border border-border bg-bg-elev p-4">
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
            className="w-full resize-y bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <div className="mt-2 flex items-center justify-between">
            {error ? (
              <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
                {error}
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                Max 1000 characters
              </span>
            )}
            <button
              type="submit"
              className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg hover:opacity-90"
            >
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl border border-border bg-bg-elev p-4 text-center text-sm text-fg-muted">
          <Link href={`/${locale}/sign-in`} className="text-accent hover:underline">
            Sign in
          </Link>{' '}
          to add a comment.
        </p>
      )}
    </div>
  )
}
