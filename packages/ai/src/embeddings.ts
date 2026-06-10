/**
 * Back-compat re-export. The pre-2026-06 file lived here and exported
 * `embed()` against Azure's text-embedding-3-small. The implementation
 * moved to `./embed.ts` (Jina v3) — this re-export keeps the historical
 * import path alive for files that haven't migrated yet.
 */
export { embed, EMBEDDING_DIMS } from './embed'
