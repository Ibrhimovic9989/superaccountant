'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Lazy-loads mermaid only on the client. Renders the supplied source into an
 * SVG inside a token-themed Card. Falls back to a code block if parsing fails.
 *
 * Sanitises common LLM-generated mistakes before passing to mermaid:
 *   - <br/> / <br> inside node labels (mermaid only accepts these inside
 *     quoted labels)
 *   - parentheses inside [square brackets] (mermaid parses '(...)' as a
 *     different node shape, so unquoted '(KSA)' inside '[Foo (KSA)]'
 *     turns the whole token into garbage)
 *   - special characters: &, %, /, :, em-dashes
 *
 * If sanitisation still fails, mermaid throws and we render the source as
 * a fallback code block.
 */

function sanitizeMermaid(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []

  for (const raw of lines) {
    let line = raw

    // Replace any node label that's not already quoted with a quoted version.
    // Patterns: A[Label], A(Label), A{Label}, A((Label)), A[[Label]], A[(Label)]
    // We only touch [ ] and { } shapes — round node syntax () IS a label form
    // mermaid expects, so we leave it alone.
    line = line.replace(/([A-Za-z0-9_]+)(\[)([^\]"']*?)(\])/g, (_m, id, open, body, close) => {
      const cleaned = body
        .replace(/<br\s*\/?>/gi, ' — ')
        .replace(/[—–]/g, '-')
        .replace(/"/g, "'")
        .trim()
      // Only quote if there's something risky (paren, slash, colon, &, %, comma)
      const risky = /[()/:&%,]/.test(cleaned)
      return `${id}${open}${risky ? `"${cleaned}"` : cleaned}${close}`
    })

    line = line.replace(/([A-Za-z0-9_]+)(\{)([^}"']*?)(\})/g, (_m, id, open, body, close) => {
      const cleaned = body
        .replace(/<br\s*\/?>/gi, ' — ')
        .replace(/[—–]/g, '-')
        .replace(/"/g, "'")
        .trim()
      const risky = /[()/:&%,]/.test(cleaned)
      return `${id}${open}${risky ? `"${cleaned}"` : cleaned}${close}`
    })

    // Em-dash arrows → ASCII
    line = line.replace(/[—–]>/g, '-->')

    out.push(line)
  }

  return out.join('\n')
}

export function MermaidBlock({ source, id }: { source: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'neutral'>('neutral')

  useEffect(() => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    setTheme(isDark ? 'dark' : 'neutral')
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme,
          securityLevel: 'loose', // allows quoted labels with html-ish chars
          fontFamily: 'inherit',
        })
        const sanitized = sanitizeMermaid(source)
        const { svg } = await mermaid.render(`m-${id}`, sanitized)
        if (!cancelled && ref.current) ref.current.innerHTML = svg
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source, id, theme])

  if (error) {
    return (
      <div className="overflow-x-auto rounded-xl border border-danger/30 bg-danger/10 p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-danger">
          mermaid parse error
        </p>
        <pre className="font-mono text-xs text-danger/80">
          <code>{source}</code>
        </pre>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-bg-elev p-6">
      <div ref={ref} className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" />
    </div>
  )
}
