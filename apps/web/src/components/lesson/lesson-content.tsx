'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders the stored MDX body. Our generation pipeline produces plain Markdown
 * (no JSX components), so react-markdown + remark-gfm is enough — no MDX
 * compile step needed. Tables, fenced code, task lists all work.
 */
export function LessonContent({ markdown }: { markdown: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  )
}
