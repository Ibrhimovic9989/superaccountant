# @sa/api — SuperAccountant Backend (NestJS)

DDD-organized NestJS service. One module per bounded context. See root `CLAUDE.md` §3.

## Layout

```
apps/api/src/
  main.ts
  app.module.ts
  contexts/
    identity/
      domain/         # entities, value objects, ports (interfaces)
      application/    # use-cases (one class, one execute() method)
      infrastructure/ # Prisma repositories, external adapters
      interface/      # NestJS controllers + DTOs
      identity.module.ts
    curriculum/
    assessment/
    learning/
    tutoring/         # the agent loop lives here
      tools/          # one folder per tool (mirrors claude-code/src/tools/)
      prompts/        # composed system prompt builders (en + ar)
    certification/
    notifications/
  shared/
    errors/
    logging/
    auth/             # JWT verification for Supabase + NextAuth bridge
```

## Bootstrap

This is a skeleton. Stub modules will be created as features land. To run:

```bash
pnpm install
pnpm --filter @sa/api dev
```
