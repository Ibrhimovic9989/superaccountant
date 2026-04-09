# SuperAccountant — Engineering Rules (CLAUDE.md)

> Next-generation **agentic LMS for accountants** — bilingual (English / Arabic), markets: **India + KSA**.
> Onboarding test → daily AI assignments → grand test → certificate. Every interaction is agentic.

---

## 1. North Star

1. **Agentic-first, not chat-first.** Every screen is an agent loop with tools, not a form. Forms are tools the agent invokes.
2. **Bilingual parity.** EN and AR are first-class. RTL is not an afterthought. All prompts, tool descriptions, certificates, and UI strings ship in both.
3. **Locale-aware curriculum.** India track (GST, TDS, Ind AS, Companies Act 2013) and KSA track (ZATCA e-invoicing, VAT, Zakat, IFRS) are separate **bounded contexts**, not feature flags on one model.
4. **Inspired by Claude Code.** Streaming, tool-driven, permissioned, memory-backed, plan-mode capable. See §10.

---

## 2. Tech Stack (locked)

| Layer | Choice |
|---|---|
| Monorepo | **pnpm workspaces + Turborepo** |
| Web (`apps/web`) | **Next.js 16+** (App Router, RSC, Server Actions, React 19) |
| Backend (`apps/api`) | **NestJS 10** (one module per bounded context) |
| ORM (`packages/db`) | **Prisma** |
| DB | **Postgres** via **Supabase** + **`pgvector`** (1536-d) |
| Auth | **NextAuth v5** — Google + Email (verification via Resend) |
| Email | **Resend** (only via `packages/email/`) |
| Cron | **Supabase scheduled functions** → call NestJS endpoints |
| Chat LLM | **Azure OpenAI** — `gpt-5.2-chat` (deployment in env) |
| Embeddings | **Azure OpenAI** — `text-embedding-3-small-2` (1536-d) |
| OCR | **Azure Document Intelligence** (`prebuilt-layout`) |
| Research | **Perplexity** (curriculum generation pipeline) |
| i18n | `next-intl` (EN + AR, RTL switch at `[locale]` segment) |
| Lint/Format | **Biome** |
| Deploy | **Vercel** (web) + Supabase (data, cron, storage) |

**Do not** add Redis, Kafka, microservices, alternate ORMs, or direct OpenAI without an ADR. All AI providers go through `packages/ai/`. Stay boring.

---

## 3. Architecture — DDD + SOLID + SRP

### 3.1 Repo layout

```
superaccountant/
├── apps/
│   ├── web/        # Next.js 16 — student + admin UI (RSC, server actions)
│   └── api/        # NestJS — DDD bounded contexts + agent loop
├── packages/
│   ├── ai/         # Azure OpenAI, Perplexity, Doc Intelligence clients
│   ├── config/     # Zod env loader (single source of truth)
│   ├── db/         # Prisma schema + client
│   ├── i18n/       # locale + RTL helpers
│   ├── types/      # shared domain types
│   └── ui/         # design-system primitives
└── contexts/curriculum/seed/{india,ksa}/  # topics.yaml + generated artifacts
```

### 3.2 Bounded Contexts (each = a NestJS module under `apps/api/src/contexts/`)

```
apps/api/src/contexts/
  identity/         # users, auth, roles, profile, locale
  curriculum/       # tracks (India/KSA), modules, lessons, embeddings, generation pipeline
  assessment/       # entry test, daily assignments, grand test, grading
  learning/         # student progress, streaks, attempts, mastery
  tutoring/         # the agent loop — tools, sessions, memory
  certification/    # certificate generation, verification, PDF
  notifications/    # email, in-app, scheduled nudges
```

Each context owns its **domain model**, **application services**, **infrastructure adapters**, and **interface (controller/RPC)**. **No cross-context Prisma imports.** Communicate via application services or domain events.

### 3.3 Layer rules per context (hexagonal)

```
context/
  domain/          # entities, value objects, domain services, domain events. ZERO framework imports.
  application/     # use-cases (one class per use case). Orchestrates domain + ports.
  infrastructure/  # Prisma repositories, OpenAI clients, Supabase adapters. Implements ports.
  interface/       # NestJS controllers, DTOs, Zod schemas, Next.js server actions
  index.ts         # public barrel — only exports application use-cases + DTOs
```

