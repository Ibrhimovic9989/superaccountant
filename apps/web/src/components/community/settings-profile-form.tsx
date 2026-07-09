'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateHandleAction, updateProfileMetaAction } from '@/lib/community/actions'
import type { ProfileTone, ProfileVisibility } from '@/lib/community/types'
import { cn } from '@/lib/utils'

/**
 * /settings/profile client form. Two forms in one card:
 *   1. Handle change (one-time; disabled after use).
 *   2. Bio + tone + visibility.
 *
 * Kept separate submits so a botched bio doesn't accidentally consume
 * the one handle edit the user has.
 */

const TONES: Array<{ key: ProfileTone; label: string; swatch: string }> = [
  { key: 'accent', label: 'Royal blue', swatch: 'bg-blue-600' },
  { key: 'brand', label: 'Cyan brand', swatch: 'bg-cyan-500' },
  { key: 'grape', label: 'Grape', swatch: 'bg-violet-500' },
  { key: 'coral', label: 'Coral', swatch: 'bg-orange-500' },
  { key: 'mint', label: 'Mint', swatch: 'bg-emerald-500' },
  { key: 'blush', label: 'Blush', swatch: 'bg-rose-400' },
  { key: 'ink', label: 'Ink', swatch: 'bg-slate-700' },
]

const VISIBILITY_OPTIONS: Array<{ key: ProfileVisibility; label: string; helper: string }> = [
  {
    key: 'public',
    label: 'Public',
    helper: 'Anyone can view. Discoverable via search + shareable link — best for recruiter visibility.',
  },
  {
    key: 'members',
    label: 'Members only',
    helper: 'Only signed-in SuperAccountant users see your profile.',
  },
  {
    key: 'hidden',
    label: 'Hidden',
    helper: 'Only you can view. Auto-posts still fire but stay private.',
  },
]

export function SettingsProfileForm({
  initialHandle,
  handleEditsRemaining,
  initialBio,
  initialTone,
  initialVisibility,
}: {
  initialHandle: string
  handleEditsRemaining: number
  initialBio: string
  initialTone: ProfileTone
  initialVisibility: ProfileVisibility
}) {
  const [handle, setHandle] = useState(initialHandle)
  const [bio, setBio] = useState(initialBio)
  const [tone, setTone] = useState<ProfileTone>(initialTone)
  const [visibility, setVisibility] = useState<ProfileVisibility>(initialVisibility)
  const [handleMsg, setHandleMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [metaMsg, setMetaMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const handleLocked = handleEditsRemaining <= 0

  const submitHandle = () => {
    setHandleMsg(null)
    startTransition(async () => {
      const result = await updateHandleAction({ handle })
      if (result.ok) {
        setHandleMsg({ ok: true, text: `Handle set to @${result.handle}. This is permanent.` })
      } else {
        setHandleMsg({ ok: false, text: result.error })
      }
    })
  }

  const submitMeta = () => {
    setMetaMsg(null)
    startTransition(async () => {
      try {
        await updateProfileMetaAction({ bio, tone, visibility })
        setMetaMsg({ ok: true, text: 'Profile saved.' })
      } catch (err) {
        setMetaMsg({ ok: false, text: (err as Error).message || 'Could not save' })
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Handle ────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold">Handle</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {handleLocked
              ? "Handle changes are one-time. You've already used yours."
              : 'You can change your handle once. After that it becomes permanent — pick carefully.'}
          </p>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg p-3 text-sm">
            <span className="font-mono text-fg-subtle">app.superaccountant.in/u/</span>
            <input
              type="text"
              disabled={handleLocked}
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              maxLength={24}
              className={cn(
                'w-40 bg-transparent font-mono text-fg outline-none placeholder:text-fg-subtle',
                handleLocked && 'text-fg-muted',
              )}
            />
          </div>
          <button
            type="button"
            onClick={submitHandle}
            disabled={pending || handleLocked || handle === initialHandle}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            {handleLocked ? 'Locked' : 'Save handle'}
          </button>
        </div>
        {handleMsg && (
          <p
            className={cn(
              'mt-3 rounded-lg border px-3 py-2 text-xs',
              handleMsg.ok
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-danger/40 bg-danger/10 text-danger',
            )}
          >
            {handleMsg.text}
          </p>
        )}
      </section>

      {/* ── Bio + tone + visibility ─────────────────────────── */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold">Profile</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Bio, cover colour, and who can see your profile.
          </p>
        </header>

        <label htmlFor="bio" className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 200))}
          rows={3}
          placeholder="One sentence: what you're learning, where you're headed."
          className="w-full resize-y rounded-xl border border-border bg-bg p-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {bio.length} / 200
        </p>

        <p className="mb-2 mt-4 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Cover colour
        </p>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTone(t.key)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
                tone === t.key
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg text-fg-muted hover:border-border-strong',
              )}
            >
              <span className={cn('h-3 w-3 rounded-full', t.swatch)} />
              {t.label}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          Visibility
        </p>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((v) => (
            <label
              key={v.key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3',
                visibility === v.key
                  ? 'border-accent bg-accent/5'
                  : 'border-border bg-bg hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === v.key}
                onChange={() => setVisibility(v.key)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{v.label}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{v.helper}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={submitMeta}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            Save changes
          </button>
        </div>

        {metaMsg && (
          <p
            className={cn(
              'mt-3 rounded-lg border px-3 py-2 text-xs',
              metaMsg.ok
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-danger/40 bg-danger/10 text-danger',
            )}
          >
            {metaMsg.text}
          </p>
        )}
      </section>
    </div>
  )
}
