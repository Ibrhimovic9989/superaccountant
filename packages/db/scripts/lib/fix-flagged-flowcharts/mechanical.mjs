/**
 * Mechanical sanitization passes for mermaid source.
 *
 * These mirror what `apps/web/src/components/lesson/mermaid-block.tsx`
 * does at render time — applied here at REST so a renderer change can't
 * silently reintroduce the bug.
 *
 * Pure functions, no I/O. Each pass is independently testable. Composed
 * by `applyMechanicalFixes` in this file's order so the whole pipeline
 * is a fixed point (re-running on cleaned input is a no-op).
 *
 * Rules (per the fix-pass brief):
 *   1. Quote labels with `(` / `)` inside `[ ]` and `{ }` shapes
 *   2. Quote labels with `& % / : —` inside `[ ]` and `{ }`
 *   3. Replace `—>` / `–>` arrows with `-->`; em-dashes inside quoted
 *      labels stay (mermaid renders them fine when quoted)
 *   4. Add a default `flowchart LR` orientation when a flowchart/graph
 *      block has none (mindmaps don't take orientation — skipped)
 *   5. Replace `<br/>` / `<br>` inside UNQUOTED labels with ` — `
 *      (inside quoted labels mermaid handles them itself — leave alone)
 */

const SHAPE_OPENERS = /** @type {const} */ ([
  ['[', ']'],
  ['{', '}'],
])

/** A label is "risky" (needs quoting) if it contains any of these. */
const RISKY_CHARS = /[()/:&%]/
/** Special chars that should trigger quoting on their own. */
const SPECIAL_CHARS = /[&%/:—–]/

/**
 * @param {string} body  raw text inside the bracket
 * @returns {boolean}
 */
function isAlreadyQuoted(body) {
  const t = body.trim()
  return (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  )
}

/**
 * Rule 1+2+5: walk every `id[...]` and `id{...}` token; if the body has
 * `( )`, a special char, or a `<br/>`, quote the body (after rewriting
 * `<br/>` to ` — `). Skip already-quoted bodies — that's the idempotency
 * hook.
 *
 * @param {string} src
 */
export function quoteRiskyLabels(src) {
  let out = src
  for (const [open, close] of SHAPE_OPENERS) {
    // ` id` then opener then any non-closer content then closer.
    // Body intentionally non-greedy and excludes the opening char of
    // the next shape so we don't span across labels.
    const re = new RegExp(
      `([A-Za-z][A-Za-z0-9_]*)\\${open}([^\\${close}]*?)\\${close}`,
      'g',
    )
    out = out.replace(re, (match, id, body) => {
      if (isAlreadyQuoted(body)) return match
      const hadBr = /<br\s*\/?>/i.test(body)
      // Mirror the renderer's sanitization order: <br/> first, then
      // em/en-dash → ASCII hyphen. Keeps the on-disk source rendering
      // identically to whatever the runtime sanitiser would produce.
      const cleaned = body
        .replace(/<br\s*\/?>/gi, ' — ')
        .replace(/[—–]/g, '-')
        .trim()
      const hasParen = cleaned.includes('(') || cleaned.includes(')')
      const hasSpecial = SPECIAL_CHARS.test(cleaned)
      const risky = hasParen || hasSpecial || hadBr
      if (!risky) return match
      return `${id}${open}"${cleaned}"${close}`
    })
  }
  return out
}

/**
 * Rule 3: em-dash arrows → ASCII arrows. Doesn't touch em-dashes inside
 * labels (those are now safely quoted by rule 1+2, or were never risky).
 *
 * @param {string} src
 */
export function fixEmDashArrows(src) {
  return src.replace(/[—–]>/g, '-->')
}

/**
 * Rule 4: if the first non-blank, non-comment line is a bare `flowchart`
 * or `graph` (no orientation), inject `LR`. Mindmaps and other types are
 * untouched.
 *
 * @param {string} src
 */
export function ensureFlowchartOrientation(src) {
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue
    // first content line
    const bareFlowchart = /^(flowchart|graph)\s*$/.exec(trimmed)
    if (bareFlowchart) {
      const indent = line.slice(0, line.indexOf(trimmed[0]))
      lines[i] = `${indent}${bareFlowchart[1]} LR`
    }
    break // only ever the first content line
  }
  return lines.join('\n')
}

/**
 * Whole pipeline. Composed in an order such that repeated application
 * is a fixed point. Trims trailing/leading whitespace for clean diffs.
 *
 * @param {string} src
 * @returns {string}
 */
export function applyMechanicalFixes(src) {
  if (!src || typeof src !== 'string') return src
  const stages = [
    fixEmDashArrows,
    quoteRiskyLabels,
    ensureFlowchartOrientation,
  ]
  let out = src
  for (const stage of stages) out = stage(out)
  return out.trim() === src.trim() ? src : out
}

/**
 * Replace the first ```mermaid``` fenced block inside an MDX string with
 * a new source. Returns the original if there is no fence (so call sites
 * can compare === to detect "nothing to do").
 *
 * @param {string} mdx
 * @param {string} newSource
 */
export function replaceFirstMermaidFence(mdx, newSource) {
  const re = /(```mermaid\s*\n)([\s\S]*?)(```)/
  if (!re.test(mdx)) return mdx
  return mdx.replace(re, (_m, open, _body, close) => `${open}${newSource}\n${close}`)
}
