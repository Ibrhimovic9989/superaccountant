# SuperAccountant

Next-generation **agentic LMS for accountants** — bilingual (EN / AR), markets: **India + KSA**.

> 📖 **Read [CLAUDE.md](CLAUDE.md) before writing any code.** It is the engineering rulebook.
> 📖 **Curriculum:** [docs/curriculum.md](docs/curriculum.md)
> 📖 **Generation pipeline:** [docs/curriculum-pipeline.md](docs/curriculum-pipeline.md)

---

## Repo layout

```
superaccountant/
├── apps/
│   ├── web/                    # Next.js 16 — student + admin UI
│   └── api/                    # NestJS — DDD bounded contexts + agent loop
├── packages/
│   ├── ai/                     # Azure OpenAI, Perplexity, Doc Intelligence clients
│   ├── config/                 # Zod-validated env loader
│   ├── db/                     # Prisma schema + client
│   ├── i18n/                   # locale + RTL helpers
│   ├── types/                  # shared domain types
│   └── ui/                     # design-system primitives
├── contexts/
│   └── curriculum/seed/        # topics.yaml + generated lesson artifacts
│       ├── india/
│       └── ksa/
├── docs/
│   ├── curriculum.md
│   ├── curriculum-pipeline.md
│   └── adr/                    # architecture decision records
├── claude-code/                # vendored — source of inspiration only, not built
├── CLAUDE.md                   # ← engineering rules
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json
├── tsconfig.base.json
├── package.json
├── .env.example
└── .env                        # gitignored
```

## Tech stack

| Layer | Choice |
|---|---|
| Web | Next.js 16, React 19, App Router, RSC, `next-intl` |
| API | NestJS 10, DDD modules, Zod validation |
| ORM / DB | Prisma + Postgres (Supabase) + `pgvector` |
| Auth | NextAuth v5 (Google + Email verification via Resend) |
| Email | **Resend** (`@sa/email`) |
| AI chat | **Azure OpenAI** — `gpt-5.2-chat` |
| Embeddings | **Azure OpenAI** — `text-embedding-3-small-2` (1536-d) |
| OCR | **Azure Document Intelligence** |
| Research | **Perplexity** (curriculum generation) |
| Cron | Supabase scheduled functions |
| Monorepo | pnpm workspaces + Turborepo |
| Lint/Format | Biome |
| Deploy | Vercel (web) + Supabase (data, cron, storage) |

## First-time setup

```bash
# 1. Install
pnpm install

# 2. Configure env
cp .env.example .env
# Fill in Supabase + NextAuth values. Azure / Perplexity already populated.

# 3. Materialize Next.js app (one-time)
pnpm dlx create-next-app@latest apps/web \
  --typescript --app --src-dir --tailwind --eslint --turbopack \
  --import-alias "@/*" --use-pnpm
# Then merge the generated package.json with the workspace deps already there.

# 4. Materialize NestJS app (one-time)
pnpm dlx @nestjs/cli new apps/api --package-manager pnpm --skip-git
# Replace generated src/ with the stubbed contexts/ folders already in place.

# 5. DB
pnpm db:generate
pnpm db:migrate

# 6. Run everything
pnpm dev
```

## ⚠️ Security note

The `.env` shipped in this repo for local dev contains live keys that were pasted in chat. **Rotate them all** before deploying anywhere. Per CLAUDE.md §9, env is validated by Zod at boot — the app refuses to start with missing values.