### 3.4 SOLID, applied

- **S — SRP:** One use-case = one class = one public method (`execute`). If you write `else if` chains over a `type` field, split the class.
- **O — OCP:** Tools, graders, and certificate templates are registered via a registry. Add new ones without editing the dispatcher.
- **L — LSP:** All `Repository` ports return domain entities, never Prisma models. Don't leak `Prisma.JsonValue`.
- **I — ISP:** Don't make a `UserService` god class. `EnrollStudent`, `VerifyEmail`, `RotateLocale` are separate use-cases.
- **D — DIP:** Domain depends on **ports** (interfaces) declared in `domain/`. Infrastructure implements them. Wire in NestJS module.

### 3.5 Forbidden

- Importing Prisma client outside `packages/db/` or `infrastructure/` layers.
- Business logic in Next.js route handlers / server actions — they call NestJS use-cases via the typed client only.
- Direct OpenAI / Anthropic / model SDK imports outside `packages/ai/`.
- Shared "utils" folders that become dumping grounds. Put helpers next to their context.
- ORM entities leaking past the repository boundary.
- `apps/web` importing from `apps/api` or vice versa. Communication is HTTP-only via the typed client in `apps/web/src/lib/api.ts`.

---

## 4. The Agent (tutoring context) — inspired directly by Claude Code

### 4.1 Agent loop (mirror `QueryEngine.ts`)

- **Streaming-first.** All model responses stream as an async generator. UI renders tokens, thinking blocks, tool calls, and tool results in real time.
- **Tool cycle:** model emits `tool_use` → permission gate → execute → stream `tool_result` back → continue until `stop_reason === 'end_turn'`.
- **Retries:** classify errors (`retryable | permanent`), exponential backoff with jitter on transient.
- **Token + cost tracking** per turn, per session, per student. Surface as `/cost` style admin tool.
- **Compaction:** when context approaches limit, summarize older turns into a "session memory" stored in `tutoring.session_memory` (with embedding).

### 4.2 Tools (each = its own folder, like `src/tools/BashTool/`)

Each tool ships:

```
tools/<ToolName>/
  index.ts            # buildTool() — name, description, schema, call
  schema.ts           # Zod input schema (strict, no unknown keys)
  permissions.ts      # checkPermissions(input, ctx) -> allow|deny|ask
  prompt.ts           # extra system-prompt injection when this tool is loaded
  ui.tsx              # renderToolUseMessage + renderToolResultMessage (RSC)
  <tool>.test.ts
```

Required tools at MVP:

- `AssessSkillTool` — grade a student answer, return rubric + score.
- `ExplainConceptTool` — pull from curriculum embeddings, cite lesson.
- `GenerateAssignmentTool` — create today's assignment for a student given mastery.
- `LookupRegulationTool` — RAG over GST/TDS/ZATCA/VAT/IFRS sources, locale-aware.
- `SubmitAnswerTool` — persists attempt, triggers grading.
- `IssueCertificateTool` — gated by `checkPermissions` (only after grand test pass).
- `PlanStudyTool` — enters **plan mode** for multi-week study plans.
- `RecordMemoryTool` — writes to student memory file (see §4.4).

### 4.3 Permission model

Three modes, mirroring Claude Code: `default | plan | auto`. Destructive or graded actions (`IssueCertificateTool`, `SubmitAnswerTool` for the grand test) **must** require explicit confirmation in `default` mode. Permission rules are declarative and stored per-user.

### 4.4 Memory (mirror `memdir/`)

- `student.md` — auto-built profile: strengths, weaknesses, locale, accommodations, exam goals.
- `course.md` — per-enrollment notes the agent maintains.
- Loaded into the system prompt under a `# Memory` section on every turn.
- **Static vs dynamic boundary** in the system prompt: put track curriculum + tool catalogue **before** the boundary (cacheable across users); student-specific memory **after**.

### 4.5 Sub-agents

