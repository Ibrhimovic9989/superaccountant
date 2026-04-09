# GenerateLessonAgent

The orchestrator sub-agent that turns one entry from `topics.yaml` into a complete bilingual lesson.

## Architecture

```
generate-lesson.agent.ts   ── orchestrator (wires tools, runs agent loop)
system-prompt.ts           ── composed system prompt (static + dynamic boundary)
topics-loader.ts           ── parses topics.yaml with Zod
artifact-cache.ts          ── per-lesson filesystem cache (resumable)
tools/
  research-topic.ts        ── Perplexity → cited facts
  draft-lesson.ts          ── Azure OpenAI → MDX (EN)
  translate-lesson.ts      ── Azure OpenAI → MDX (AR)
  generate-flowchart.ts    ── Azure OpenAI → Mermaid flowchart
  generate-mindmap.ts      ── Azure OpenAI → Mermaid mindmap
  write-video-script.ts    ── Azure OpenAI → bilingual scene script
  generate-assessment.ts   ── Azure OpenAI → 5 MCQ + 2 SA + 1 scenario
  embed-lesson.ts          ── Azure embeddings → 1536-d vectors
  media-stubs.ts           ── synthesize_voice / render_slides / assemble_video (STUBS)
  publish-lesson.ts        ── permission-gated, writes manifest (DB write TODO)
```

## How the agent runs

1. CLI invokes `generateLesson({ market, module, lesson })`.
2. Agent loop ([apps/api/src/contexts/tutoring/agent/agent-loop.ts](../../../tutoring/agent/agent-loop.ts)) sends the system prompt + tool schemas to Azure OpenAI.
3. Model emits `tool_call` → loop validates input via Zod → runs `checkPermissions` → executes tool → feeds `tool_result` back.
4. Tools cache outputs to `contexts/curriculum/seed/<market>/generated/<slug>/`. Resumable: re-running skips successful stages.
5. `publish_lesson` is permission-gated. CLI passes `--auto-approve` for batch runs.

## Run it

```bash
# One lesson
pnpm --filter @sa/api generate:lesson -- --slug ksa-vat-introduction --auto-approve

# All India lessons in phase 3
pnpm --filter @sa/api generate:lesson -- --market india --phase 3 --auto-approve

# Everything for KSA
pnpm --filter @sa/api generate:lesson -- --market ksa --all --auto-approve
```

## What's stubbed

`synthesize_voice`, `render_slides`, `assemble_video` return placeholder URLs. They need:
- Azure TTS or ElevenLabs for narration
- Remotion or `@react-pdf/renderer` for slides
- ffmpeg for assembly

`publish_lesson` writes a `manifest.json` to the artifact cache but does **not** yet:
- Upsert `CurriculumLesson` via Prisma
- Upload artifacts to Supabase Storage
- Insert pgvector rows

Both groups will land once the database has been migrated (run `pnpm db:migrate` first) and Supabase Storage buckets are provisioned.

## Inspired by

Modelled directly on Claude Code's `src/QueryEngine.ts` + `src/tools/<Tool>/` per-tool folder convention. See [CLAUDE.md §10](../../../../../../../CLAUDE.md).
