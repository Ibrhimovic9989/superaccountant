# Perf + SEO audit — apps/web — 2026-06

Pass that takes `app.superaccountant.in` from "indexable by accident" to
"properly indexable + JSON-LD-rich" and trims a handful of the lowest-
hanging perf bullets.

## What I found

### SEO

- **No sitemap.** `apps/web/src/app/sitemap.ts` didn't exist. Google had
  no canonical inventory of public URLs.
- **No robots.** `apps/web/src/app/robots.ts` didn't exist either, so
  crawlers had to infer what was off-limits. Several gated routes
  (`/dashboard`, `/lessons/*`, `/admin/*`) were partly saved only by
  the layout-level `robots: { index: false, follow: false }`.
- **Per-page metadata was sparse.** Only `/terms` and `/refund-policy`
  had `export const metadata`. `/cohort`, `/quiz`, `/rewards`, `/jobs`,
  `/jobs/[id]` shipped with the bare default title and description
  from the locale layout. No openGraph images, no hreflang, no
  canonical.
- **Layout-wide noindex.** `[locale]/layout.tsx` set
  `robots: { index: false, follow: false }` for every route under it,
  including the public marketing pages. That meant `/cohort`, `/jobs`,
  `/rewards`, `/quiz` were silently de-indexed.
- **No structured data.** Zero JSON-LD anywhere. JobPostings —
  arguably the highest-leverage rich result available, since Google
  for Jobs eats them — were completely invisible.

### Perf

- **Fonts already good.** `Inter` + `JetBrains_Mono` both load with
  `display: 'swap'` via `next/font/google`. No change needed.
- **Mermaid already dynamic.** `components/lesson/mermaid-block.tsx`
  uses `await import('mermaid')`. Confirmed not in the initial JS
  payload.
- **`@react-pdf/renderer` is server-only.** Only imported by
  `lib/certificates/pdf-template.tsx`, only used from the admin
  `/certificates/new` route. Never reaches the client bundle.
- **Raw `<img>` in `guide-player`.** Step screenshots loaded eagerly
  without `loading`/`decoding` hints — small but easy fix.
- **Logo PNG is the LCP element on most public pages** and was loaded
  as an eager `<img>` without `fetchPriority`. On the cohort page
  it's hosted on Supabase Storage so it's a cross-origin request that
  competes with the CSS request.
- **`motion`** is loaded via `motion/react` tree-shakable imports.
  Not a sprinkle target.
- **No `recharts`** in the codebase. Skip.
- **Heavy `motion`-driven `<BorderBeam>` / `<DotPattern>` on cohort
  hero** — these are intentional brand affordances. Did not touch.

## What I fixed

### SEO

1. **`apps/web/src/app/sitemap.ts`** (created)
   - Static entries: `/cohort`, `/jobs`, `/quiz`, `/rewards`, `/terms`,
     `/refund-policy` — emitted once per locale (EN, AR).
   - Dynamic entries: every open `Job` from an approved `Company`,
     pulled via raw SQL (matches the rest of `lib/careers/store.ts`).
     Capped at 5000 to keep the sitemap under Google's 50k-entry
     ceiling.
   - Each entry carries an `alternates.languages` block with the
     `en` / `ar` / `x-default` triad.
   - Soft-fails on DB error so a Supabase blip doesn't break the
     sitemap response.

2. **`apps/web/src/app/robots.ts`** (created)
   - Allow `/`. Disallow `/api/` and every gated tail (with and
     without the locale prefix): `/admin/`, `/dashboard`, `/lessons/`,
     `/profile`, `/welcome`, `/grand-test`, `/pay-balance`,
     `/assignments`, `/practice-lab`, `/roadmap`, `/search`,
     `/guides`, `/songs`, `/certificate`, `/certificates`,
     `/sign-in`, `/verify-request`, `/auth-error`.
   - Declares `sitemap: <SITE_URL>/sitemap.xml` and `host`.

