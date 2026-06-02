/**
 * Scoring heuristics for a single mermaid source.
 * Pure functions, no I/O. Returns a score breakdown + flags + total.
 */

/** @param {string} src */
export function detectChartType(src) {
  const firstLine =
    src.split('\n').map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith('%%')) ?? ''
  const cleaned = firstLine.replace(/^%%\{[^}]*\}%%/, '').trim()
  const m = /^(flowchart|graph|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|mindmap|journey|pie|gitGraph|requirementDiagram)\b/.exec(
    cleaned,
  )
  return m ? m[1] : 'unknown'
}

/** @param {string} src */
export function hasExplicitOrientation(src) {
  const firstLine =
    src.split('\n').map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith('%%')) ?? ''
  return /^(flowchart|graph)\s+(LR|TD|TB|BT|RL)\b/.test(firstLine)
}

/** @param {string} src */
export function countNodes(src) {
  const ids = new Set()
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('%%')) continue
    if (/^(flowchart|graph)\b/.test(line)) continue
    if (/^(subgraph|end|direction|classDef|class|style|linkStyle|click)\b/.test(line)) continue
    // identifier immediately followed by a shape opener
    for (const m of line.matchAll(/([A-Za-z][A-Za-z0-9_]*)\s*(\[\[|\(\(|\[\(|\[|\(|\{)/g)) {
      ids.add(m[1])
    }
    // identifiers around arrows
    const arrowSplit = line.split(/-->|--x|--o|<--|-\.->|==>|--\|.*?\|-->?/)
    if (arrowSplit.length > 1) {
      for (const part of arrowSplit) {
        const idMatch = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*$/.exec(part)
        if (idMatch) ids.add(idMatch[1])
      }
    }
  }
  return ids.size
}

/** @param {string} src */
export function countLines(src) {
  return src.split('\n').filter((l) => {
    const t = l.trim()
    return t.length > 0 && !t.startsWith('%%')
  }).length
}

/** @param {string} src */
export function countUnquotedParensInSquares(src) {
  let n = 0
  const re = /\[([^\]]*)\]/g
  let m
  while ((m = re.exec(src)) !== null) {
    const body = m[1]
    if (/^\s*".*"\s*$/.test(body) || /^\s*'.*'\s*$/.test(body)) continue
    if (body.includes('(') || body.includes(')')) n++
  }
  return n
}

/** @param {string} src */
export function countUnquotedSpecialChars(src) {
  let n = 0
  for (const re of [/\[([^\]]*)\]/g, /\{([^}]*)\}/g]) {
    let m
    while ((m = re.exec(src)) !== null) {
      const body = m[1]
      if (/^\s*".*"\s*$/.test(body) || /^\s*'.*'\s*$/.test(body)) continue
      const matches = body.match(/[&%/:—–]/g)
      if (matches) n += matches.length
    }
  }
  return n
}

/** @param {string} src */
export function countSubgraphs(src) {
  const matches = src.match(/^\s*subgraph\b/gm)
  return matches ? matches.length : 0
}

/** @param {string} src */
export function scoreSource(src) {
  const chartType = detectChartType(src)
  const nodeCount = countNodes(src)
  const lineCount = countLines(src)
  const unquotedParensInSquares = countUnquotedParensInSquares(src)
  const unquotedSpecialChars = countUnquotedSpecialChars(src)
  const subgraphCount = countSubgraphs(src)
  const isFlowchartish = chartType === 'flowchart' || chartType === 'graph'
  const noOrientation = isFlowchartish && !hasExplicitOrientation(src)
  const hasUnusualType = ['sequenceDiagram', 'gantt', 'classDiagram'].includes(chartType)

  const breakdown = {
    nodeCount: Math.max(0, (nodeCount - 12) * 2),
    lineCount: Math.max(0, (lineCount - 20) * 1.5),
    unquotedParensInSquares: unquotedParensInSquares * 5,
    unquotedSpecialChars: unquotedSpecialChars * 2,
    hasDisconnectedSubgraphs: subgraphCount > 3 ? (subgraphCount - 3) * 4 : 0,
    noOrientation: noOrientation ? 3 : 0,
    hasUnusualType: hasUnusualType ? 5 : 0,
  }
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  const flags = []
  if (nodeCount > 12) flags.push(`nodes=${nodeCount}`)
  if (lineCount > 20) flags.push(`lines=${lineCount}`)
  if (unquotedParensInSquares > 0) flags.push(`unq-parens=${unquotedParensInSquares}`)
  if (unquotedSpecialChars > 0) flags.push(`unq-specials=${unquotedSpecialChars}`)
  if (subgraphCount > 3) flags.push(`subgraphs=${subgraphCount}`)
  if (noOrientation) flags.push('no-orientation')
  if (hasUnusualType) flags.push(`type=${chartType}`)

  return {
    chartType,
    nodeCount,
    lineCount,
    unquotedParensInSquares,
    unquotedSpecialChars,
    subgraphCount,
    noOrientation,
    hasUnusualType,
    breakdown,
    total: Math.round(total * 10) / 10,
    flags,
  }
}
