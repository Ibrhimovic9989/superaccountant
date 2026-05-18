# Competitor Analysis — Software, UI, and Flow

> Author: **Claude Mythos**
> Date: 2026-05-18
> Scope: **software only** — features, UX, flows, infrastructure. Curriculum coverage is out of scope and addressed in [curriculum.md](curriculum.md).
> Question this doc answers: *Where is the rest of the market ahead of SuperAccountant on the product surface? What patterns do we need to absorb, copy, or leapfrog?*

---

## 0. TL;DR — the seven things they do that we don't yet

1. **Score predictors** that tell the learner "you'd score X if you sat the exam today" (Surgent ReadySCORE, UWorld SmartPath). We have mastery, not a number.
2. **Diagnostic-first study plans** computed from a 20-question opening sweep that pins study hours per week and per day (Surgent, Gleim, CFA LES). We do this but don't surface the hours-per-day calendar.
3. **Bite-sized lesson units** (Wiley's 30-minute, 2–5 page chunks) measured for the exact attention budget of a working professional. Our lesson sizing is implicit.
4. **In-context AI study assistant** that floats next to video / question / textbook (UWorld UAsk, Khanmigo, Coursera Coach). Ours is the *whole* experience, but they prove the floating-assistant pattern.
5. **Spaced-repetition flashcard decks** as a first-class surface (UWorld ReadyDecks, CFA flashcards). We have no flashcard surface.
6. **Native mobile app with offline downloads** of video + question banks (every CPA player, every Indian player). We are a web app.
7. **Score-prediction-driven nudges** ("you are 12 days behind plan, skip module X, drill module Y"). We schedule daily assignments; they replan in real time.

The rest of this doc is the evidence and the breakdown.

---

## 1. Adaptive engines — the table-stakes layer

| Platform | Engine name | What it actually does | UX surface |
|---|---|---|---|
| **Becker** | Adapt2U (powered by Sana Labs) | Tags every MCQ + TBS attempt against a knowledge graph; generates focused practice tests on weak nodes. | A "Customize Practice" panel that pre-fills topics with low proficiency. |
| **Surgent** | A.S.A.P. + Predictive AI | Replans the study plan after every session. Claims 40% reduction in study hours. | Daily "next best activity" card on the dashboard; calendar of remaining sessions. |
| **UWorld** | SmartPath Predictive | Per-topic readiness gauge, predicted exam score, days-to-ready estimate. | Heatmap of topics by readiness band (red → green); always-visible predicted score. |
| **Gleim** | SmartAdapt | Diagnostic session per unit sets baseline, then routes between MCQ → study → MCQ until a unit is "ready". | A unit-level state machine the learner can see ("diagnostic → study → review → ready"). |
| **Wiley CPAexcel** | Bite-Sized Lessons + mini-diagnostics | Lesson-level diagnostics, not session-level. Lower-tech but more visible to the learner. | Per-lesson mini-quiz that gates "mark as learned". |
| **CFA LES** | Adaptive study plan | Re-paces the official curriculum against the candidate's calendar. | A scheduler that owns the entire prep window and reschedules on missed days. |

**What they share:**
- All of them expose the model's confidence to the learner. We hide ours behind "mastery %".
- All of them compute a **time-to-ready** estimate and a **probability-of-pass** number. Learners use this number to manage anxiety, employers use it to gate exam booking.
- All of them treat the study plan as the *primary canvas*, not chat. The chat / agent is auxiliary.

**Where we win:** none of these engines are truly agentic. They are recommender systems wrapped in a UI. They cannot reason about *why* a learner is weak ("you keep confusing input VAT on exempt supplies — let me walk through it"). They route, they don't tutor.

**Where we lose:** our learners cannot answer "when am I ready?" without asking the agent. Make this a top-bar widget. **Action: build a `PredictedReadinessTool` and surface it on the dashboard.**

---

## 2. Study-plan surface — the canvas they fight over

Every competitor treats the **study plan** as the home screen. Our home screen is the **session**. This is a real difference.

### Surgent
- Calendar view with weekly hours pre-allocated.
- "Study days" toggle (which days of the week you're available).
- Replans the calendar when you miss a day, with a banner: *"You missed Tuesday. We compressed Topic 4 by 25 minutes and pushed Topic 6 to Friday."*
- One-click "I have 30 minutes right now" → starts a session sized to fit.

### Becker
- Visual study planner with module-level cards.
- "Pace" indicator (ahead / on track / behind) per module.
- Hover over a date → see what activities will be served.

### UWorld
- Topic-level readiness heatmap as the primary view, study plan secondary.
- Strong: you can see the whole exam blueprint at a glance, color-coded.

### CFA LES
- Owns the entire prep window from registration to exam day.
- Shows total hours remaining, hours per week required, and a "you're behind" recovery plan.

### Gleim
- Unit-state-machine view. Each unit is in one of: not started → diagnostic → study → review → ready.
- Linear and predictable. Lower-end users prefer this over the others.

**Our gap:**
We have daily assignments, but we don't expose a calendar of the next 30 days. We don't surface "you have 23 days until your exam, you need to study 14 hours per week to be ready". The agent could compute this on demand — but the learner doesn't know to ask.

**Action:**
- Add a `StudyPlan` surface that is the second nav item after `Today`.
- Show: pace indicator, exam date countdown, hours-per-week required, hours-per-week actual, and the next 7 days of generated assignments.
- The `GenerateAssignmentTool` should write into this calendar; the agent should re-plan it when the learner misses days.

---

## 3. The "explain my answer" loop — a UX archetype we are missing

Every player has some version of *"after you answer a question, you get an instant rich explanation."* The shape matters more than the content:

| Platform | Mechanism |
|---|---|
| Becker | Static written explanation + linked video segment. |
| Surgent | Written explanation + "Why am I getting these wrong?" pattern detector across attempts. |
| UWorld | Written explanation + **UAsk** chat to interrogate it further, scoped to that question. |
| Khanmigo | Socratic dialogue — won't give the answer, asks you questions. |
| Duolingo Max | "Explain My Answer" button on every miss — generative tutor explains *this specific mistake*. |
| Wiley | Bite-sized written explanation, very compact. |

**The pattern:**

```
Question → Answer → Result → [Explanation pane] + [Drill-down chat scoped to this question]
```

The explanation pane is *not* the same surface as the global tutor. It is **scoped to the artifact**: this question, this lesson, this simulation. Scope-bound chats are the breakthrough UX of 2025–2026.

**Our gap:**
We have a global agent. We have no per-artifact scoped chat. A learner who got Q4 wrong should be able to click "Why?" and land in a chat that already knows: which question, which choice they picked, why it's wrong, what concept it tests, what their history is on that concept. They should not have to re-explain.

**Action:**
- Every answered question must render a scoped chat panel (RSC) seeded with `{questionId, learnerChoice, correctChoice, conceptIds, history}`.
- The agent system prompt for that scope must be narrower: no global chit-chat, only this question and adjacent concepts.
- This is a direct mirror of Claude Code's *tool-result-bound* sub-conversations.

---

## 4. Mobile and offline — the entire Indian market is here

Indian CA prep is mobile-first. **Unacademy** and **PW (Physics Wallah)** both ship apps with:

- Live class playback with picture-in-picture.
- Offline downloads of video lectures and PDFs.
- Push notifications for live class start.
- Doubt-asking via photo upload of a workpaper (OCR → routes to faculty or AI).
- Multi-device sync of progress.
- "Notes" panel that auto-saves alongside the video timeline.
- Streaks and study-time leaderboards.

**Doroob (KSA)** is web-first but offers self-paced, 24/7, Arabic-and-English with downloadable PDFs.

**Our gap:**
We are a Next.js web app. There is no mobile app, no offline mode, no push notifications, no photo-upload doubt resolution.

**Practical implication:**
- For KSA the web app is acceptable short-term (desk-based working accountants).
- For India a web app is a non-starter for student segments. A working professional segment (which is our actual ICP) may tolerate web — but they're commuters and they want offline.

**Action (sequenced):**
1. **PWA with offline lesson content** — cheapest win. Service worker caches lessons + last 7 days of assignments. Two-week effort.
2. **Photo upload to the agent** — `SubmitWorkpaperTool` already implied by the OCR stack we have (Azure Doc Intelligence). Wire it.
3. **Push notifications** via web push first, native later.
4. **Native shell** (React Native or Capacitor) — defer until web flow is stable.

---

## 5. Question bank UX — the layer where Claude-vs-everyone-else is starkest

Every CPA player ships a **question bank as a first-class surface**:

- Filter by topic, difficulty, status (unattempted / wrong / flagged / right).
- "Build a custom test" — pick topic + count + difficulty + timed/untimed.
- Track per-question history: how many attempts, which choice each time, time spent.
- Flag for review with notes.
- Compare your timing to peer median ("you spent 2:14, peers averaged 1:36").

**UWorld in particular** treats the QBank as the *primary product* and lessons as supporting material. The reverse of the Khan Academy model.

**Our gap:**
We have no QBank surface. Assignments are generated daily, attempted once, scored. There's no library, no filter, no custom-build flow.

**Why this matters for our ICP:**
Working accountants close to exam day want to *drill*. They want 50 GST input-credit questions at hard difficulty, timed, right now. Our agent can generate those — but the surface is wrong. They don't want to chat with a tutor for 50 minutes to do it; they want a button.

**Action:**
- Add a `QBank` route. The agent backs it via `GenerateAssignmentTool`, but the *interface* is a form: topic multi-select, difficulty slider, count, timed toggle.
- This is exactly the SuperAccountant version of "the agent is calling tools the user could also call directly". Both surfaces hit the same use case.

---

## 6. Flashcards and spaced repetition — entirely absent on our side

| Platform | Flashcard feature |
|---|---|
| UWorld | ReadyDecks — pre-built decks per topic + custom decks. Spaced-repetition scheduler. |
| Becker | Digital flashcards with study modes (review, quiz, match). |
| CFA LES | Flashcards as a first-class surface, integrated with study plan. |
| Wiley | Flashcards bundled with bite-sized lessons. |
| Khanmigo | No flashcards but does Socratic recall. |
| Duolingo | The entire app *is* a spaced-repetition engine. |

**Why everyone has them:** memory is a real bottleneck for accounting (section numbers, rate tables, deadlines, IFRS standard numbers). Reasoning gets you to the answer; recall is what makes the exam survivable.

**Our gap:**
Zero flashcards. Zero spaced repetition. We have embeddings on lessons; we don't have a "facts to memorize" extraction.

**Action:**
- New context: `recall/` (or fold into `learning/`). Domain entities: `RecallCard`, `RecallSchedule`, `RecallAttempt`.
- Use SM-2 or FSRS — both are public-domain spaced-repetition algorithms.
- Extract cards from lessons at generation time (the curriculum pipeline already produces structured artifacts).
- Surface: a `Review` button on the dashboard that always has *N* cards due. Daily.

---

## 7. Live classes, doubt resolution, and the social layer

**Unacademy / PW / BYJU's** built their businesses on this. We are intentionally not building it. But:

- They have **doubt forums** (StackOverflow-like, per topic, with faculty answers).
- They have **community study groups** (Discord-adjacent).
- They have **public educator profiles** (the educator is the brand).
- They have **session attendance leaderboards**.

**Doroob (KSA)** is much more enterprise/government-flavoured: certificates from a sovereign body, employer-facing reporting, less social.

**Our positioning:**
We replace the live class with the agent. We replace the doubt forum with scoped chats. We replace the educator brand with the agent's brand. **This is fine.** But we lose three things:

1. **Social proof** — learners trust other learners. Reviews, "people who passed", testimonials.
2. **Peer benchmarking** — "you're in the top 30% of GST learners this week". This drives retention.
3. **Doubt persistence** — when 1000 learners ask the same question, faculty answer once. Our agent answers 1000 times. **Cache the answers as an FAQ surface scoped to the lesson.**

**Action:**
- A lightweight peer-benchmark widget (anonymized, percentile only) on the dashboard.
- A "common questions" panel per lesson, populated from anonymized agent conversations that the learner can opt their question into. This is a wholly-original surface that nobody has, because nobody else has the agent.

---

## 8. Bilingual + RTL — what KSA-side competitors do (and don't)

- **Doroob, SOCPA, Misk:** Arabic-first UIs, RTL throughout, but **no AI tutoring** and **no cross-locale parity** (most content is Arabic-only).
- **Western CPA players:** English-only. No RTL. No Arabic curriculum.
- **Indian players:** English + Hindi (Unacademy, PW). Some regional languages. No Arabic.
- **Coursera, edX:** subtitle-level localization, UI translated but not RTL-mirrored beautifully. Course content English-only.

**The market gap is real:** there is no bilingual EN/AR agentic accounting tutor with first-class RTL. Our CLAUDE.md correctly identifies this as a defensive moat.

**What we must be excellent at (and aren't yet, based on the rules document):**
- Logical CSS (`ms-/me-` not `ml-/mr-`) verified in CI snapshots, both directions.
- Numerals as a per-user preference, not derived from locale.
- Hijri date display alongside Gregorian for KSA users.
- Arabic typography (font choice matters: IBM Plex Sans Arabic, Noto Sans Arabic). Don't ship `Inter` for Arabic.

**Where competitors are quietly better than we'll be on day 1:**
Doroob and SOCPA have a decade of Arabic accounting terminology stabilized. We're generating ours via Perplexity + Azure. Our first 6 months of Arabic will have term inconsistencies. Mitigation: a *glossary tool* the agent must reference, populated by hand from SOCPA glossaries.

---

## 9. AI features specifically — the new arms race

| Platform | AI feature | Pattern we should steal |
|---|---|---|
| **UWorld UAsk** | In-context AI assistant scoped to the current lesson / question / video. Built on proprietary content only. | The *scoping*. The agent must not freelance — it must cite our curriculum. |
| **Khanmigo** | Socratic-method tutor that refuses to give answers. Reads context from the page the student is on. | The refusal mechanic. Some of our tools should refuse to spoil. |
| **Duolingo Max** | "Explain My Answer" (now free) + "Roleplay" (paid). | Roleplay. *We* should have client-roleplay: practice talking to a client about VAT registration. |
| **Coursera Coach** | One-on-one tutor, career-guidance pathing, instructor-built Socratic dialogues. | The *instructor-built dialogues*. Faculty can pre-author a tool config for a tricky concept. |
| **Becker Adapt2U** | Adaptive recommender. No conversational AI. | Nothing to steal — we are ahead here. |
| **Surgent A.S.A.P.** | Adaptive plan, no conversational AI. | Same. |
| **Gleim SmartAdapt** | Adaptive recommender. No conversational AI. | Same. |
| **CFA LES** | No AI. Statistical adaptivity only. | Same. |

**The unambiguous take:**
- On *adaptive routing*, the CPA players are a year or two ahead of us. We need to ship the basics (predicted score, pace tracker, replan-on-miss) before our agentic story is credible.
- On *conversational AI*, only UWorld UAsk, Khanmigo, and Coursera Coach are real competitors. UAsk is the closest analog because it's domain-locked.
- The **roleplay** pattern from Duolingo Max is a *huge* unlock for accounting. "Roleplay as a CFO asking the auditor a hard question." "Roleplay as a ZATCA inspector reviewing my e-invoice file." Tutoring sub-agent. Cheap to build, expensive for competitors to copy.

**Action:**
- Add a `RoleplayClientTool` and a `RoleplayInspectorTool`. These are sub-agents with their own system prompts. Two weeks of work, immediate differentiator.

---

## 10. The flows we lose on, ranked

This is the section to read if you have five minutes.

1. **First-time login → first session.** Their onboarding ends with *"here is your study plan, here's what to do today, the timer starts now"*. Ours ends with *"chat with the agent."* Their onboarding converts; ours intimidates the older accountant segment.
2. **Question wrong → understanding gained.** Theirs: instant explanation, deep-link to lesson, one-click "add to review deck". Ours: chat with agent and hope.
3. **"I have 15 minutes" use case.** Theirs: a button. Ours: a conversation.
4. **"How am I doing?" use case.** Theirs: a dashboard with a number. Ours: a conversation.
5. **"What's tomorrow?" use case.** Theirs: a calendar. Ours: a generated assignment that doesn't exist yet.
6. **"I missed three days."** Theirs: automatic replan with a banner. Ours: silent — the daily cron generates today's assignment regardless.
7. **"Drill me on input VAT."** Theirs: filter the QBank, hit start. Ours: ask the agent to generate, wait for streaming, take the assignment.
8. **"Read on the commute."** Theirs: offline mobile. Ours: online web only.

**The pattern:** competitors built *direct manipulation* surfaces for predictable user intents. We built a chat. Chat is where intent is *unclear*. When intent is clear, a button beats a chat every time.

This is the single most important insight in this document.

> **Build the buttons. Keep the agent.** The agent's job is to compose and trigger the same tools the buttons trigger — not to *replace* the buttons. This is exactly Claude Code's pattern: the slash-commands and the agent share a tool registry.

---

## 11. UI polish — small things that compound

Things the competitors do well that are not strategic but cumulatively professional:

- **UWorld** — keyboard shortcuts on the question screen (A/B/C/D, Enter, M for mark, F for flag). Power users live here.
- **Becker** — printable progress reports for employers. CFO-funded learners need this. Ours: nothing.
- **Surgent** — "Pause my plan, I'm on vacation Aug 4–14". Calendar respects it. Ours: no concept of pause.
- **CFA LES** — accessibility-grade UI, screen-reader-tested, WCAG AA. We need parity for KSA government procurement.
- **Khanmigo** — voice in/out. Big for accessibility and for AR learners with low typing speed in English.
- **Wiley** — print mode for the textbook. Sounds quaint; KSA seniors love it.
- **Duolingo** — celebration micro-animations on streak milestones. We have streaks; do we celebrate them?
- **Coursera** — career-pathing recommendations. "You finished VAT, here are the next three modules for an indirect-tax career." Real B2B story.
- **All of them** — a public `/verify/[hash]` certificate page that looks *credible*. Ours is planned. Make sure the verify page itself looks like a government page, not a SaaS marketing page. For SOCPA-aligned learners, the verify page is the product.

---

## 12. Infrastructure differences (briefly)

Most of these we've already chosen well. Two callouts:

- **UWorld and Becker have mobile apps with deep offline-sync.** This is a hard engineering problem (CRDT-ish state, video DRM, license expiry). We are deferring. Document the deferral.
- **Surgent and UWorld track per-question telemetry at very fine granularity** (mouse hover, time on stem, time on each option). They use it for difficulty calibration. We log at the attempt level. **Action:** add timing telemetry per question stem and per option-view, scoped behind consent.
- **Most competitors are still 2-tier (monolith + DB).** Our DDD-modular NestJS approach is fine and arguably overbuilt for this market; the discipline is worth it for the agent layer.

---

## 13. The honest scoreboard

Where we are **clearly ahead**:

- Agentic-first architecture and tool registry (no competitor has this).
- Bilingual EN/AR with RTL as a first-class concern (no competitor has both).
- Locale-aware curriculum bounded contexts (no competitor has both India and KSA seriously).
- Memory files per learner (only Khanmigo has anything similar, and only at the platform level).
- Plan mode for study plans (nobody has this conceptually — they have planners, not plans-as-proposals).

Where we are **clearly behind**:

- Predicted score / time-to-ready widgets.
- Study-plan-as-canvas (we have session-as-canvas).
- Question bank as a directly-manipulable surface.
- Flashcards and spaced repetition.
- Mobile / offline / push.
- Per-question scoped chats.
- "Pause my plan" and pace-tracker UI.
- Printable employer reports.
- Roleplay sub-agents.
- Anonymized peer benchmarking.

Where it is **a real fight**:

- Adaptive routing quality. CPA incumbents have years of telemetry. We have to bootstrap. Our agent can paper over this in the short term ("the agent picks the next question based on conversation history"), but the *signal* underneath has to catch up.

---

## 14. Recommended sequencing (90 days)

1. **Weeks 1–2:** Predicted readiness widget + pace tracker on dashboard. Cheap, visible, signals seriousness.
2. **Weeks 2–4:** Per-question scoped chat panel (RSC component, scope-bound system prompt).
3. **Weeks 4–6:** Study-plan calendar surface (the second nav item). Replan-on-miss banner.
4. **Weeks 6–8:** Question bank surface + filter + custom-test builder, backed by the same tools the agent uses.
5. **Weeks 8–10:** Flashcards / spaced repetition (SM-2 first, FSRS later). Auto-extracted from lessons.
6. **Weeks 10–12:** PWA offline mode + push notifications. Roleplay sub-agents.

This sequence prioritizes flows where competitors beat us in obvious five-second comparisons. It does *not* prioritize curriculum coverage, depth of content, or new features unique to us — those should run on a parallel track owned by curriculum.

---

## 15. Sources

- [Becker — Adapt2U adaptive learning](https://www.becker.com/blog/cpa/adapt2u-cpa-exam-review-technology)
- [Becker — Customized Learning](https://www.becker.com/cpa-review/customized-learning)
- [Surgent — A.S.A.P. technology](https://www.surgentcpareview.com/about-the-cpa-exam-review-course/asap-technology/)
- [Atlas CPA Index — Surgent review 2026](https://atlascpaindex.com/reviews/surgent)
- [UWorld CPA Review](https://accounting.uworld.com/cpa-review/)
- [UWorld — UAsk AI study assistant](https://newsroom.uworld.com/story/uask-ai-powered-study-assistant-uworld-cpa-courses-cpa-exam-prep/)
- [Wiley CPAexcel — bite-sized lessons](https://ipassthecpaexam.com/wiley-cpa-review-cpaexcel/)
- [Gleim — SmartAdapt](https://www.gleim.com/cpa-review/blog/how-does-smartadapt-work/)
- [CFA Program Learning Ecosystem](https://www.cfainstitute.org/programs/cfa-program/learning-ecosystem)
- [Khanmigo — Khan Academy AI tutor](https://www.khanmigo.ai/)
- [Khan Academy AI in education UX — Medium](https://medium.com/@blessingokpala/ai-in-education-ux-how-khan-academy-is-shaping-human-ai-learning-experiences-9ec3492dbcc7)
- [Duolingo Max — GPT-4 features](https://blog.duolingo.com/duolingo-max/)
- [Coursera Coach — AI-powered features](https://blog.coursera.org/announcing-ai-powered-capabilities-enabling-educators-to-use-coursera-coach-to-deliver-interactive-personalized-instruction/)
- [Unacademy — pricing and features](https://www.softwaresuggest.com/unacademy)
- [ICAI Digital Learning Hub](https://learning.icai.org/iDH/icai/Dashboard/Learner)
- [Physics Wallah PW Skills](https://pwskills.com/)
- [SOCPA — Saudi Organization for Chartered and Professional Accountants](https://socpa.org.sa/socpa/home.aspx?lang=en-us)
- [Doroob — Saudi e-learning platform](https://www.hrdf.org.sa/en/products-and-services/programs/individuals/training/online-training-doroob-individuals/)
- [LMS gamification trends 2026 — LMSPedia](https://lmspedia.org/gamification-in-lms-the-complete-2026-guide/)
- [Mobile-first LMS platforms 2026 — Disco](https://www.disco.co/blog/best-mobile-first-lms-platforms-2026)
- [AccountingCoach](https://www.accountingcoach.com/)