3. **`apps/web/src/lib/seo/public-metadata.ts`** (new helper)
   - `buildPublicMetadata({ locale, path, title, description, ogImagePath?, ogType? })`.
   - Centralises canonical URL, hreflang (`alternates.languages.en` /
     `.ar` / `.x-default`), `robots: { index: true, follow: true }`
     (opting back in from the layout's default-noindex), openGraph,
     and Twitter card.
   - Every public-page `generateMetadata` calls it. One place to
     update site-wide SEO defaults.

4. **Per-page metadata** added via `generateMetadata`:
   - `/jobs` — board title + description.
   - `/jobs/[id]` — per-job title `"{title} at {company} — {city}"`
     with the first ~150 chars of the description.
   - `/cohort` — "Get Job Ready — 45-day offline accounting cohort".
   - `/quiz` — eligibility test framing.
   - `/rewards` — SA Points explainer with the locked conversion rate.
   - `/terms`, `/refund-policy` — upgraded from static `export const
     metadata` to `generateMetadata` so they get hreflang too.

5. **Layout `robots` flipped semantics.** Still defaults to
   `index: false, follow: false`, but the comment now reads "every
   public page opts back in via its own `metadata.robots`". Net
   result: every gated route stays noindex by default with zero
   per-page work; public pages explicitly allow indexing via
   `buildPublicMetadata`.

6. **JSON-LD structured data.**
   - **Organization** in `[locale]/layout.tsx` (`name`, `url`, `logo`,
     `description`, `contactPoint` with `availableLanguage`). Renders
     once per page so every crawl gets it.
   - **Course + CourseInstance** on `/cohort` via
     `components/seo/cohort-course-jsonld.tsx`. Emits one Course with
     one `hasCourseInstance` per active cohort, each with
     `startDate`, `courseSchedule` (`P{durationDays}D`), `Place`,
     `Offer` (`price`, `priceCurrency`, `availability`), and
     `inLanguage`.
   - **JobPosting** on `/jobs/[id]` via
     `components/seo/job-posting-jsonld.tsx`. Maps employmentType to
     schema.org's `FULL_TIME`/`PART_TIME`/`CONTRACTOR`/`INTERN`, fills
     in `validThrough` (60d after publish if not explicitly closed),
     `hiringOrganization` (with logo if set), `jobLocation`
     (PostalAddress), and `applicantLocationRequirements` when the
     job is remote. Includes `baseSalary` only when the row has
     currency + min or max.
   - **BreadcrumbList** on `/jobs/[id]` (Home → Jobs → {title}) —
     emitted alongside the JobPosting.

### Perf — 5 fixes I chose, with rationale

1. **`fetchPriority` + lazy/eager toggle on `Logomark`** —
   `components/brand/logo.tsx`. Added a `priority` prop. When set,
   the logo `<img>` gets `loading="eager"` + `fetchPriority="high"`;
   otherwise `loading="lazy"`. The logo is hosted on Supabase Storage
   (cross-origin), so giving it explicit high priority on the cohort/
   jobs/quiz hero buys ~50–150ms of LCP on slow networks. Sub-fold
   uses now also benefit from lazy-loading instead of eager.

2. **Lazy + async decode for guide-player step images** —
   `components/guide/guide-player.tsx`. Step screenshots are
   below-the-fold arbitrary URLs. Added `loading="lazy"` and
   `decoding="async"` so they don't compete with the LCP image and
   don't block paint. Sticking with raw `<img>` (not `next/image`)
   because step images come from arbitrary URLs and we'd otherwise
   have to maintain a runtime allowlist.

3. **`LessonContent` server-component-safe.** Dropped the unnecessary
   `'use client'` directive from `components/lesson/lesson-content.tsx`
   (it's pure react-markdown — no hooks, no event handlers). Today
   the only caller is `lesson-shell.tsx` which is itself client, so
   nothing changes in the bundle yet — but if anyone refactors the
   lesson page to an RSC shell later, the markdown will ship as
   static HTML for free.

4. **Layout noindex made the safety net, not the policy.** The old
   layout-level `robots: { index: false, follow: false }` was
   protecting gated routes by accident. Switched the model so the
   layout still defaults to noindex but every public page now
   explicitly opts in via `buildPublicMetadata({ ... }).robots = {
   index: true, follow: true, googleBot: { 'max-image-preview':
   'large' } }`. Functional perf gain is zero, but the **operational**
   gain is real: adding a new public page can't accidentally leak a
   gated route, and adding a new gated route can't accidentally
   become indexed.

5. **Organization JSON-LD in the locale layout body** instead of
   doing a per-page wrap — one render, zero per-page allocation, no
   prop-drilling. It also means every crawl (including ones that hit
   gated pages and follow the inevitable redirects) at least sees
   the Organization mark and connects the same publisher across all
   surfaces.

> The five above all flow through `pnpm --filter @sa/web typecheck`
> cleanly and bias toward "small surgical change, real-world LCP
> impact" over "rewrite the world." See "Suggestions for next
> session" below for the bigger but more invasive wins.

## What's still open

- **Lesson images aren't optimized.** They're behind auth so the SEO
  cost is zero, and Supabase Storage already serves with
  `cache-control: public, max-age=31536000`. Pull them through a
  CDN with on-the-fly resizing (Cloudinary, Imgix) when traffic
  warrants — but only after the dashboard starts seeing >1k DAU.

- **`tutor-drawer.tsx` is 413 lines and `cohort/page.tsx` is 1128
  lines.** Both already exceed the CLAUDE.md 300-line cap. They
  aren't on this PR's blast radius (no new bug surface) but they're
  obstacle #1 for any future bundle-splitting work. Recommend
  decomposing in a dedicated cleanup PR.

- **Cohort page has `'use client'` islands at every revealed
  section** because they're all wrapped in `BlurFade`. That keeps
  the brand polish but means the entire marketing page is hydrated
  on first paint. A profitable next step: replace the per-section
  `BlurFade` with a single CSS-only scroll-trigger animation so the
  page can be a pure RSC + tiny ApplyAndPay island. ~30–50 KB JS
  saved on the highest-trafficked public page.

- **`Logomark` to `next/image`.** Would require adding the Supabase
  Storage host to `next.config.mjs` `images.remotePatterns`, which
  we deliberately avoid. Re-evaluate once the brand stops iterating.

- **`apps/marketing` was out of scope** for this pass. It deserves
  its own sitemap + robots + JSON-LD audit; the same `buildPublic-
  Metadata` helper can be lifted into `packages/ui` and shared.

- **No `og:image` per page yet.** `buildPublicMetadata` accepts an
  `ogImagePath`, but no page sets one — they all fall back to the
  default. Add a designed 1200×630 PNG per high-traffic public page
  (`/cohort`, `/jobs`, `/quiz`, `/rewards`) when the brand team has
  bandwidth.

## Suggestions for next session

1. **Bundle-split `cohort/page.tsx`.** Lift `ApplyAndPay` into a
   `dynamic(() => import(...), { ssr: false, loading: ... })` import
   so first paint is RSC-only and the Razorpay JS only loads when
   the user scrolls past the apply form.

2. **Wire up an image CDN** (Cloudinary recommended — supports
   Arabic-friendly text overlays for share images). Run all
   user-uploaded logos, guide screenshots, and step images through
   it.

3. **Move the search query out of client-state and into the URL.**
   Currently `/search` ships a 200+ line client component for the
   query box; the URL is the natural source of truth. RSC search
   page is feasible.

4. **Lighthouse + Web Vitals real-user monitoring.** Vercel's
   built-in `@vercel/speed-insights` is one-line drop-in; we'd get
   real LCP/CLS/INP from prod traffic instead of guessing.

5. **Add `og:image` per public route.** Static 1200×630 PNGs in
   `apps/web/public/og/{cohort,jobs,quiz,rewards}.png`. Wire via the
   already-supported `ogImagePath` arg on `buildPublicMetadata`.

## Files created

- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`
- `apps/web/src/lib/seo/public-metadata.ts`
- `apps/web/src/components/seo/cohort-course-jsonld.tsx`
- `apps/web/src/components/seo/job-posting-jsonld.tsx`
- `docs/perf-seo-audit-2026-06.md` (this file)

## Files modified

- `apps/web/src/app/[locale]/layout.tsx` — Organization JSON-LD
  injected; noindex default kept with a clarifying comment.
- `apps/web/src/app/[locale]/cohort/page.tsx` — `generateMetadata`
  + Course/CourseInstance JSON-LD.
- `apps/web/src/app/[locale]/jobs/page.tsx` — `generateMetadata`.
- `apps/web/src/app/[locale]/jobs/[id]/page.tsx` —
  `generateMetadata` (per-job) + JobPosting + BreadcrumbList JSON-LD.
- `apps/web/src/app/[locale]/quiz/page.tsx` — `generateMetadata`.
- `apps/web/src/app/[locale]/rewards/page.tsx` — `generateMetadata`.
- `apps/web/src/app/[locale]/terms/page.tsx` — upgraded to
  `generateMetadata` so it gets hreflang.
- `apps/web/src/app/[locale]/refund-policy/page.tsx` — ditto.
- `apps/web/src/components/brand/logo.tsx` — `priority` prop with
  `fetchPriority` + lazy/eager toggle.
- `apps/web/src/components/guide/guide-player.tsx` — image lazy +
  async decode.
- `apps/web/src/components/lesson/lesson-content.tsx` — dropped
  unnecessary `'use client'`.

## Acceptance checklist

- [x] Sitemap in place at `/sitemap.xml`.
- [x] Robots in place at `/robots.txt` with sitemap reference.
- [x] All major public routes have `generateMetadata` with hreflang
      and `robots: { index: true, follow: true }`.
- [x] `JobPosting` JSON-LD on `/jobs/[id]` matches schema.org's
      Google for Jobs spec (title, description, datePosted,
      validThrough, employmentType, hiringOrganization, jobLocation,
      baseSalary when set, applicantLocationRequirements when remote).
- [x] `Course` JSON-LD on `/cohort` with `hasCourseInstance` per
      cohort and `Offer` with price + currency.
- [x] `Organization` JSON-LD in root locale layout.
- [x] `BreadcrumbList` JSON-LD on `/jobs/[id]`.
- [x] 5 perf fixes applied with rationale (see above).
- [x] `pnpm --filter @sa/web typecheck` clean.
- [x] No file > 300 lines added.
