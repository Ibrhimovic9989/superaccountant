/**
 * FAQPage JSON-LD emitter.
 *
 * Scans an MDX body for "question-shaped" H2 headings — anything that
 * ends in a `?` or starts with an interrogative like What / How / Why —
 * and emits a schema.org `FAQPage` blob when we find at least 3 of
 * them together. Google's FAQ rich result promotes each Q as a
 * separate SERP row, which is one of the highest-CTR enhancements
 * available for a text-heavy blog.
 *
 * The answer body is the raw text between that H2 and the next
 * heading, capped at 700 chars because Google truncates longer
 * answers and inflating them just makes the schema noisy.
 *
 * Renders `null` (no script tag) if fewer than the minimum number of
 * question-shaped H2s are found. Silent no-op — safe to include on
 * every post unconditionally.
 */

const MIN_FAQ_QUESTIONS = 3
const MAX_ANSWER_CHARS = 700

const INTERROGATIVE_PREFIXES = [
  'what', 'how', 'why', 'when', 'where', 'who', 'which',
  'can', 'is', 'are', 'do', 'does', 'should', 'will', 'would',
]

export function FaqJsonLd({ mdx }: { mdx: string }) {
  const faqs = extractFaqs(mdx)
  if (faqs.length < MIN_FAQ_QUESTIONS) return null

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered, static JSON-LD
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}

export function extractFaqs(mdx: string): Array<{ question: string; answer: string }> {
  if (!mdx) return []
  // Drop fenced code so `## Q?` inside a code sample doesn't count.
  const stripped = mdx.replace(/```[\s\S]*?```/g, '')
  const lines = stripped.split(/\r?\n/)
  const faqs: Array<{ question: string; answer: string }> = []

  let currentQ: string | null = null
  let buffer: string[] = []
  const flush = () => {
    if (currentQ === null) return
    const answer = plainText(buffer.join(' ')).trim()
    if (answer.length >= 40) {
      faqs.push({ question: currentQ, answer: truncate(answer, MAX_ANSWER_CHARS) })
    }
    currentQ = null
    buffer = []
  }

  for (const line of lines) {
    const h = /^\s*(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (h) {
      flush()
      const level = h[1]?.length ?? 0
      const text = stripInline(h[2] ?? '')
      if (level === 2 && isQuestion(text)) {
        currentQ = text
      }
      continue
    }
    if (currentQ !== null && line.trim().length > 0) {
      buffer.push(line)
    }
  }
  flush()
  return faqs
}

function isQuestion(s: string): boolean {
  const t = s.trim().toLowerCase()
  if (t.endsWith('?')) return true
  const first = t.split(/\s+/)[0] ?? ''
  return INTERROGATIVE_PREFIXES.includes(first)
}

function stripInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

/** Turn one paragraph of MDX into plain text an FAQ Answer will accept. */
function plainText(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
