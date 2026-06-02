# Mermaid Fix Pass — 2026-06

Companion to [`docs/lesson-flowchart-audit.md`](./lesson-flowchart-audit.md). Run by `packages/db/scripts/fix-flagged-flowcharts.mjs`.

## Headline

Started with **35 flagged blocks across 33 lessons** (score >= 15). Fix pass applies two stages — mechanical sanitisation to every flagged lesson, structural rewrites to the worst ten — and is idempotent.

## What changed

| stage | rule | applied to |
|---|---|---|
| mechanical | quote labels with `(` or `)` inside `[...]` / `{...}` | every flagged block (16 hits) |
| mechanical | quote labels with `& % / : —` inside `[...]` / `{...}` | every flagged block (86 hits) |
| mechanical | em/en-dash arrows → `-->` | every flagged block |
| mechanical | add `flowchart LR` to bare `flowchart` / `graph` headers | every flagged block (audit found 0 currently) |
| mechanical | `<br/>` inside unquoted labels → quote + ` - ` | every flagged block |
| structural | split 19-node flowcharts into 2 sequential diagrams | `in-as-key-standards`, `in-tds-key-sections`, `in-payroll-pf-esi-pt` |
| structural | quote-pass + paren-merge for high-quoting flowcharts | `in-final-balance-sheet`, `in-tax-house-property`, `in-gst-introduction-and-benefits` |
| structural | mindmap trim to <= 25 lines, 3 levels deep | `in-gst-tds-tcs-under-gst`, `in-gst-time-and-value-of-supply`, `in-adj-depreciation`, `in-ap-process`, `in-tax-house-property` |
| fallback | generic mindmap prune (depth-cap + line-cap) | mindmaps over 28 lines without a hand rewrite |

## Why split, not shrink?

Three flowcharts crossed 19 nodes. Shrinking them inside one viewport produces label overlap (that's the strategy-review complaint). Splitting at a narrative joint preserves all the information — students still see the full pipeline, just on two screens. The second half is appended to `contentEnMdx` as a fenced mermaid block, tagged with `<!-- fix-pass-2026-06: appended secondary diagram -->` so the idempotency check can detect prior runs without re-appending.

## Judgment calls a reviewer should know about

- **`in-payroll-pf-esi-pt` split** uses a fresh `A2` root in part 2 because the diagram has two genuinely independent compliance regimes (EPF/ESI vs PT/Gratuity). Part-2 isn't a logical continuation of part-1's arrows — it's a parallel chart. Re-using `A` as the root would have implied otherwise.
- **`in-tax-house-property` flowchart** had `[Annual Value = Nil<br/>Sec 23(2)]` style labels. The split would have only been a marginal win at 13 nodes, so I merged the two-line labels into one quoted form and left the chart intact. Risk: that label is now a long string; mermaid handles it but it widens the layout.
- **`in-tds-key-sections` part-1** ends at `F{Rent?}` (the question), not at its `S194I[Rent]` answer. That puts the cliffhanger on the question — students who scroll past part 1 land on a clean answer node at the top of part 2.
- **Generic mindmap prune fallback** drops any node deeper than 3 indent levels and caps the diagram at 26 source lines. It will silently lose some leaf detail on the ~13 mindmaps without a hand rewrite. Lessons whose prose is light on detail (rare) may need a re-pass.
- **Pipe labels with `<=` / `>=`** in `in-payroll-pf-esi-pt` use ASCII operators (not `<=` / `>=` HTML entities). Mermaid does NOT quote pipe-label bodies, so the safer fix was to ASCII the operator and quote the bracketed targets.

## Observations for the next pass

- The dominant flag is `lines>20` on mindmaps (110 of 222 blocks, 50%). The audit weight is `(lines - 20) * 1.5`, which means even a perfectly clean 25-line mindmap scores 7.5. If we want the threshold to be a real quality signal rather than a length signal, the next audit should either (a) raise the line-count threshold to 28, or (b) drop the line-count multiplier to 0.75 for mindmaps only — those naturally take more vertical lines per concept than flowcharts.
- The Top-10 sources show the LLM that generated the curriculum likes the pattern `[Foo<br/>Bar (qualifier)]` — qualifier in parens AND a `<br/>` separator. That combination triggers two flags at once. A prompt rule for the next generation run ("if a label has a qualifier, use ` - qualifier`, not ` (qualifier)` and not `<br/>qualifier`") would prevent ~80% of these flags at the source.
- `flowchartMermaid` blocks that pass mechanical cleanup are mostly under 12 nodes — the column itself is a good size constraint. The structural issues cluster in the mindmaps. Worth considering: drop the dedicated `mindmapMermaid` column entirely and require any mindmap to live as a fenced block in `contentEnMdx`, where MDX prose enforces a natural length limit by surrounding it.
- Several `unq-specials` flags are colon-based labels like `[Start: House Property]`. The renderer sanitiser already handles `:`, so these are only "lint" flags — not real render bugs. The next audit should probably treat colon-only flags as warnings (weight 0.5) rather than errors (weight 2).

## Acceptance

- `node --test packages/db/scripts/lib/fix-flagged-flowcharts/mechanical.test.mjs` — passes
- Script idempotency verified by the `out.trim() === src.trim() ? src : out` check inside `applyMechanicalFixes` and by per-row before/after diff in the runner
- Re-run the audit to confirm flagged count drops; expected residual is a handful of mindmaps where the generic prune hit lower-priority leaves
