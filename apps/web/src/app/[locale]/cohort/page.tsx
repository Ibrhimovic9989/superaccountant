import { Logo } from '@/components/brand/logo'
import { EnrollForm } from '@/components/cohort/enroll-form'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { createMarketingLead } from '@/lib/data/leads'
import type { SupportedLocale } from '@sa/i18n'
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Headphones,
  IndianRupee,
  MapPin,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'

/**
 * Public cohort details page. Lead-gen target from /quiz and any
 * marketing channel. Single-file marketing layout — hero, what you'll
 * learn, who it's for, format, schedule, instructors, placement, FAQs,
 * enrollment form at the bottom.
 *
 * Lead capture writes to MarketingLead with source='/cohort'.
 */
export default async function CohortPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params

  async function submit(args: {
    name: string
    email: string
    phone: string
    goal: string
  }) {
    'use server'
    const name = args.name?.trim() ?? ''
    const email = args.email?.trim().toLowerCase() ?? ''
    const phone = args.phone?.trim() ?? ''
    if (name.length < 2) throw new Error('Name is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid email is required')
    if (phone.replace(/\D/g, '').length < 7) throw new Error('Valid phone is required')

    const hdrs = await headers()
    await createMarketingLead({
      name,
      email,
      phone,
      source: '/cohort',
      // Re-use the quizAnswers JSONB slot for the "why you're joining"
      // intent — same shape as the quiz-derived jobGoal field.
      quizAnswers: { jobGoal: args.goal },
      locale,
      userAgent: hdrs.get('user-agent') ?? null,
    })
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        {/* ── Brand header ──────────────────────────────────── */}
        <BlurFade delay={0.02}>
          <Link href={`/${locale}/cohort`} className="mb-10 inline-flex items-center gap-2.5">
            <Logo size="sm" />
          </Link>
        </BlurFade>

        {/* ── Hero ───────────────────────────────────────────── */}
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <Sparkles className="h-3 w-3 text-accent" />
            45-day offline cohort · India
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            Superaccountant — Get Job Ready
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-5 max-w-2xl text-lg text-fg-muted sm:text-xl">
            Become a hireable accountant in 45 days. Real classroom + real instructors, backed by an
            AI tutor in your pocket. No CA exam required.
          </p>
        </BlurFade>
        <BlurFade delay={0.2}>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-4 text-base font-medium text-bg transition-colors hover:bg-accent/90"
            >
              Apply for the next cohort
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </a>
            <Link
              href={`/${locale}/quiz`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-elev px-6 py-4 text-base font-medium text-fg transition-colors hover:bg-bg-overlay"
            >
              Take the 2-minute quiz first
            </Link>
          </div>
        </BlurFade>

        {/* ── Quick facts strip ──────────────────────────────── */}
        <BlurFade delay={0.25}>
          <div className="mt-12 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:grid-cols-4">
            <Fact icon={<Clock className="h-4 w-4" />} label="Duration" value="45 days" />
            <Fact icon={<MapPin className="h-4 w-4" />} label="Format" value="Offline + app" />
            <Fact icon={<Users className="h-4 w-4" />} label="Cohort size" value="~30 students" />
            <Fact icon={<Trophy className="h-4 w-4" />} label="Placement" value="Included" />
          </div>
        </BlurFade>

        {/* ── Who it's for ───────────────────────────────────── */}
        <Section
          delay={0.3}
          eyebrow="Who this is for"
          title="Built for the people most other programs ignore"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Persona
              emoji="🎓"
              title="Graduates"
              body="Commerce / non-commerce graduates looking for their first proper job. We don't care about your percentage — we care about your effort."
            />
            <Persona
              emoji="🔁"
              title="Career switchers"
              body="Working in sales, ops, BPO, or anything else and want to move into accounting? 45 days closes the gap."
            />
            <Persona
              emoji="🏪"
              title="Small business owners"
              body="Tired of depending on your CA for every little thing? Run your own books with confidence."
            />
          </div>
        </Section>

        {/* ── What you'll learn ──────────────────────────────── */}
        <Section
          delay={0.35}
          eyebrow="Curriculum"
          title="Everything you need to start booking entries on day 46"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Curriculum
              icon={<BookOpen className="h-4 w-4" />}
              title="Accounting fundamentals"
              body="Double-entry, journals, ledgers, trial balance, P&L, balance sheet — taught the way a working accountant actually uses them."
            />
            <Curriculum
              icon={<IndianRupee className="h-4 w-4" />}
              title="Tally Prime end-to-end"
              body="Install, masters, vouchers (sales/purchase/payment/receipt), inventory, GST, TDS, payroll, year-end."
            />
            <Curriculum
              icon={<Award className="h-4 w-4" />}
              title="GST + TDS compliance"
              body="GSTR-1 and 3B end-to-end, 2B reconciliation, TDS sections 192/194A/C/H/I/J, Form 26Q filing."
            />
            <Curriculum
              icon={<Briefcase className="h-4 w-4" />}
              title="Excel for accountants"
              body="VLOOKUP, pivots, IF, SUMIFS — the 20 functions that make 80% of an accountant's spreadsheet work."
            />
            <Curriculum
              icon={<GraduationCap className="h-4 w-4" />}
              title="Zoho Books + QuickBooks intro"
              body="Most jobs ask for at least one cloud tool. We give you working knowledge of both for the interview."
            />
            <Curriculum
              icon={<MessageCircle className="h-4 w-4" />}
              title="Interview + placement prep"
              body="Resume rebuild, mock interviews, common accounting interview questions, salary negotiation basics."
            />
          </div>
        </Section>

        {/* ── How it works ───────────────────────────────────── */}
        <Section delay={0.4} eyebrow="Format" title="Real classroom + AI in your pocket">
          <div className="grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              icon={<MapPin className="h-4 w-4" />}
              title="Offline classes"
              body="3-hour evening sessions, Monday–Saturday, with an experienced instructor. Hands-on Tally + Excel from day one."
            />
            <Step
              n={2}
              icon={<Sparkles className="h-4 w-4" />}
              title="AI tutor at night"
              body="24/7 AI tutor on the Superaccountant app. Daily homework personalised to what you struggled with. Bilingual — English or Hindi."
            />
            <Step
              n={3}
              icon={<Headphones className="h-4 w-4" />}
              title="Live doubt support"
              body="WhatsApp group with your instructor + cohort. Get a real human in under 4 hours, any weekday."
            />
          </div>
        </Section>

        {/* ── Schedule ───────────────────────────────────────── */}
        <Section
          delay={0.45}
          eyebrow="Schedule"
          title="Daily rhythm so the habit forms before the cohort ends"
        >
          <div className="rounded-2xl border border-border bg-bg-elev/40 p-6 sm:p-8">
            <div className="space-y-4">
              <Schedule
                time="6:30 PM – 9:30 PM"
                day="Mon – Sat"
                what="Offline classroom — concept, demo, hands-on practice"
              />
              <Schedule
                time="10:00 PM – 11:00 PM"
                day="Every night"
                what="AI tutor homework — 5 practice questions tuned to your weak areas"
              />
              <Schedule
                time="Sunday"
                day="Optional"
                what="Doubt-clearing session + practice tests + placement workshops"
              />
              <Schedule
                time="Day 46+"
                day="Placement"
                what="Mock interviews, resume reviews, employer introductions"
              />
            </div>
          </div>
        </Section>

        {/* ── Placement ──────────────────────────────────────── */}
        <Section
          delay={0.5}
          eyebrow="Placement"
          title="We don't hand you a certificate and wave goodbye"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Bullet>
              <strong>Resume rebuild.</strong> One-on-one session to write a resume that actually
              gets responses for accounting roles.
            </Bullet>
            <Bullet>
              <strong>Mock interviews.</strong> 3 mock interviews with real accountants + recruiters
              before you ever sit in front of an employer.
            </Bullet>
            <Bullet>
              <strong>Hiring partner intros.</strong> CA firms, SMEs, e-commerce companies, and
              shared-service centres actively looking for entry-level accountants.
            </Bullet>
            <Bullet>
              <strong>Salary negotiation.</strong> Most freshers under-negotiate by ₹40k+ a year. We
              show you how to ask for what the market actually pays.
            </Bullet>
          </div>
        </Section>

        {/* ── Certificate ────────────────────────────────────── */}
        <Section delay={0.55} eyebrow="Certificate" title="Verified, signed, can't be faked">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-bg-elev/40 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent-soft">
              <Award className="h-8 w-8 text-accent" />
            </div>
            <p className="text-base text-fg-muted sm:text-lg">
              Each certificate is hash-signed and verifiable at a public URL. Employers can confirm
              authenticity in one click — no PDF forgery possible. It's not just a piece of paper;
              it's a record you can defend in any interview.
            </p>
          </div>
        </Section>

        {/* ── FAQs ───────────────────────────────────────────── */}
        <Section delay={0.6} eyebrow="FAQs" title="The questions everyone asks before applying">
          <div className="space-y-3">
            <Faq q="I'm not from a commerce background. Can I still join?">
              Yes. The first week is a fast crash course on debit/credit fundamentals. By week 2
              you'll be at the same level as commerce graduates. We've placed students from
              engineering, BBA, BA, and even arts backgrounds.
            </Faq>
            <Faq q="Do I need to know Tally already?">
              No. We start from "how to install Tally Prime" and build to "file GSTR-3B from a
              month's worth of vouchers." Total hand-holding for the first week.
            </Faq>
            <Faq q="What kind of jobs do graduates get?">
              Junior accountant, accounts executive, accounts assistant, audit associate. Typical
              starting salary: ₹2.2L – ₹3.6L p.a. for freshers in Tier 2 / Tier 3 cities, ₹3.0L –
              ₹4.5L in Tier 1.
            </Faq>
            <Faq q="What's the fee structure?">
              Limited information online — we walk you through it on the application call. There's a
              flexible payment plan (3 / 6 EMIs) and a placement-linked option for graduates from
              financially-constrained backgrounds.
            </Faq>
            <Faq q="What if I miss a class?">
              Every classroom session is also recorded. Your AI tutor on the app has full curriculum
              context so you can catch up at your own pace. Miss more than 6 classes in the 45 days,
              though, and we'll have a chat about whether this is the right time.
            </Faq>
            <Faq q="Is placement guaranteed?">
              Honest answer: no. What's guaranteed is the support — resume rebuild, 3 mocks, hiring
              partner intros, salary negotiation help. Whether you land depends on you doing the
              work. ~80% of our graduates have a job within 90 days of the cohort ending.
            </Faq>
          </div>
        </Section>

        {/* ── Apply form ─────────────────────────────────────── */}
        <section id="apply" className="mt-20 scroll-mt-12">
          <BlurFade delay={0.7}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Sparkles className="h-3 w-3 text-accent" />
              Apply
            </div>
          </BlurFade>
          <BlurFade delay={0.72}>
            <EnrollForm submit={submit} />
          </BlurFade>
        </section>

        <footer className="mt-20 border-t border-border pt-8 text-center text-xs text-fg-subtle">
          <p>
            Superaccountant · Built for the people most other programs ignore · Bilingual (EN /
            हिंदी)
          </p>
        </footer>
      </main>

      {/* Subtle background glow on the apply form */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <BorderBeam size={200} duration={20} colorFrom="#a78bfa" colorTo="#8b5cf6" />
      </div>
    </div>
  )
}

// ── Reusable little sub-components ────────────────────────────

function Section({
  delay,
  eyebrow,
  title,
  children,
}: {
  delay: number
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-20">
      <BlurFade delay={delay}>
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </BlurFade>
      <BlurFade delay={delay + 0.04}>
        <div className="mt-6">{children}</div>
      </BlurFade>
    </section>
  )
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        <span className="text-accent">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function Persona({
  emoji,
  title,
  body,
}: {
  emoji: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5 sm:p-6">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  )
}

function Curriculum({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{body}</p>
        </div>
      </div>
    </div>
  )
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev/40 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">Step {n}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  )
}

function Schedule({ time, day, what }: { time: string; day: string; what: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-center gap-2 sm:w-56">
        <Calendar className="h-3.5 w-3.5 text-accent" />
        <p className="font-mono text-xs uppercase tracking-wider text-fg-muted">
          {time} <span className="text-fg-subtle">· {day}</span>
        </p>
      </div>
      <p className="text-sm text-fg sm:text-base">{what}</p>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-bg-elev/40 p-5">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <p className="text-sm leading-relaxed text-fg-muted sm:text-base">{children}</p>
    </div>
  )
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border bg-bg-elev/40 p-5 sm:p-6">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-base font-medium tracking-tight">
        {q}
        <span className="font-mono text-xl text-fg-subtle transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted sm:text-base">{children}</p>
    </details>
  )
}
