'use client'

import { Film, ImagePlus, Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { signCommunityUploadAction } from '@/lib/community/upload-actions'
import { mediaKind } from '@/lib/community/media'
import { cn } from '@/lib/utils'

/**
 * Drop-in media uploader for the compose form — images AND short
 * videos. The file input keeps its "ImageUploader" name because it's
 * imported everywhere; the class handles both kinds under the hood
 * (see the `contentType` allowlist below).
 *
 * Flow:
 *   1. User picks a file (drag/drop or click).
 *   2. Validate client-side (mime + size) so a bad pick fails fast.
 *   3. Ask the server to mint a signed upload URL.
 *   4. PUT the file straight to Supabase Storage using the returned
 *      token — no proxy through Vercel.
 *   5. Once uploaded, call onChange(publicUrl) so the parent form
 *      can persist the URL on submit.
 *
 * Preview shown from a local object URL until the upload finishes,
 * then switches to the CDN URL so we're not holding the blob in
 * memory.
 */

const IMAGE_MAX_MB = 5
const VIDEO_MAX_MB = 50
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]

function limitForType(type: string): number {
  return type.startsWith('video/') ? VIDEO_MAX_MB : IMAGE_MAX_MB
}

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
  const [previewKind, setPreviewKind] = useState<'image' | 'video' | null>(mediaKind(value))
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [pending, startTransition] = useTransition()

  const openPicker = () => inputRef.current?.click()

  const handleFile = (file: File) => {
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, WebP, GIF images or MP4 / WebM / MOV videos are supported.')
      return
    }
    const cap = limitForType(file.type)
    if (file.size > cap * 1024 * 1024) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${cap} MB.`)
      return
    }

    // Show a local preview immediately.
    const localUrl = URL.createObjectURL(file)
    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    setPreview(localUrl)
    setPreviewKind(kind)
    setProgress(1)

    startTransition(async () => {
      const signed = await signCommunityUploadAction({
        contentType: file.type,
        size: file.size,
      })
      if (!signed.ok) {
        setError(signed.error)
        setPreview(null)
        setPreviewKind(null)
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
        setPreviewKind(signed.kind)
        URL.revokeObjectURL(localUrl)
        onChange(signed.publicUrl)
        setProgress(100)
      } catch (err) {
        setError((err as Error).message || 'Upload failed. Try again.')
        setPreview(null)
        setPreviewKind(null)
        setProgress(0)
        URL.revokeObjectURL(localUrl)
      }
    })
  }

  const clear = () => {
    setPreview(null)
    setPreviewKind(null)
    setError(null)
    setProgress(0)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        Media (optional) — image (≤{IMAGE_MAX_MB} MB) · video (≤{VIDEO_MAX_MB} MB)
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
          {previewKind === 'video' ? (
            <video
              src={preview}
              className="max-h-72 w-full object-cover"
              controls
              playsInline
              muted
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="Preview" className="max-h-72 w-full object-cover" />
          )}
          <div className="flex items-center justify-between border-t border-border bg-bg-elev p-2">
            <span className="ms-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {previewKind === 'video' && <Film className="h-3 w-3" />}
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
              <div className="flex items-center gap-3">
                <ImagePlus className="h-6 w-6" />
                <span className="text-fg-subtle">/</span>
                <Film className="h-6 w-6" />
              </div>
              <span className="text-sm">Drop an image or video, or click to select</span>
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
