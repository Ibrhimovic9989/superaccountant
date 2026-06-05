'use client'

import { useState } from 'react'
import { deriveSlug } from '@/lib/blog/validation'

/**
 * Shared form body for /admin/posts/new and /admin/posts/[id]/edit.
 * Client-only for the slug auto-derive behaviour; the actual save +
 * publish are server actions passed in by the parent.
 */

type FormProps = {
  defaults?: {
    slug?: string
    titleEn?: string
    subtitleEn?: string | null
    metaDescriptionEn?: string
    contentEnMdx?: string
    heroImageUrl?: string | null
    market?: 'india' | 'ksa' | 'global'
    targetKeywords?: string[]
  }
  saveAction: (formData: FormData) => Promise<void>
  publishAction?: ((formData: FormData) => Promise<void>) | undefined
  archiveAction?: ((formData: FormData) => Promise<void>) | undefined
  saveLabel?: string
  showPublish?: boolean
}

export function PostForm({
  defaults = {},
  saveAction,
  publishAction,
  archiveAction,
  saveLabel = 'Save draft',
  showPublish = true,
}: FormProps) {
  const [title, setTitle] = useState(defaults.titleEn ?? '')
  const [slug, setSlug] = useState(defaults.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(defaults.slug))

  function onTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(deriveSlug(value))
  }

  return (
    <form action={saveAction} className="space-y-6">
      <Field label="Title (EN)" required>
        <input
          name="titleEn"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm"
        />
      </Field>

      <Field label="Slug" hint="lowercase, dash-separated">
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            setSlugTouched(true)
          }}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm"
        />
      </Field>

      <Field label="Subtitle (EN)" hint="optional — shown under the title and in cards">
        <input
          name="subtitleEn"
          defaultValue={defaults.subtitleEn ?? ''}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm"
        />
      </Field>

      <Field label="Meta description (EN)" hint="≤ 160 chars works best for SERPs" required>
        <textarea
          name="metaDescriptionEn"
          required
          rows={2}
          defaultValue={defaults.metaDescriptionEn ?? ''}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Market" required>
          <select
            name="market"
            defaultValue={defaults.market ?? 'global'}
            className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm"
          >
            <option value="global">Global</option>
            <option value="india">India</option>
            <option value="ksa">Saudi Arabia (KSA)</option>
          </select>
        </Field>

        <Field label="Target keywords" hint="comma-separated">
          <input
            name="targetKeywords"
            defaultValue={(defaults.targetKeywords ?? []).join(', ')}
            className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm"
          />
        </Field>
      </div>

      <Field label="Hero image URL" hint="optional — used at the top of the article">
        <input
          name="heroImageUrl"
          defaultValue={defaults.heroImageUrl ?? ''}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm"
        />
      </Field>

      <Field label="Content (Markdown / MDX)" required>
        <textarea
          name="contentEnMdx"
          required
          rows={20}
          defaultValue={defaults.contentEnMdx ?? ''}
          className="block w-full rounded-lg border border-border bg-bg px-4 py-3 font-mono text-sm leading-relaxed"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-4 py-2 text-sm font-medium hover:bg-bg-overlay"
        >
          {saveLabel}
        </button>
        {showPublish && publishAction && (
          <button
            type="submit"
            formAction={publishAction}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Publish
          </button>
        )}
        {archiveAction && (
          <button
            type="submit"
            formAction={archiveAction}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-muted hover:text-danger"
          >
            Archive
          </button>
        )}
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-fg">
        {label}
        {required && <span className="text-fg-subtle">*</span>}
        {hint && <span className="ms-auto text-fg-subtle">{hint}</span>}
      </span>
      {children}
    </label>
  )
}
