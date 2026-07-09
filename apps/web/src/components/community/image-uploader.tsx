'use client'

import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { signCommunityUploadAction } from '@/lib/community/upload-actions'
import { cn } from '@/lib/utils'

/**
 * Drop-in image uploader for the compose form.
 *
 * Flow:
 *   1. User picks a file (drag/drop or click).
 *   2. Validate client-side (mime + size) so a bad pick fails fast.
 *   3. Ask the server to mint a signed upload URL.
 *   4. PUT the file straight to Supabase Storage using the returned
 *      token — no proxy through Vercel.
 *   5. Once uploaded, call onUploaded(publicUrl) so the parent form
 *      can persist the URL on submit.
 *
 * Preview shown from a local object URL until the upload finishes,
 * then switches to the CDN URL so we're not holding the blob in
 * memory.
 */

const MAX_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function ImageUploader({
  value,
  onChange,
}: {
  /** Current public URL (or null when nothing uploaded). */
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [preview, setPreview] = useState<string | null>(value)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [pending, startTransition] = useTransition()

  const openPicker = () => inputRef.current?.click()

  const handleFile = (file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, WebP, or GIF images are supported.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_MB} MB.`)
      return
    }

    // Show a local preview immediately.
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setProgress(1)

    startTransition(async () => {
      const signed = await signCommunityUploadAction({
        contentType: file.type,
        size: file.size,
      })
      if (!signed.ok) {
        setError(signed.error)
        setPreview(null)
        setProgress(0)
        URL.revokeObjectURL(localUrl)
        return
      }
      try {
        await putWithProgress({
          url: signed.uploadUrl,
          token: signed.token,
          file,
          onProgress: (pct) => setProgress(Math.max(1, pct)),
        })
        // Switch preview to the CDN URL so we can drop the blob.
        setPreview(signed.publicUrl)
        URL.revokeObjectURL(localUrl)
        onChange(signed.publicUrl)
        setProgress(100)
      } catch (err) {
        setError((err as Error).message || 'Upload failed. Try again.')
        setPreview(null)
        setProgress(0)
        URL.revokeObjectURL(localUrl)
      }
    })
  }

  const clear = () => {
    setPreview(null)
    setError(null)
    setProgress(0)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        Image (optional) — JPG / PNG / WebP / GIF · max {MAX_MB} MB
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        className="sr-only"
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-elev">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="max-h-72 w-full object-cover" />
          <div className="flex items-center justify-between border-t border-border bg-bg-elev p-2">
            <span className="ms-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {progress > 0 && progress < 100 ? `Uploading ${progress}%` : 'Uploaded'}
            </span>
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted hover:border-danger/50 hover:text-danger"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-bg-elev p-8 text-fg-muted transition-colors',
            'hover:border-accent hover:bg-accent-soft/40 hover:text-fg',
            pending && 'pointer-events-none opacity-70',
          )}
        >
          {pending ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">Drop an image or click to select</span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                <Upload className="me-1 inline h-3 w-3" />
                Direct upload · never touches our servers
              </span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * PUT with progress via XMLHttpRequest — the modern fetch() doesn't
 * expose upload progress until Streams-write lands broadly, and even
 * then it's a bigger dance than XHR for the same result.
 */
function putWithProgress(args: {
  url: string
  token: string
  file: File
  onProgress: (pct: number) => void
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', args.url, true)
    // Supabase signed-upload endpoint expects the token as `authorization`.
    xhr.setRequestHeader('Authorization', `Bearer ${args.token}`)
    xhr.setRequestHeader('x-upsert', 'true')
    xhr.setRequestHeader('Content-Type', args.file.type)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        args.onProgress(Math.round((e.loaded / e.total) * 99))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload returned ${xhr.status}: ${xhr.responseText.slice(0, 120)}`))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(args.file)
  })
}
