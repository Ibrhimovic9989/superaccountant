'use client'
import { FileDown, Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'

/**
 * Client-side "Generate PDF" button. Calls the parent's server action,
 * surfaces the returned URL, and pops the PDF in a new tab.
 */
export function GenerateCurveButton({
  generate,
}: {
  generate: () => Promise<{ pdfUrl: string; reused: boolean } | { error: string }>
}) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; pdfUrl: string; reused: boolean }
    | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onClick() {
    setResult({ kind: 'idle' })
    start(async () => {
      const r = await generate()
      if ('error' in r) {
        setResult({ kind: 'err', error: r.error })
        return
      }
      setResult({ kind: 'ok', pdfUrl: r.pdfUrl, reused: r.reused })
      // Open immediately for admin convenience.
      if (typeof window !== 'undefined') window.open(r.pdfUrl, '_blank', 'noopener')
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {pending ? 'Generating…' : 'Generate PDF'}
      </button>
      {result.kind === 'ok' && (
        <p className="text-xs text-fg-muted">
          {result.reused ? 'Reused report generated in the last 24h. ' : 'New report generated. '}
          <a
            href={result.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Open PDF
          </a>
        </p>
      )}
      {result.kind === 'err' && <p className="text-xs text-danger">{result.error}</p>}
    </div>
  )
}
