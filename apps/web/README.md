# @sa/web — SuperAccountant Web

Next.js 16 (App Router, RSC, Server Actions). Bilingual EN/AR with `next-intl`.

## Bootstrap (run once)

This folder is a skeleton. To materialize the actual Next.js app, from the **repo root**:

```bash
pnpm dlx create-next-app@latest apps/web \
  --typescript --app --src-dir --tailwind --eslint --turbopack \
  --import-alias "@/*" --use-pnpm
```

Then merge the generated `package.json` with the one already here (keep the `@sa/*` workspace deps).

## Structure (target)

```
apps/web/
  src/
    app/
      [locale]/                     # next-intl locale segment (en | ar)
        (marketing)/
        (auth)/                     # NextAuth pages
        (student)/
          dashboard/
          assignments/[id]/
          tutor/                    # the agent UI (streaming)
          grand-test/
          certificate/[hash]/
        (admin)/
      api/
        auth/[...nextauth]/
        agent/stream/               # SSE streaming endpoint -> backend
        webhooks/supabase/
    components/
      agent/                        # streaming chat UI, tool-use renderers
      messages/                     # ToolUseMessage, ToolResultMessage (RSC)
      design-system/
    lib/
      auth.ts                       # NextAuth config
      api.ts                        # typed client to NestJS backend
      i18n.ts
    middleware.ts                   # locale + auth
  messages/
    en.json
    ar.json
```

All UI strings via `next-intl`. RTL handled at `<html dir>` per `[locale]` segment.