- `EntryTestAgent`, `DailyTutorAgent`, `GrandTestProctorAgent`, `CertificateAgent` are sub-agents with isolated system prompts. Spawned via an `AgentTool` analog. They never share mutable state — only structured handoff payloads.

### 4.6 Plan mode

Used for: study plans, exam strategies, remediation plans. Agent designs first, user approves, then executes. Reject = no side effects.

---

## 5. Curriculum Engine

### 5.1 Shape

```
Track (India | KSA)
 └── Phase (Foundation | Core | Specialization | Capstone)
      └── Module
           └── Lesson
                ├── content (mdx, EN + AR)
                ├── embeddings (pgvector)
                ├── learning_objectives[]
                ├── prerequisite_lesson_ids[]
                └── assessment_blueprint
```

See [docs/curriculum.md](docs/curriculum.md) for the full India + KSA curriculum.

### 5.2 Assessments

- **Entry test** — adaptive, 20–30 questions, places student in correct phase.
- **Daily assignment** — generated each morning by Supabase cron, tailored by `GenerateAssignmentTool` from yesterday's mastery delta.
- **Grand test** — proctored by `GrandTestProctorAgent`, time-boxed, mixed MCQ + scenario + workpaper.
- **Grading** — rubric-driven, model-graded with deterministic scoring for objective items. Always return rationale + citations.

### 5.3 Certificate

- Generated server-side as PDF (`@react-pdf/renderer`), bilingual layout, QR code → public verification page (`/verify/[hash]`).
- Hash signed with HMAC over `(studentId, trackId, completedAt, score)`.
- Stored in Supabase Storage; row in `certification.certificates`.
- Issuance is gated behind `IssueCertificateTool` permission — never issued by a controller directly.

---

## 6. Bilingual / RTL rules

