import { Footer } from '@/components/footer'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { MarketingNav } from '@/components/marketing-nav'
import { Button } from '@/components/ui/button'
import { appLink } from '@/lib/config'
import type { SupportedLocale } from '@sa/i18n'
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Calendar,
  Check,
  CircleDot,
  Clock,
  FileText,
  Flame,
  GitBranch,
  Languages,
  Network,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react'

const COPY = {
  en: {
    eyebrow: 'Features',
    title: 'Real classroom. AI tutor in your pocket. 45 days to job-ready.',
    subtitle:
      'Our cohorts pair an evening offline classroom with a 24/7 AI tutor that knows your exact curriculum — so what you learn at 7 PM gets reinforced at 11 PM with personalised practice.',
    primaryCta: 'Reserve seat — from ₹24,999',

    sections: [
      {
        eyebrow: 'Offline classroom',
        title: 'Real instructor. Real laptops. Real vouchers.',
        body: 'Monday–Saturday, 6:30–9:30 PM, in a real room with a real instructor. Hands-on Tally Prime (Indian cohort) or Zoho Books (Saudi cohort) from day one. The fastest way to build accounting muscle memory is doing the work, not watching it.',
        bullets: [
          '3-hour evening sessions, 6 days a week',
          'Cohort size capped at 30 — no auditorium classes',
          'Every session recorded for catch-up',
          'WhatsApp doubt-clearing with your instructor',
        ],
        icon: 'placement',
      },
      {
        eyebrow: 'AI tutor',
        title: 'A real tutor with real tools.',
        body: 'Most "AI tutors" are ChatGPT with a system prompt. Ours is an agent loop — the model can search your curriculum, grade your scenario answer with a rubric, look up a regulation, generate practice questions, and remember what you struggled with in class today.',
        bullets: [
          'Streaming responses, never a wall of text',
          'Cites the lesson it learned from',
          "Will say 'I don't know' instead of guessing",
          'Remembers your gaps across sessions',
        ],
        icon: 'agent',
      },
      {
        eyebrow: 'Daily plan',
        title: 'Tonight, not someday.',
        body: 'After every class, the AI tutor generates a 3-item plan tuned to what you struggled with that day: one spaced review, one weak-area drill, one extension exercise. ~15 minutes of focused practice while the day’s lesson is still fresh.',
        bullets: [
          'Generated nightly after class',
          'Mix of review, weak-area, and extension',
          'Approximately five minutes per item',
          'Streaks track your consistency',
        ],
        icon: 'daily',
      },
      {
        eyebrow: 'Bilingual',
        title: 'Arabic and English. Equal weight.',
        body: "Every lesson, every prompt, every diagram, every certificate ships in both languages. RTL is not a stylesheet — it's a rendering mode the agent respects end to end.",
        bullets: [
          'Switch language at any moment',
          'Tutor responds in your session language',
          'Mermaid diagrams labeled in both languages',
          'Hijri dates available alongside Gregorian',
        ],
        icon: 'bilingual',
      },
      {
        eyebrow: 'Lessons',
        title: 'Watch. Read. Diagram. Practice.',
        body: 'Every lesson is built around four loops: a video walkthrough, a written explanation, a mermaid flowchart or mindmap, and an eight-question practice set. The tutor is on the side rail the entire time.',
        bullets: [
          'Video narration in EN + AR',
          'Mermaid flowcharts and mindmaps',
          'Eight-question practice per lesson',
          'Tutor drawer one keystroke away',
        ],
        icon: 'lessons',
      },
      {
        eyebrow: 'Certificate',
        title: 'Verifiable by anyone, anywhere.',
        body: 'When you pass the grand test, we issue a HMAC-signed certificate with a public verification page. Anyone with the link can confirm it — no login, no API key, no recruiter contact form.',
        bullets: [
          'HMAC-signed certificate hash',
          'Public verification page',
          'QR code for offline verification',
          'PDF download in EN or AR',
        ],
        icon: 'cert',
      },
    ],

    // Capability grid
    gridLabel: 'And the things you expected.',
    grid: [
      { icon: 'spaced', title: 'Spaced repetition', body: 'Review surfaces what is fading.' },
      { icon: 'streak', title: 'Streaks', body: 'Daily consistency, not weekend cramming.' },
      {
        icon: 'mastery',
        title: 'Mastery scoring',
        body: 'Per-topic mastery curve, not a single grade.',
      },
      {
        icon: 'rubric',
        title: 'Rubric grading',
        body: 'Scenarios graded against a rubric, not a regex.',
      },
      {
        icon: 'mermaid',
        title: 'Mermaid diagrams',
        body: 'Every lesson has a flowchart and a mindmap.',
      },
      {
        icon: 'memory',
        title: 'Memory files',
        body: 'The tutor maintains a profile of your strengths.',
      },
      {
        icon: 'tools',
        title: '6 tools at the agent',
        body: 'Search, assess, explain, lookup, recommend, generate.',
      },
      {
        icon: 'audit',
        title: 'Source citations',
        body: 'Every claim cites the lesson it came from.',
      },
    ],

    finalTitle: 'Two cohorts. 30 seats each. Reserve before they fill.',
    finalSubtitle:
      'iA26 (Indian Chartered, Hyderabad) starts 1 June 2026. sA26 (Saudi Mu’tamad, Riyadh) starts 1 July 2026.',
    finalCta: 'Reserve seat — from ₹24,999',
  },

  ar: {
    eyebrow: 'الميزات',
    title: 'فصل دراسي حقيقي. مدرس ذكي في جيبك. ٤٥ يومًا لتكون جاهزًا للعمل.',
    subtitle:
      'دفعاتنا تجمع فصلًا دراسيًا حضوريًا مسائيًا مع مدرس ذكي على مدار الساعة يعرف منهجك بدقة — فما تتعلمه في السابعة مساءً يُعزَّز في الحادية عشرة بتمارين شخصية.',
    primaryCta: 'احجز مقعدك — من ₹24,999',

    sections: [
      {
        eyebrow: 'الفصل الحضوري',
        title: 'مدرّب حقيقي. أجهزة حقيقية. قيود حقيقية.',
        body: 'الإثنين-السبت، ٦:٣٠-٩:٣٠ مساءً، في غرفة حقيقية مع مدرّب حقيقي. تطبيق عملي على Tally Prime (الدفعة الهندية) أو Zoho Books (الدفعة السعودية) من اليوم الأول. أسرع طريق لبناء ذاكرة المحاسبة العضلية هو العمل، لا المشاهدة.',
        bullets: [
          'جلسات مسائية ٣ ساعات، ٦ أيام أسبوعيًا',
          'حجم الدفعة محدود بـ٣٠ — لا فصول مدرّجة',
          'كل جلسة تُسجَّل للاستدراك',
          'قناة واتساب لحل الإشكالات مع المدرّب',
        ],
        icon: 'placement',
      },
      {
        eyebrow: 'المدرس الذكي',
        title: 'مدرس حقيقي بأدوات حقيقية.',
        body: 'معظم "المدرسين الذكيين" مجرد ChatGPT بتعليمات. لدينا حلقة وكيل — يبحث في منهجك، يصحح إجاباتك بمعايير، يبحث عن الأنظمة، يولّد تمارين، ويتذكر ما واجهت من صعوبات في الفصل اليوم.',
        bullets: [
          'استجابات متدفقة، لا جدار نصوص',
          'يستشهد بالدرس الفعلي',
          'يقول "لا أعرف" بدلًا من التخمين',
          'يتذكر فجواتك عبر الجلسات',
        ],
        icon: 'agent',
      },
      {
        eyebrow: 'الخطة الليلية',
        title: 'الليلة، لا يومًا ما.',
        body: 'بعد كل فصل، يولّد المدرس الذكي خطة من ٣ عناصر مخصصة لما واجهت من صعوبات في اليوم: مراجعة متباعدة، تمرين على نقطة ضعف، تمرين توسعي. ~١٥ دقيقة من التمرين المركّز بينما الدرس لا يزال طازجًا.',
        bullets: [
          'تُولَّد ليليًا بعد الفصل',
          'مزيج من المراجعة والضعف والتوسع',
          'خمس دقائق تقريبًا لكل عنصر',
          'السلاسل تتتبع التزامك',
        ],
        icon: 'daily',
      },
      {
        eyebrow: 'ثنائي اللغة',
        title: 'العربية والإنجليزية. وزن متساوٍ.',
        body: 'كل درس وتعليمة ورسم وشهادة بالعربية والإنجليزية. RTL ليس مجرد أنماط، بل وضع عرض يحترمه الوكيل من البداية إلى النهاية.',
        bullets: [
          'بدّل اللغة في أي لحظة',
          'يستجيب الوكيل بلغة جلستك',
          'الرسوم البيانية بكلتا اللغتين',
          'تواريخ هجرية بجانب الميلادية',
        ],
        icon: 'bilingual',
      },
      {
        eyebrow: 'الدروس',
        title: 'شاهد. اقرأ. ارسم. تمرّن.',
        body: 'كل درس مبني حول أربع حلقات: عرض فيديو، شرح مكتوب، مخطط mermaid، ومجموعة تمارين من ثمانية أسئلة. المدرس على الجانب طوال الوقت.',
        bullets: [
          'تعليق صوتي بالعربية والإنجليزية',
          'مخططات Mermaid ورسوم ذهنية',
          'ثمانية أسئلة تمرين لكل درس',
          'لوحة المدرس على بُعد ضغطة',
        ],
        icon: 'lessons',
      },
      {
        eyebrow: 'الشهادة',
        title: 'قابلة للتحقق من أي شخص.',
        body: 'عند اجتيازك الاختبار الكبير، نصدر شهادة موقعة بـ HMAC مع صفحة تحقق علنية. أي شخص لديه الرابط يمكنه التحقق — بدون تسجيل دخول.',
        bullets: [
          'توقيع HMAC للشهادة',
          'صفحة تحقق علنية',
          'رمز QR للتحقق دون اتصال',
          'تنزيل PDF بالعربية أو الإنجليزية',
        ],
        icon: 'cert',
      },
    ],

    gridLabel: 'وكل الأشياء التي توقعتها.',
    grid: [
      { icon: 'spaced', title: 'مراجعة متباعدة', body: 'تظهر ما بدأ يتلاشى.' },
      { icon: 'streak', title: 'سلاسل', body: 'التزام يومي، لا حشو في عطلة الأسبوع.' },
      { icon: 'mastery', title: 'درجة إتقان', body: 'منحنى إتقان لكل موضوع، لا درجة واحدة.' },
      { icon: 'rubric', title: 'تصحيح بمعايير', body: 'سيناريوهات تُصحَّح بمعايير، لا regex.' },
      { icon: 'mermaid', title: 'مخططات Mermaid', body: 'كل درس يحتوي على مخطط ورسم ذهني.' },
      { icon: 'memory', title: 'ملفات الذاكرة', body: 'يحتفظ المدرس بملف عن نقاط قوتك.' },
      { icon: 'tools', title: '٦ أدوات للوكيل', body: 'بحث، تقييم، شرح، استعلام، توصية، توليد.' },
      { icon: 'audit', title: 'استشهادات المصادر', body: 'كل ادعاء يستشهد بدرسه.' },
    ],

    finalTitle: 'دفعتان. ٣٠ مقعدًا لكل دفعة. احجز قبل الامتلاء.',
    finalSubtitle:
      'iA26 (الهندي، حيدر آباد) تبدأ ١ يونيو ٢٠٢٦. sA26 (السعودي، الرياض) تبدأ ١ يوليو ٢٠٢٦.',
    finalCta: 'احجز مقعدك — من ₹24,999',
  },
} as const

