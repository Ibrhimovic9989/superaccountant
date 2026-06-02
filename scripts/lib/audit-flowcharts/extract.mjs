/**
 * Extracts mermaid sources from a single CurriculumLesson row.
 *
 * Sources scanned:
 *   1. flowchartMermaid column (dedicated)
 *   2. mindmapMermaid column (dedicated)
 *   3. ```mermaid``` fenced blocks inside contentEnMdx
 *   4. ```mermaid``` fenced blocks inside contentArMdx
 */

/**
 * @param {{ flowchartMermaid?: string|null, mindmapMermaid?: string|null, contentEnMdx?: string|null, contentArMdx?: string|null }} lesson
 * @returns {{ origin: string, source: string }[]}
 */
export function extractMermaidSources(lesson) {
  /** @type {{ origin: string, source: string }[]} */
  const out = []

  if (lesson.flowchartMermaid && lesson.flowchartMermaid.trim()) {
    out.push({ origin: 'flowchartMermaid', source: lesson.flowchartMermaid.trim() })
  }
  if (lesson.mindmapMermaid && lesson.mindmapMermaid.trim()) {
    out.push({ origin: 'mindmapMermaid', source: lesson.mindmapMermaid.trim() })
  }

  const fenceRe = /```mermaid\s*\n([\s\S]*?)```/g
  for (const [origin, text] of /** @type {const} */ ([
    ['contentEnMdx', lesson.contentEnMdx ?? ''],
    ['contentArMdx', lesson.contentArMdx ?? ''],
  ])) {
    let i = 0
    fenceRe.lastIndex = 0
    let match
    while ((match = fenceRe.exec(text)) !== null) {
      i++
      out.push({ origin: `${origin}#${i}`, source: match[1].trim() })
    }
  }

  return out
}
