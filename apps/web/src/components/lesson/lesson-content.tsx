import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders the stored MDX body. Server-component-safe (no hooks, no
 * 'use client') so if a future caller renders it from an RSC the
 * markdown ships as static HTML. Today it's imported by lesson-shell
 * which is a client component, so it still ends up in the client
 * bundle — but the dependency direction stays correct.
 *
 * Our generation pipeline produces plain Markdown (no JSX components),
 * so react-markdown + remark-gfm is enough — no MDX compile step.
 * Tables, fenced code, task lists all work.
 */
export function LessonContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  )
}