const SECTION_ICONS = {
  placement: Target,
  agent: Brain,
  daily: Calendar,
  bilingual: Languages,
  lessons: BookOpen,
  cert: Award,
} as const

const GRID_ICONS = {
  spaced: Clock,
  streak: Flame,
  mastery: Target,
  rubric: FileText,
  mermaid: Network,
  memory: GitBranch,
  tools: Wrench,
  audit: Search,
} as const

export default async function FeaturesPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const t = COPY[locale]

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg text-fg">
      <DotPattern
        glow
        className="[mask-image:radial-gradient(ellipse_at_top,white,transparent_60%)] text-fg-subtle/40"
      />
      <MarketingNav locale={locale} />

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <BlurFade delay={0.05}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" />
            {t.eyebrow}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {t.title}
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            {t.subtitle}
          </p>
        </BlurFade>
      </main>

      {/* Long-form sections */}
      <section className="relative z-10 mx-auto max-w-6xl space-y-32 px-6 py-20">
        {t.sections.map((s, i) => {
          const Icon = SECTION_ICONS[s.icon as keyof typeof SECTION_ICONS]
          const reverse = i % 2 === 1
          return (
            <BlurFade key={s.title} delay={0.05}>
              <div
                className={`grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20 ${
                  reverse ? 'lg:[&>div:first-child]:order-2' : ''
                }`}
              >
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                    <Icon className="h-3 w-3 text-accent" />
                    {s.eyebrow}
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {s.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-fg-muted">{s.body}</p>
                  <ul className="mt-6 space-y-3">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-sm text-fg-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev/50 p-6 backdrop-blur sm:p-8">
                  <div className="bg-grid pointer-events-none absolute inset-0 opacity-25 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
                  <div className="relative">
                    <FeatureMock kind={s.icon as MockKind} locale={locale} />
                  </div>
                  <BorderBeam size={140} duration={11} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                </div>
              </div>
            </BlurFade>
          )
        })}
      </section>

      {/* Capability grid */}
      <section className="relative z-10 border-t border-border bg-bg-elev/30 py-28 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <BlurFade delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <CircleDot className="h-3 w-3 text-accent" />
              {locale === 'ar' ? 'القدرات' : 'Capabilities'}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t.gridLabel}
            </h2>
          </BlurFade>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {t.grid.map((item, i) => {
              const Icon = GRID_ICONS[item.icon as keyof typeof GRID_ICONS]
              return (
                <BlurFade key={item.title} delay={0.05 + i * 0.04}>
                  <div className="h-full rounded-2xl border border-border bg-bg-elev/50 p-6 backdrop-blur">
                    <Icon className="h-4 w-4 text-accent" />
                    <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{item.body}</p>
                  </div>
                </BlurFade>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-28 text-center">
        <BlurFade delay={0.05}>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted">{t.finalSubtitle}</p>
          <div className="mt-10 flex justify-center">
            <div className="relative inline-flex">
              <Button asChild variant="accent" size="lg" className="relative overflow-hidden">
                <a href={appLink(locale, '/cohort#apply')}>
                  {t.finalCta}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  <BorderBeam size={56} duration={6} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                </a>
              </Button>
            </div>
          </div>
        </BlurFade>
      </section>

      <Footer locale={locale} />
    </div>
  )
}

// ─── Feature mockups ────────────────────────────────────────
// Inline UI snapshots that mirror the real product surfaces.
// No screenshots — these are real components built from tokens
// so they stay pixel-sharp at any zoom and respect dark/RTL.

type MockKind = 'placement' | 'agent' | 'daily' | 'bilingual' | 'lessons' | 'cert'

const MOCK_COPY = {
  en: {
    // placement
    placementHeader: 'Placement test · KSA',
    placementProgress: 'Question 7 of 12',
    placementTopic: 'Topic',
    placementTopicVal: 'ZATCA',
    placementDifficulty: 'Difficulty',
    placementDifficultyVal: 'medium',
    placementPrompt:
      'A taxable supply of SAR 10,000 is made to an unregistered customer in Riyadh. What is the VAT to charge?',
    placementChoices: ['SAR 0', 'SAR 500', 'SAR 1,500', 'SAR 1,000'],
    placementSubmit: 'Submit',
    // agent
    agentHeader: 'AI Tutor · Live',
    agentUser: 'Why does ZATCA require XML invoices, not PDF?',
    agentTool: 'search_curriculum · 1 hit',
    agentBoldA: 'structured',
    agentAssistantA: 'ZATCA Phase 2 mandates ',
    agentAssistantB:
      " invoices because tax authorities can't audit pixels. XML lets the system validate every field at the moment of issuance.",
    agentCite: 'Lesson: ZATCA Phase 2 §3.1',
    // daily
    dailyHeader: "Today's plan · Tuesday",
    dailySub: '3 items · ~15 minutes',
    dailyKindReview: 'Spaced repetition',
    dailyKindWeak: 'Weak area',
    dailyKindNew: 'New lesson',
    dailyTitleReview: 'Input VAT credit · review',
    dailyTitleWeak: 'TDS on professional fees',
    dailyTitleNew: 'Reverse charge mechanism',
    // bilingual
    bilingualEnTitle: 'Input VAT credit',
    bilingualEnBody:
      'A registered taxpayer can claim credit for VAT paid on inputs used to make taxable supplies.',
    bilingualArTitle: 'خصم ضريبة المدخلات',
    bilingualArBody:
      'يحق للممول المسجل خصم ضريبة القيمة المضافة المدفوعة على المدخلات المستخدمة في التوريدات الخاضعة للضريبة.',
    // lessons
    lessonRail: ['Watch', 'Read', 'Flow', 'Map', 'Practice'],
    lessonTitle: 'ZATCA Phase 2 Integration',
    lessonObjective1: 'Understand the e-invoicing pipeline end-to-end',
    lessonObjective2: 'Validate XML invoice fields against ZATCA spec',
    lessonObjective3: 'Recognise integration failure modes',
    lessonVideo: 'Video · 6:42',
    lessonPractice: 'Practice · 8 questions',
    // cert
    certVerified: 'Verified certificate',
    certName: 'Aisha Al-Rashid',
    certBody: 'has successfully completed the',
    certTrack: "Mu'tamad Path · Saudi Arabia",
    certScore: 'Score',
    certDate: 'Issued',
    certDateVal: '02 Apr 2026',
  },
  ar: {
    placementHeader: 'اختبار التحديد · السعودية',
    placementProgress: 'السؤال ٧ من ١٢',
    placementTopic: 'الموضوع',
    placementTopicVal: 'ZATCA',
    placementDifficulty: 'الصعوبة',
    placementDifficultyVal: 'متوسط',
    placementPrompt:
      'تم بيع توريد خاضع للضريبة بقيمة ١٠٬٠٠٠ ر.س لعميل غير مسجل في الرياض. ما هي ضريبة القيمة المضافة المستحقة؟',
    placementChoices: ['٠ ر.س', '٥٠٠ ر.س', '١٬٥٠٠ ر.س', '١٬٠٠٠ ر.س'],
    placementSubmit: 'إرسال',

    agentHeader: 'المدرس الذكي · مباشر',
    agentUser: 'لماذا تشترط ZATCA فواتير XML بدلًا من PDF؟',
    agentTool: 'search_curriculum · نتيجة واحدة',
    agentBoldA: 'مُهيكَلة',
    agentAssistantA: 'تشترط المرحلة الثانية من ZATCA الفواتير ',
    agentAssistantB:
      ' لأن السلطات الضريبية لا يمكنها مراجعة الصور. XML يسمح للنظام بالتحقق من كل حقل لحظة الإصدار.',
    agentCite: 'درس: ZATCA المرحلة 2 §3.1',

    dailyHeader: 'خطة اليوم · الثلاثاء',
    dailySub: '٣ عناصر · ~١٥ دقيقة',
    dailyKindReview: 'مراجعة متباعدة',
    dailyKindWeak: 'منطقة ضعف',
    dailyKindNew: 'درس جديد',
    dailyTitleReview: 'خصم ضريبة المدخلات · مراجعة',
    dailyTitleWeak: 'الضريبة المقتطعة على الأتعاب المهنية',
    dailyTitleNew: 'آلية الاحتساب العكسي',

    bilingualEnTitle: 'Input VAT credit',
    bilingualEnBody:
      'A registered taxpayer can claim credit for VAT paid on inputs used to make taxable supplies.',
    bilingualArTitle: 'خصم ضريبة المدخلات',
    bilingualArBody:
      'يحق للممول المسجل خصم ضريبة القيمة المضافة المدفوعة على المدخلات المستخدمة في التوريدات الخاضعة للضريبة.',

    lessonRail: ['شاهد', 'اقرأ', 'مخطط', 'خريطة', 'تمارين'],
    lessonTitle: 'تكامل ZATCA المرحلة الثانية',
    lessonObjective1: 'فهم خط أنابيب الفوترة الإلكترونية كاملًا',
    lessonObjective2: 'التحقق من حقول فاتورة XML مقابل مواصفات ZATCA',
    lessonObjective3: 'التعرف على أنماط فشل التكامل',
    lessonVideo: 'فيديو · ٦:٤٢',
    lessonPractice: 'تمارين · ٨ أسئلة',

    certVerified: 'شهادة موثقة',
    certName: 'عائشة الراشد',
    certBody: 'قد أكملت بنجاح',
    certTrack: 'مسار مُعتمَد · المملكة العربية السعودية',
    certScore: 'النتيجة',
    certDate: 'تاريخ الإصدار',
    certDateVal: '٠٢ أبريل ٢٠٢٦',
  },
} as const

function FeatureMock({ kind, locale }: { kind: MockKind; locale: 'en' | 'ar' }) {
  const m = MOCK_COPY[locale]
  switch (kind) {
    case 'placement':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl shadow-black/30">
          {/* Header strip */}
          <div className="border-b border-border bg-bg-overlay px-5 py-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                <Sparkles className="h-3 w-3 text-accent" />
                {m.placementHeader}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted tabular">
                {m.placementProgress}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-bg">
              <div className="h-full w-[58%] rounded-full bg-accent" />
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              <span>
                {m.placementTopic} · <span className="text-fg-muted">{m.placementTopicVal}</span>
              </span>
              <span className="text-fg-subtle/40">·</span>
              <span>
                {m.placementDifficulty} ·{' '}
                <span className="text-warning">{m.placementDifficultyVal}</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-fg sm:text-base">{m.placementPrompt}</p>
            <div className="mt-5 grid gap-2">
              {m.placementChoices.map((choice, i) => {
                const selected = i === 3
                const letter = String.fromCharCode(65 + i)
                return (
                  <div
                    key={choice}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                      selected ? 'border-accent bg-accent-soft' : 'border-border bg-bg-elev/50'
                    }`}
                  >
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border font-mono text-[10px] font-bold ${
                        selected
                          ? 'border-accent bg-accent text-accent-fg'
                          : 'border-border bg-bg text-fg-muted'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1">{choice}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-accent" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end border-t border-border bg-bg-overlay px-5 py-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-accent-fg shadow-[0_0_0_1px_var(--accent),0_0_24px_-8px_var(--accent)]">
              {m.placementSubmit}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </div>
          </div>
        </div>
      )

    case 'agent':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl shadow-black/30">
          <header className="flex h-12 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg">
                <Sparkles className="h-3 w-3" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                {m.agentHeader}
              </span>
            </div>
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
          </header>
          <div className="space-y-4 p-5">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-fg">
                {m.agentUser}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10px] text-fg-muted">
                  <Wrench className="h-2.5 w-2.5" />
                  {m.agentTool}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-fg">
                {m.agentAssistantA}
                <strong className="font-semibold">{m.agentBoldA}</strong>
                {m.agentAssistantB}
              </p>
              <p className="text-xs italic text-accent">— {m.agentCite}</p>
            </div>
          </div>
        </div>
      )

    case 'daily':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl shadow-black/30">
          <div className="border-b border-border px-5 py-4">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <Calendar className="h-3 w-3 text-accent" />
              {m.dailyHeader}
            </div>
            <p className="mt-2 text-sm text-fg-muted">{m.dailySub}</p>
          </div>
          <div className="space-y-2 p-4">
            <DailyRow
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              kind={m.dailyKindReview}
              title={m.dailyTitleReview}
              cls="border-warning/30 bg-warning/10 text-warning"
            />
            <DailyRow
              icon={<CircleDot className="h-3.5 w-3.5" />}
              kind={m.dailyKindWeak}
              title={m.dailyTitleWeak}
              cls="border-danger/30 bg-danger/10 text-danger"
            />
            <DailyRow
              icon={<Sparkles className="h-3.5 w-3.5" />}
              kind={m.dailyKindNew}
              title={m.dailyTitleNew}
              cls="border-accent/30 bg-accent-soft text-accent"
            />
          </div>
        </div>
      )

    case 'bilingual':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-bg p-5 shadow-xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                EN
              </span>
              <Languages className="h-3 w-3 text-fg-subtle" />
            </div>
            <p className="text-sm font-medium text-fg">{m.bilingualEnTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">{m.bilingualEnBody}</p>
            <div className="mt-4 h-1 w-12 rounded-full bg-accent/40" />
          </div>
          <div
            dir="rtl"
            className="rounded-2xl border border-border bg-bg p-5 shadow-xl shadow-black/20"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                AR
              </span>
              <Languages className="h-3 w-3 text-fg-subtle" />
            </div>
            <p className="text-sm font-medium text-fg">{m.bilingualArTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-fg-muted">{m.bilingualArBody}</p>
            <div className="mt-4 h-1 w-12 rounded-full bg-accent/40" />
          </div>
        </div>
      )

    case 'lessons':
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl shadow-black/30">
          <div className="grid grid-cols-[88px_1fr] gap-0">
            {/* Nav rail */}
            <aside className="border-e border-border bg-bg-overlay/50 p-3">
              <div className="flex flex-col gap-1">
                {m.lessonRail.map((label, i) => (
                  <div
                    key={label}
                    className={`rounded-md px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider ${
                      i === 0 ? 'bg-accent text-accent-fg' : 'text-fg-muted'
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </aside>
            {/* Body */}
            <div className="min-w-0 p-5">
              <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                {locale === 'ar' ? 'الدرس ١٢ من ٢٠' : 'Lesson 12 of 20'}
              </p>
              <h4 className="mt-2 truncate text-base font-semibold tracking-tight">
                {m.lessonTitle}
              </h4>
              <ul className="mt-3 space-y-1.5 text-[11px] text-fg-muted">
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  {m.lessonObjective1}
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  {m.lessonObjective2}
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  {m.lessonObjective3}
                </li>
              </ul>
              <div className="mt-4 flex aspect-video items-center justify-center rounded-lg border border-border bg-bg-overlay">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg">
                  <Play className="h-3.5 w-3.5 text-accent" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-fg-subtle">
                <span className="font-mono">{m.lessonVideo}</span>
                <span className="font-mono">{m.lessonPractice}</span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'cert':
      return (
        <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-border bg-bg p-8 text-center shadow-2xl shadow-black/30">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
            <Check className="h-3 w-3" />
            {m.certVerified}
          </div>
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elev">
            <Award className="h-6 w-6 text-accent" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight">{m.certName}</h3>
          <p className="mt-2 text-xs text-fg-muted">{m.certBody}</p>
          <p className="mt-1 text-sm font-medium">{m.certTrack}</p>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
            <div className="bg-bg p-3">
              <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                {m.certScore}
              </p>
              <p className="mt-1 font-mono text-xl tracking-tight">94%</p>
            </div>
            <div className="bg-bg p-3">
              <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                {m.certDate}
              </p>
              <p className="mt-1 text-sm font-medium tabular">{m.certDateVal}</p>
            </div>
          </div>
          <p className="mt-6 break-all font-mono text-[9px] text-fg-subtle" dir="ltr">
            3f8a1c92e4b78d6a9c0f5e2b1d4a7c8f
          </p>
        </div>
      )
  }
}

function DailyRow({
  icon,
  kind,
  title,
  cls,
}: {
  icon: React.ReactNode
  kind: string
  title: string
  cls: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elev/50 p-3">
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cls}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${cls}`}
        >
          {kind}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-fg">{title}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle rtl:rotate-180" />
    </div>
  )
}
