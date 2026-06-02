/**
 * Suggest a concrete rewrite for a flagged mermaid source.
 *
 * Strategy:
 *   - Always force explicit `flowchart LR` orientation.
 *   - Quote any [body] / {body} containing risky chars: () / : & % , <br>.
 *   - If nodeCount > 12, split into smaller charts:
 *       * prefer splitting on `subgraph` boundaries when present
 *       * otherwise split body into roughly equal halves
 *   - If hasUnusualType (sequenceDiagram etc.) discard the original type
 *     line and prepend `flowchart LR`.
 *
 * Returns one or more mermaid sources representing the rewrite.
 */

/**
 * @param {{ source: string, score: { nodeCount: number, hasUnusualType: boolean, noOrientation: boolean } }} b
 * @returns {string[]}
 */
export function suggestRewrite(b) {
  const lines = b.source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'))

  /** @param {string} ln */
  const fixLine = (ln) => {
    let l = ln
    l = l.replace(/(\[)([^\]"']+)(\])/g, (_m, o, body, c) => {
      const risky = /[()/:&%,]/.test(body) || body.includes('<br')
      const cleaned = body.replace(/<br\s*\/?>/gi, ' — ').replace(/[—–]/g, '-').trim()
      return o + (risky ? `"${cleaned}"` : cleaned) + c
    })
    l = l.replace(/(\{)([^}"']+)(\})/g, (_m, o, body, c) => {
      const risky = /[()/:&%,]/.test(body) || body.includes('<br')
      const cleaned = body.replace(/<br\s*\/?>/gi, ' — ').replace(/[—–]/g, '-').trim()
      return o + (risky ? `"${cleaned}"` : cleaned) + c
    })
    return l
  }

  const fixed = lines.map(fixLine)

  if (!/^(flowchart|graph)\s+/.test(fixed[0] ?? '')) {
    if (/^(flowchart|graph)\b/.test(fixed[0] ?? '')) {
      fixed[0] = fixed[0].replace(/^(flowchart|graph)\b.*$/, 'flowchart LR')
    } else if (b.score.hasUnusualType) {
      fixed.shift()
      fixed.unshift('flowchart LR')
    } else {
      fixed.unshift('flowchart LR')
    }
  } else if (b.score.noOrientation) {
    fixed[0] = 'flowchart LR'
  }

  if (b.score.nodeCount <= 12) return [fixed.join('\n')]

  const header = fixed[0]
  const body = fixed.slice(1)

  // Split on `subgraph` blocks when there are multiple.
  /** @type {{header: string, body: string[]}[]} */
  const subgraphChunks = []
  /** @type {{header: string, body: string[]} | null} */
  let current = null
  for (const ln of body) {
    if (/^subgraph\b/.test(ln)) {
      if (current) subgraphChunks.push(current)
      current = { header: ln, body: [] }
    } else if (/^end\b/.test(ln) && current) {
      subgraphChunks.push(current)
      current = null
    } else if (current) {
      current.body.push(ln)
    }
  }

  if (subgraphChunks.length >= 2) {
    return subgraphChunks.map((c, i) => {
      const title = c.header.replace(/^subgraph\s+/, '').replace(/\[|\]/g, '')
      return [header, `%% Part ${i + 1} of ${subgraphChunks.length}: ${title}`, ...c.body].join('\n')
    })
  }

  // Even split fallback.
  const half = Math.ceil(body.length / 2)
  return [
    [header, '%% Part 1 of 2', ...body.slice(0, half)].join('\n'),
    [header, '%% Part 2 of 2', ...body.slice(half)].join('\n'),
  ]
}

/**
 * Prose explanation of why a block was flagged.
 * @param {{ score: any }} b
 */
export function explainBlock(b) {
  const s = b.score
  const reasons = []
  if (s.nodeCount > 12) {
    reasons.push(
      `${s.nodeCount} distinct nodes in a single diagram exceeds the readability threshold (~12). ` +
        `At this density the renderer either overflows the viewport or compresses the layout until labels collide — both of which match the strategy-review complaint that flowcharts are "messy and cluttered".`,
    )
  }
  if (s.lineCount > 20) {
    reasons.push(
      `${s.lineCount} non-blank source lines is well past the "single screen of source" rule; long sources correlate strongly with diagrams the LLM intended to be a checklist, not a chart.`,
    )
  }
  if (s.unquotedParensInSquares > 0) {
    reasons.push(
      `${s.unquotedParensInSquares} \`[label (qualifier)]\` pattern(s) with bare parens — mermaid parses the inner \`(\` as a different shape and the rendered label fragments. The runtime sanitiser catches some of these but not all positions.`,
    )
  }
  if (s.unquotedSpecialChars > 0) {
    reasons.push(
      `${s.unquotedSpecialChars} unquoted special character(s) (one of \`& % / : — –\`) inside label bodies — these either break the parser or get HTML-escaped into noise.`,
    )
  }
  if (s.subgraphCount > 3) {
    reasons.push(
      `${s.subgraphCount} subgraphs in one diagram produce a nested rectangle soup that the curve='basis' renderer routes poorly.`,
    )
  }
  if (s.noOrientation) {
    reasons.push(
      `No explicit \`flowchart LR/TD\` orientation — defaults to top-down and produces a tall, narrow column that's awkward inside a content card.`,
    )
  }
  if (s.hasUnusualType) {
    reasons.push(
      `Diagram type is \`${s.chartType}\` — the recent font-size lift on the lesson page targets flowcharts; sequence/gantt diagrams keep their stock 14px text and look out-of-place next to the rest of the lesson.`,
    )
  }
  return reasons.join(' ') || 'Score is composed of small contributions from multiple heuristics; no single dominant issue.'
}

/**
 * Brief one-liner fix suggestion for offenders past the top 5.
 * @param {{ score: any }} b
 */
export function briefFix(b) {
  const tips = []
  if (b.score.noOrientation) tips.push('add `flowchart LR` as the first line')
  if (b.score.unquotedParensInSquares > 0) tips.push('quote every `[Label (qualifier)]` body')
  if (b.score.nodeCount > 12) tips.push(`split into ${Math.ceil(b.score.nodeCount / 8)} smaller charts`)
  if (b.score.hasUnusualType) tips.push('convert to `flowchart LR`')
  if (b.score.unquotedSpecialChars > 0) tips.push('wrap special-char labels in `"..."`')
  return tips.length ? `${tips.join('; ')}.` : 'manual cleanup required.'
}