- **Every** user-facing string goes through `next-intl`. No hardcoded text. Ever.
- **Every** prompt has an `en.md` and `ar.md` file under `tutoring/prompts/`. The agent picks based on `session.locale`.
- **Every** model response is locale-pinned: system prompt sets `Respond strictly in {locale}` and tools return content in the session locale.
- **RTL:** use `dir` attribute at the `<html>` level, logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`), test every page in both directions in CI snapshots.
- **Numerals:** Arabic-Indic vs Western digits is a per-user preference, not per-locale.
- **Dates:** Hijri available alongside Gregorian for KSA users; default to Gregorian.

---

## 7. Coding standards

### 7.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **Zod** at every boundary: HTTP, server actions, tool inputs, env vars (`zod-env`).
- No `any`. `unknown` + narrowing instead. `as` casts require a comment justifying it.
- Prefer `type` over `interface` unless declaration-merging is needed.
- Domain models are **immutable** — return new instances from methods.

### 7.2 Naming

- Files: `kebab-case.ts`. React components: `PascalCase.tsx`. Tests: `*.test.ts`.
- Use-cases: verb-first class names — `EnrollStudent`, `GradeAttempt`, `IssueCertificate`.
- Repositories: `<Aggregate>Repository` (port) + `Prisma<Aggregate>Repository` (adapter).
- Tools: `<Verb><Noun>Tool` — `AssessSkillTool`, `ExplainConceptTool`.

### 7.3 Errors

- Domain errors are typed classes extending `DomainError`. Never throw strings.
- Use-cases return `Result<T, DomainError>` or throw typed errors caught by a NestJS exception filter that maps to HTTP / RSC errors.
- Never swallow errors silently. If a tool fails, the agent sees a `tool_result` with `is_error: true` and rationale.

### 7.4 Testing

- Use-cases: unit tests with in-memory repositories.
- Tools: integration tests that run a fake agent loop against them.
- Domain: pure unit tests, no I/O.
- E2E: Playwright for the bilingual student flow (entry test → assignment → grand test → certificate) in **both EN and AR**.

### 7.5 File size

- A file > 300 lines is a smell. > 500 is a bug. Split.

---

## 8. Data & Prisma

- One Prisma schema, but **namespace models by context**: `IdentityUser`, `CurriculumLesson`, `AssessmentAttempt`, `LearningProgress`, `TutoringSession`, `CertificationCertificate`.
- All IDs are `cuid()`. No autoincrement.
- All tables get `createdAt`, `updatedAt`, `deletedAt` (soft delete via Prisma middleware where appropriate).
- Embeddings: `pgvector` column on `CurriculumLesson` and `TutoringSessionMemory`. Use `text-embedding-3-small` (1536 dims, configurable).
- Migrations via `prisma migrate`. Never `db push` in CI.
- Row-level security in Supabase for any table students can read directly.

---

## 9. Infrastructure rules

- **NextAuth**: Google + email. Email verification mandatory before enrollment.
- **Cron** lives in Supabase scheduled functions. Each cron calls a NestJS endpoint authenticated by a signed Supabase JWT. Cron never touches Prisma directly.
- **Secrets**: `.env.local` for dev, Vercel + Supabase env for prod. Validated by Zod at boot — app refuses to start with missing/invalid env.
- **Logging**: structured JSON via `pino`. Include `traceId`, `studentId`, `sessionId`, `tool`, `latencyMs`, `tokensIn/Out`, `costUsd`.
- **No PII in prompts** unless required for tutoring. Never put email, phone, or government IDs in tool inputs.

---

## 10. Claude Code patterns we explicitly adopt

Mapped from our study of the `claude-code/` source:

| Pattern | Where it lives in Claude Code | Our equivalent |
|---|---|---|
| Streaming agent loop | `src/QueryEngine.ts` | `tutoring/application/agent-loop.ts` |
| Tool factory + per-tool folder | `src/tools/<Tool>/` | `tutoring/tools/<Tool>/` |
| `checkPermissions` gate | `src/Tool.ts`, `src/hooks/toolPermission/` | `tools/<Tool>/permissions.ts` |
| System prompt sections + cache boundary | `src/constants/prompts.ts` | `tutoring/prompts/build-system-prompt.ts` |
| `<system-reminder>` injection | prompts.ts | same tag, used for invariants per turn |
| Plan mode | `EnterPlanModeTool` | `PlanStudyTool` |
| Sub-agents | `AgentTool`, `coordinator/` | `EntryTest/Daily/Grand/Cert` sub-agents |
| Memory files | `src/memdir/` | `student.md`, `course.md` per enrollment |
| Todos | `TodoWriteTool` | per-session study todo list |
| Context compaction | `services/compact/` | `tutoring/application/compact-session.ts` |
| Streaming UI of tool use/result | `components/messages/` | RSC components per tool |
| Slash commands | `src/commands.ts` | admin commands (`/cost`, `/promote`, `/recompute`) |
| Feature flags as dead-code | `bun:bundle feature()` | `@/lib/flags` with build-time elimination |
| Strict Zod tool schemas | `buildTool({ inputSchema })` | identical |
| Cost + token tracking | `cost-tracker.ts` | `tutoring/infrastructure/cost-tracker.ts` |

**The non-negotiables from Claude Code:**

1. **Tools are the unit of capability.** Don't sneak business logic into the agent prompt. Make a tool.
2. **Permissions are declarative, on the tool, not the controller.**
3. **Streaming is mandatory.** No "wait 30 seconds and get a wall of text" UX.
4. **Memory is a file, not a vector blob.** Vectors augment, files are canonical.
5. **The system prompt is composed, not concatenated.** Sections, ordered, cache-boundary aware.
6. **Sub-agents have their own prompt and their own permission scope.** Never share state.
7. **Plan before destructive work.** Grand test, certificate issuance, bulk grading → plan mode.

---

## 11. Definition of Done (per feature)

- [ ] Lives in the right bounded context, no cross-Prisma leaks.
- [ ] Use-case class with one `execute` method, unit-tested.
- [ ] Zod schema at every boundary.
- [ ] EN + AR strings + RTL verified.
- [ ] If it touches the agent: tool folder, permissions, prompt, UI, test.
- [ ] If it's destructive: gated permission + plan-mode capable.
- [ ] Logs include `traceId` + `studentId`.
- [ ] No file > 300 lines added.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` clean.

---

## 12. ADRs

Any deviation from this document requires an ADR in `docs/adr/NNNN-title.md`. Format: Context → Decision → Consequences. PR cannot merge without it.
