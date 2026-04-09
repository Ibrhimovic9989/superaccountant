import Link from 'next/link'
import {
  ArrowRight,
  Award,
  BookOpen,
  Brain,
  Check,
  CircleDot,
  ClipboardList,
  FileCheck2,
  Languages,
  Sparkles,
  Target,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import type { SupportedLocale } from '@sa/i18n'
import { MarketingNav } from '@/components/marketing-nav'
import { Footer } from '@/components/footer'
import { Marquee } from '@/components/marquee'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { BorderBeam } from '@/components/magicui/border-beam'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { appLink } from '@/lib/config'
import { cn } from '@/lib/utils'

const COPY = {
  en: {
    badge: 'Beta · India + KSA',
    titleA: 'The agentic',
    titleB: 'accounting tutor.',
    subtitle:
      'Adaptive lessons, daily assignments, and a tutor that knows your curriculum line by line. Built for accountants in India and Saudi Arabia, in English and Arabic.',
    primaryCta: 'Start free placement test',
    secondaryCta: 'See how it works',
    pillIndia: '🇮🇳 Chartered Path · India',
    pillKsa: "🇸🇦 Mu'tamad Path · Saudi Arabia",
    trustLabel: 'Built on the regulations that govern your work',
    trustItems: [
      'GST',
      'TDS',
      'Ind AS',
      'Companies Act 2013',
      'ZATCA e-invoicing',
      'Saudi VAT',
      'Zakat',
      'IFRS',
      'Audit standards',
      'Transfer pricing',
      'GAAP',
      'Tax computation',
    ],

    // ── How it works
    howLabel: 'How it works',
    howTitle: 'Three steps. Zero noise.',
    howSubtitle:
      "We don't drop you into a course catalogue. We measure where you are, build a path, and walk you through it every day.",
    steps: [
      {
        n: '01',
        title: 'Take the placement test',
        body: 'Adaptive 20–30 questions across your track. Calibrates your starting phase in under ten minutes.',
        icon: 'placement',
      },
      {
        n: '02',
        title: 'Learn one lesson per day',
        body: 'Watch, read, see the diagram, and answer eight practice questions. The tutor is always one keystroke away.',
        icon: 'learn',
      },
      {
        n: '03',
        title: 'Earn a verifiable certificate',
        body: 'Pass the proctored grand test and ship a HMAC-signed certificate with a public verification page.',
        icon: 'cert',
      },
    ],

    // ── The agent
    agentLabel: 'The tutor',
    agentTitle: 'A real agent. Not a chatbot.',
    agentSubtitle:
      'Most "AI tutors" are just ChatGPT with a system prompt. SuperAccountant is an agent loop with tools — it can search your curriculum, grade your answer, generate practice, and remember what you struggled with.',
    agentToolsLabel: 'Tools the tutor can call',
    agentTools: [
      { name: 'search_curriculum', body: 'Looks up the exact lesson and cites it' },
      { name: 'assess_answer', body: 'Grades scenarios with a rubric, not just MCQs' },
      { name: 'explain_concept', body: 'Bilingual explanations with worked examples' },
      { name: 'generate_practice', body: "Builds new questions tuned to today's gaps" },
      { name: 'lookup_regulation', body: 'GST, ZATCA, IFRS — locale-aware citations' },
      { name: 'recommend_next', body: 'Picks the next lesson by your mastery curve' },
    ],
    agentBubbleUser: "Why does ZATCA require XML invoices, not PDF?",
    agentBubbleAssistant:
      "ZATCA Phase 2 mandates **structured** invoices because tax authorities can't audit pixels. XML lets the system validate every field — buyer VAT number, line totals, tax codes — at the moment of issuance.\n\nFrom *Lesson: ZATCA Phase 2 Integration* — see §3.1.",
    agentBubbleTool: 'search_curriculum · 1 hit',

    // ── Tracks
    tracksLabel: 'Two tracks. One platform.',
    tracksTitle: 'Curriculum that respects your jurisdiction.',
    tracksSubtitle:
      'India and KSA accounting are different worlds. We built each track as its own bounded curriculum — not a global course with regional footnotes.',
    tracks: [
      {
        flag: '🇮🇳',
        name: 'Chartered Path',
        market: 'India',
        phases: ['Foundation', 'GST + TDS', 'Ind AS + Companies Act', 'Audit + Capstone'],
        topics: [
          'Direct + Indirect Tax',
          'Tally + Zoho practical',
          'Companies Act 2013',
          'TDS computation',
          'Audit standards (SA)',
          'Transfer pricing',
        ],
        lessonCount: 140,
      },
      {
        flag: '🇸🇦',
        name: "Mu'tamad Path",
        market: 'Saudi Arabia',
        phases: ['Foundation', 'VAT + Zakat', 'IFRS + ZATCA', 'Audit + Capstone'],
        topics: [
          'ZATCA e-invoicing (Phase 1+2)',
          'Saudi VAT computation',
          'Zakat assessment',
          'IFRS for SMEs',
          'SOCPA framework',
          'Transfer pricing (KSA)',
        ],
        lessonCount: 140,
      },
    ],

    // ── Bilingual
    bilingualLabel: 'Bilingual',
    bilingualTitle: 'Arabic and English. Equal weight.',
    bilingualBody:
      'Every lesson, every prompt, every diagram, every certificate ships in both languages. RTL is not a stylesheet — it is a rendering mode the agent respects end-to-end.',
    bilingualBullets: [
      'AR + EN side by side, switch instantly',
      'Tutor responds in your session language',
      'Hijri dates available alongside Gregorian',
      'Arabic-Indic numerals as a per-user preference',
    ],

    // ── Certificate
    certLabel: 'Certificate',
    certTitle: 'Verifiable. Not just printable.',
    certBody:
      'Every certificate ships with a HMAC signature over your name, track, completion date, and score. Anyone with the link can verify it on a public page — no login, no API key.',
    certBullets: [
      'HMAC-signed certificate hash',
      'Public verification page',
      'QR code for offline verification',
      'PDF download in EN or AR',
    ],
    certName: 'Aisha Al-Rashid',
    certBody2: "has successfully completed the",
    certTrack: "Mu'tamad Path · Saudi Arabia",
    certScore: 'Score',
    certDate: 'Issued',
    certVerified: 'Verified certificate',

    // ── Comparison
    compareLabel: 'Why us',
    compareTitle: 'How we compare.',
    compareCols: ['SuperAccountant', 'Traditional course', 'ChatGPT'],
    compareRows: [
      ['Knows your jurisdiction', true, false, false],
      ['Adaptive to your level', true, false, false],
      ['Cites the exact lesson', true, true, false],
      ['Bilingual EN + AR', true, false, 'sort'],
      ['Daily plan, not a catalogue', true, false, false],
      ['Verifiable certificate', true, true, false],
      ['Costs less than a textbook', true, false, true],
    ],

    // ── FAQ
    faqLabel: 'Questions',
    faqTitle: 'Frequently asked.',
    faqs: [
      {
        q: 'Is SuperAccountant a replacement for CA / SOCPA?',
        a: "No. Think of us as the daily-practice and revision tool — a place to truly understand each topic, run scenarios with an AI tutor, and check your gaps. The official credentials still come from ICAI and SOCPA.",
      },
      {
        q: 'Does the tutor actually know Indian / Saudi tax law?',
        a: "It calls a curriculum search tool that retrieves the exact lesson from our content database. It cites the lesson it learned from. If something isn't in the curriculum, the tutor will say so instead of guessing.",
      },
      {
        q: 'How long does the program take?',
        a: 'Most students finish a track in 4–6 months at one lesson per day. There is no time limit. You can pause, resume, and the streak picks up where you left off.',
      },
      {
        q: 'What languages are supported?',
        a: "English and Arabic, end to end. The tutor responds in your session language. You can switch any time — every lesson, prompt, and certificate ships in both.",
      },
      {
        q: 'How is this different from watching YouTube?',
        a: 'YouTube has lectures. We have a tutor that grades your answer to a scenario, remembers what you got wrong yesterday, and builds tomorrow\'s practice from that.',
      },
      {
        q: 'Is the certificate accepted by employers?',
        a: 'It is a signed verification of mastery, not a regulator-issued license. Most firms use it as a hiring signal alongside your CA / SOCPA progress.',
      },
    ],

    // ── Final CTA
    finalLabel: 'Get started',
    finalTitle: 'Start with a 10-minute test.',
    finalSubtitle:
      "We'll place you on the right phase, generate tomorrow's plan, and the tutor will be waiting.",
    finalCta: 'Take the placement test',
    finalNote: 'Free during beta · No credit card · Cancel anytime',
  },

  ar: {
    badge: 'النسخة التجريبية · الهند والسعودية',
    titleA: 'مدرس المحاسبة',
    titleB: 'الذكي.',
    subtitle:
      'دروس تكيفية، تمارين يومية، ومدرس يعرف منهجك سطرًا بسطر. مصمم للمحاسبين في الهند والمملكة العربية السعودية، بالعربية والإنجليزية.',
    primaryCta: 'ابدأ اختبار التحديد المجاني',
    secondaryCta: 'كيف يعمل',
    pillIndia: '🇮🇳 المسار المعتمد · الهند',
    pillKsa: '🇸🇦 مسار مُعتمَد · السعودية',
    trustLabel: 'مبني على الأنظمة التي تحكم عملك',
    trustItems: [
      'GST',
      'TDS',
      'Ind AS',
      'قانون الشركات 2013',
      'فاتورة ZATCA',
      'ضريبة القيمة المضافة',
      'الزكاة',
      'IFRS',
      'معايير المراجعة',
      'تسعير التحويل',
      'GAAP',
      'حساب الضرائب',
    ],

    howLabel: 'كيف يعمل',
    howTitle: 'ثلاث خطوات. بدون تشويش.',
    howSubtitle:
      'لا نلقي بك في كتالوج دورات. نقيس مستواك، نبني لك مسارًا، ونرافقك خطوة بخطوة كل يوم.',
    steps: [
      {
        n: '01',
        title: 'خذ اختبار التحديد',
        body: 'اختبار تكيفي من ٢٠–٣٠ سؤالًا يحدد مرحلتك في أقل من عشر دقائق.',
        icon: 'placement',
      },
      {
        n: '02',
        title: 'درس واحد كل يوم',
        body: 'شاهد، اقرأ، انظر إلى الرسم، وأجب على ثمانية أسئلة. المدرس على بُعد ضغطة زر.',
        icon: 'learn',
      },
      {
        n: '03',
        title: 'احصل على شهادة قابلة للتحقق',
        body: 'اجتاز الاختبار الكبير لتحصل على شهادة موقعة بـ HMAC وصفحة تحقق علنية.',
        icon: 'cert',
      },
    ],

    agentLabel: 'المدرس',
    agentTitle: 'وكيل ذكي حقيقي. ليس مجرد دردشة.',
    agentSubtitle:
      'معظم "المدرسين الذكيين" مجرد ChatGPT بتعليمات إضافية. سوبر أكاونتنت وكيل ذكي بأدوات حقيقية — يبحث في منهجك، يصحح إجابتك، يولّد تمارين، ويتذكر نقاط ضعفك.',
    agentToolsLabel: 'الأدوات التي يستخدمها المدرس',
    agentTools: [
      { name: 'search_curriculum', body: 'يبحث في الدرس الفعلي ويستشهد به' },
      { name: 'assess_answer', body: 'يصحح السيناريوهات بمعايير، ليس فقط الاختيارات' },
      { name: 'explain_concept', body: 'شرح ثنائي اللغة بأمثلة عملية' },
      { name: 'generate_practice', body: 'ينشئ أسئلة جديدة لنقاط ضعفك اليوم' },
      { name: 'lookup_regulation', body: 'GST و ZATCA و IFRS — استشهادات حسب البلد' },
      { name: 'recommend_next', body: 'يختار الدرس التالي حسب منحنى إتقانك' },
    ],
    agentBubbleUser: 'لماذا تشترط ZATCA فواتير XML بدلًا من PDF؟',
    agentBubbleAssistant:
      'تشترط المرحلة الثانية من ZATCA الفواتير **المُهيكَلة** لأن السلطات الضريبية لا يمكنها مراجعة الصور. XML يسمح للنظام بالتحقق من كل حقل — الرقم الضريبي، المجاميع، رموز الضرائب — لحظة الإصدار.\n\nمن *درس: تكامل ZATCA المرحلة 2* — انظر §3.1.',
    agentBubbleTool: 'search_curriculum · نتيجة واحدة',

    tracksLabel: 'مساران. منصة واحدة.',
    tracksTitle: 'منهج يحترم جغرافيتك.',
    tracksSubtitle:
      'محاسبة الهند والسعودية عالمان مختلفان. بنينا كل مسار كمنهج مستقل — وليس دورة عالمية بهوامش إقليمية.',
    tracks: [
      {
        flag: '🇮🇳',
        name: 'المسار المعتمد',
        market: 'الهند',
        phases: ['الأساسيات', 'GST + TDS', 'Ind AS + قانون الشركات', 'المراجعة + الكابستون'],
        topics: [
          'الضرائب المباشرة وغير المباشرة',
          'Tally + Zoho عملي',
          'قانون الشركات 2013',
          'حساب TDS',
          'معايير المراجعة',
          'تسعير التحويل',
        ],
        lessonCount: 140,
      },
      {
        flag: '🇸🇦',
        name: 'مسار مُعتمَد',
        market: 'السعودية',
        phases: ['الأساسيات', 'الضريبة + الزكاة', 'IFRS + ZATCA', 'المراجعة + الكابستون'],
        topics: [
          'فاتورة ZATCA (المرحلة 1+2)',
          'حساب ضريبة القيمة المضافة',
          'تقدير الزكاة',
          'IFRS للمنشآت الصغيرة',
          'إطار SOCPA',
          'تسعير التحويل (السعودية)',
        ],
        lessonCount: 140,
      },
    ],

    bilingualLabel: 'ثنائي اللغة',
    bilingualTitle: 'العربية والإنجليزية. وزن متساوٍ.',
    bilingualBody:
      'كل درس، كل تعليمة، كل رسم، كل شهادة — تأتي بالعربية والإنجليزية. RTL ليس مجرد ورقة أنماط، بل وضع عرض يحترمه المدرس من البداية إلى النهاية.',
    bilingualBullets: [
      'العربية والإنجليزية جنبًا إلى جنب، بدّل فورًا',
      'يستجيب المدرس بلغة جلستك',
      'تواريخ هجرية بجانب الميلادية',
      'الأرقام العربية كتفضيل لكل مستخدم',
    ],

    certLabel: 'الشهادة',
    certTitle: 'قابلة للتحقق. ليست مجرد طباعة.',
    certBody:
      'كل شهادة تأتي بتوقيع HMAC على اسمك ومسارك وتاريخ الإكمال ودرجتك. أي شخص لديه الرابط يمكنه التحقق منها على صفحة عامة — بدون تسجيل دخول.',
    certBullets: [
      'توقيع HMAC للشهادة',
      'صفحة تحقق علنية',
      'رمز QR للتحقق دون اتصال',
      'تنزيل PDF بالعربية أو الإنجليزية',
    ],
    certName: 'عائشة الراشد',
    certBody2: 'قد أكملت بنجاح',
    certTrack: 'مسار مُعتمَد · المملكة العربية السعودية',
    certScore: 'النتيجة',
    certDate: 'تاريخ الإصدار',
    certVerified: 'شهادة موثقة',

    compareLabel: 'لماذا نحن',
    compareTitle: 'كيف نقارن.',
    compareCols: ['سوبر أكاونتنت', 'دورة تقليدية', 'ChatGPT'],
    compareRows: [
      ['يعرف منطقتك التشريعية', true, false, false],
      ['يتكيف مع مستواك', true, false, false],
      ['يستشهد بالدرس المحدد', true, true, false],
      ['ثنائي اللغة EN + AR', true, false, 'sort'],
      ['خطة يومية، لا كتالوج', true, false, false],
      ['شهادة قابلة للتحقق', true, true, false],
      ['أرخص من كتاب دراسي', true, false, true],
    ],

    faqLabel: 'الأسئلة',
    faqTitle: 'الأسئلة الشائعة.',
    faqs: [
      {
        q: 'هل سوبر أكاونتنت بديل عن CA / SOCPA؟',
        a: 'لا. اعتبرنا أداة المراجعة والممارسة اليومية — مكان لفهم كل موضوع بعمق، وممارسة السيناريوهات مع مدرس ذكي، وتغطية الفجوات. الشهادات الرسمية تأتي من ICAI و SOCPA.',
      },
      {
        q: 'هل المدرس يعرف فعلًا قوانين الضرائب الهندية والسعودية؟',
        a: 'يستدعي أداة بحث في المنهج تسترجع الدرس الفعلي من قاعدة بياناتنا، ويستشهد به. إذا لم يكن الموضوع في المنهج، يقول ذلك بدلًا من التخمين.',
      },
      {
        q: 'كم يستغرق البرنامج؟',
        a: 'معظم الطلاب ينهون مسارًا في ٤–٦ أشهر بمعدل درس واحد يوميًا. لا حد زمني. يمكنك التوقف والاستئناف والسلسلة تستمر.',
      },
      {
        q: 'ما اللغات المدعومة؟',
        a: 'الإنجليزية والعربية، من البداية إلى النهاية. يستجيب المدرس بلغة جلستك. كل درس وشهادة بالعربية والإنجليزية.',
      },
      {
        q: 'كيف يختلف هذا عن YouTube؟',
        a: 'YouTube فيه محاضرات. نحن لدينا مدرس يصحح إجابتك على سيناريو، ويتذكر ما أخطأت فيه أمس، ويبني تمرين الغد على ذلك.',
      },
      {
        q: 'هل الشهادة مقبولة من أصحاب العمل؟',
        a: 'إنها تحقق موقّع للإتقان، وليست رخصة من جهة تنظيمية. معظم الشركات تستخدمها كإشارة توظيف بجانب تقدمك في CA / SOCPA.',
      },
    ],

    finalLabel: 'ابدأ',
    finalTitle: 'ابدأ باختبار من ١٠ دقائق.',
    finalSubtitle:
      'سنحدد مرحلتك المناسبة، نولّد خطة الغد، والمدرس بانتظارك.',
    finalCta: 'خذ اختبار التحديد',
    finalNote: 'مجاني خلال النسخة التجريبية · بدون بطاقة ائتمان · إلغاء في أي وقت',
  },
} as const

const STEP_ICONS = {
  placement: ClipboardList,
  learn: BookOpen,
  cert: Award,
} as const

export default async function Landing({
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

      {/* ─── Hero ──────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-20 text-center sm:pt-20">
        <BlurFade delay={0.05}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted backdrop-blur">
            <Sparkles className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>

        <BlurFade delay={0.12}>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            {t.titleA}
            <br />
            <span className="aurora-text">{t.titleB}</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.18}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
            {t.subtitle}
          </p>
        </BlurFade>

        <BlurFade delay={0.24}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t.pillIndia}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t.pillKsa}
            </span>
          </div>
        </BlurFade>

        <BlurFade delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <div className="relative inline-flex">
              <Button asChild variant="accent" size="lg" className="relative overflow-hidden">
                <a href={appLink(locale, '/sign-in')}>
                  {t.primaryCta}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  <BorderBeam size={56} duration={6} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                </a>
              </Button>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link href={`/${locale}/features`}>
                {t.secondaryCta}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </BlurFade>

        {/* Stats inline under CTA */}
        <BlurFade delay={0.4}>
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-bg-elev/50 backdrop-blur rtl:divide-x-reverse">
            <StatInline
              value={280}
              suffix="+"
              label={locale === 'ar' ? 'دروس' : 'Lessons'}
            />
            <StatInline
              value={560}
              label={locale === 'ar' ? 'سؤال تحديد' : 'Test bank'}
            />
            <StatInline
              value={2}
              label={locale === 'ar' ? 'لغتان' : 'Languages'}
            />
          </div>
        </BlurFade>
      </main>

      {/* ─── Trust marquee ─────────────────────────────────── */}
      <section className="relative z-10 border-y border-border bg-bg-elev/30 py-10 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.trustLabel}
          </p>
          <Marquee
            duration={45}
            items={t.trustItems.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-4 py-1.5 text-xs font-medium text-fg-muted"
              >
                <CircleDot className="h-3 w-3 text-accent" />
                {tag}
              </span>
            ))}
          />
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <BlurFade delay={0.05}>
          <SectionEyebrow text={t.howLabel} />
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.howTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-fg-muted">{t.howSubtitle}</p>
        </BlurFade>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {t.steps.map((step, i) => {
            const Icon = STEP_ICONS[step.icon as keyof typeof STEP_ICONS]
            return (
              <BlurFade key={step.n} delay={0.1 + i * 0.08}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-bg-elev/50 p-7 backdrop-blur transition-all hover:border-border-strong hover:bg-bg-elev">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {step.n}
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg">
                      <Icon className="h-4 w-4 text-accent" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                </div>
              </BlurFade>
            )
          })}
        </div>
      </section>

      {/* ─── The agent ─────────────────────────────────────── */}
      <section
        id="agent"
        className="relative z-10 border-y border-border bg-bg-elev/30 py-28 backdrop-blur"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <BlurFade delay={0.05}>
                <SectionEyebrow text={t.agentLabel} icon={<Brain className="h-3 w-3" />} />
                <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t.agentTitle}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-fg-muted">{t.agentSubtitle}</p>
              </BlurFade>

              <BlurFade delay={0.15}>
                <p className="mt-10 mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {t.agentToolsLabel}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {t.agentTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3"
                    >
                      <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                      <div className="min-w-0">
                        <code className="block font-mono text-[11px] text-fg">{tool.name}</code>
                        <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">
                          {tool.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </BlurFade>
            </div>

            {/* Mock chat */}
            <BlurFade delay={0.2}>
              <div className="relative overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl shadow-black/20">
                <header className="flex h-12 items-center justify-between border-b border-border px-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg">
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      AI Tutor · Live
                    </span>
                  </div>
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
                </header>
                <div className="space-y-4 p-5">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-fg">
                      {t.agentBubbleUser}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-overlay px-2 py-0.5 font-mono text-[10px] text-fg-muted">
                        <Wrench className="h-2.5 w-2.5" />
                        {t.agentBubbleTool}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed text-fg whitespace-pre-line">
                      {t.agentBubbleAssistant.split('**').map((chunk, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-semibold">
                            {chunk}
                          </strong>
                        ) : (
                          <span key={i}>
                            {chunk.split('*').map((c, j) =>
                              j % 2 === 1 ? (
                                <em key={j} className="italic text-accent">
                                  {c}
                                </em>
                              ) : (
                                <span key={j}>{c}</span>
                              ),
                            )}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <BorderBeam size={120} duration={10} colorFrom="#a78bfa" colorTo="#8b5cf6" />
              </div>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ─── Tracks ────────────────────────────────────────── */}
      <section id="tracks" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <BlurFade delay={0.05}>
          <SectionEyebrow text={t.tracksLabel} />
          <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.tracksTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-fg-muted">{t.tracksSubtitle}</p>
        </BlurFade>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {t.tracks.map((track, i) => (
            <BlurFade key={track.market} delay={0.1 + i * 0.1}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-bg-elev/50 p-8 backdrop-blur transition-all hover:border-border-strong">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-3xl">{track.flag}</div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight">{track.name}</h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {track.market}
                    </p>
                  </div>
                  <div className="text-end">
                    <div className="font-mono text-3xl font-medium tracking-tight">
                      <NumberTicker value={track.lessonCount} />
                      <span className="text-fg-subtle">+</span>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      {locale === 'ar' ? 'دروس' : 'lessons'}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {locale === 'ar' ? 'المراحل' : 'Phases'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {track.phases.map((phase, idx) => (
                      <span
                        key={phase}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 font-mono text-[10px] text-fg-muted"
                      >
                        <span className="text-fg-subtle">{idx + 1}</span>
                        {phase}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    {locale === 'ar' ? 'تشمل' : 'Covers'}
                  </p>
                  <ul className="space-y-1.5">
                    {track.topics.map((topic) => (
                      <li
                        key={topic}
                        className="flex items-start gap-2 text-sm text-fg-muted"
                      >
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* ─── Bilingual + Certificate split ─────────────────── */}
      <section className="relative z-10 border-y border-border bg-bg-elev/30 py-28 backdrop-blur">
        <div className="mx-auto max-w-6xl space-y-24 px-6">
          {/* Bilingual */}
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <BlurFade delay={0.05}>
              <SectionEyebrow text={t.bilingualLabel} icon={<Languages className="h-3 w-3" />} />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.bilingualTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">{t.bilingualBody}</p>
              <ul className="mt-6 space-y-3">
                {t.bilingualBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-fg-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {b}
                  </li>
                ))}
              </ul>
            </BlurFade>

            <BlurFade delay={0.15}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-bg p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      EN
                    </span>
                    <Languages className="h-3 w-3 text-fg-subtle" />
                  </div>
                  <p className="text-sm font-medium text-fg">Input VAT credit</p>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                    A registered taxpayer can claim credit for VAT paid on inputs used to make
                    taxable supplies.
                  </p>
                </div>
                <div dir="rtl" className="rounded-2xl border border-border bg-bg p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      AR
                    </span>
                    <Languages className="h-3 w-3 text-fg-subtle" />
                  </div>
                  <p className="text-sm font-medium text-fg">خصم ضريبة المدخلات</p>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                    يحق للممول المسجل خصم ضريبة القيمة المضافة المدفوعة على المدخلات المستخدمة في
                    التوريدات الخاضعة للضريبة.
                  </p>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Certificate */}
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <BlurFade delay={0.15} className="order-2 lg:order-1">
              <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border border-border bg-bg p-8 text-center shadow-2xl shadow-black/30">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
                  <Check className="h-3 w-3" />
                  {t.certVerified}
                </div>
                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elev">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">{t.certName}</h3>
                <p className="mt-2 text-xs text-fg-muted">{t.certBody2}</p>
                <p className="mt-1 text-sm font-medium">{t.certTrack}</p>
                <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                  <div className="bg-bg p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      {t.certScore}
                    </p>
                    <p className="mt-1 font-mono text-xl tracking-tight">94%</p>
                  </div>
                  <div className="bg-bg p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      {t.certDate}
                    </p>
                    <p className="mt-1 text-sm font-medium tabular">02 Apr 2026</p>
                  </div>
                </div>
                <p className="mt-6 break-all font-mono text-[9px] text-fg-subtle" dir="ltr">
                  3f8a1c92e4b78d6a9c0f5e2b1d4a7c8f
                </p>
                <BorderBeam size={80} duration={9} colorFrom="#a78bfa" colorTo="#8b5cf6" />
              </div>
            </BlurFade>

            <BlurFade delay={0.05} className="order-1 lg:order-2">
              <SectionEyebrow text={t.certLabel} icon={<Award className="h-3 w-3" />} />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.certTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-fg-muted">{t.certBody}</p>
              <ul className="mt-6 space-y-3">
                {t.certBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-fg-muted">
                    <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {b}
                  </li>
                ))}
              </ul>
            </BlurFade>
          </div>
        </div>
      </section>

      {/* ─── Comparison ────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-28">
        <BlurFade delay={0.05}>
          <SectionEyebrow text={t.compareLabel} icon={<Target className="h-3 w-3" />} />
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.compareTitle}
          </h2>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-bg-elev/50 backdrop-blur">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-4 text-start font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                    &nbsp;
                  </th>
                  {t.compareCols.map((col, i) => (
                    <th
                      key={col}
                      className={cn(
                        'px-4 py-4 text-center font-mono text-[10px] uppercase tracking-wider',
                        i === 0 ? 'text-accent' : 'text-fg-subtle',
                      )}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.compareRows.map(([label, ...cells], rowIdx) => (
                  <tr
                    key={String(label)}
                    className={cn(
                      'border-b border-border last:border-0',
                      rowIdx % 2 === 1 && 'bg-bg-overlay/30',
                    )}
                  >
                    <td className="px-6 py-4 text-sm text-fg">{String(label)}</td>
                    {cells.map((cell, i) => (
                      <td key={i} className="px-4 py-4 text-center">
                        <CompareCell value={cell} highlighted={i === 0} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlurFade>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-border bg-bg-elev/30 py-28 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6">
          <BlurFade delay={0.05}>
            <SectionEyebrow text={t.faqLabel} />
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {t.faqTitle}
            </h2>
          </BlurFade>

          <div className="mt-12 space-y-3">
            {t.faqs.map((faq, i) => (
              <BlurFade key={faq.q} delay={0.1 + i * 0.05}>
                <details className="group overflow-hidden rounded-xl border border-border bg-bg-elev/50 backdrop-blur transition-colors hover:border-border-strong">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-start text-sm font-medium [&::-webkit-details-marker]:hidden">
                    <span>{faq.q}</span>
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-fg-muted transition-transform group-open:rotate-45">
                      <span className="text-base leading-none">+</span>
                    </span>
                  </summary>
                  <p className="border-t border-border px-5 py-5 text-sm leading-relaxed text-fg-muted">
                    {faq.a}
                  </p>
                </details>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-28">
        <BlurFade delay={0.05}>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev/50 p-12 text-center backdrop-blur sm:p-16">
            <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                <Zap className="h-3 w-3 text-accent" />
                {t.finalLabel}
              </div>
              <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                {t.finalTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted">{t.finalSubtitle}</p>
              <div className="mt-10 flex justify-center">
                <div className="relative inline-flex">
                  <Button
                    asChild
                    variant="accent"
                    size="lg"
                    className="relative overflow-hidden"
                  >
                    <a href={appLink(locale, '/sign-in')}>
                      {t.finalCta}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      <BorderBeam size={64} duration={6} colorFrom="#a78bfa" colorTo="#8b5cf6" />
                    </a>
                  </Button>
                </div>
              </div>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {t.finalNote}
              </p>
            </div>
          </div>
        </BlurFade>
      </section>

      <Footer locale={locale} />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────

function SectionEyebrow({
  text,
  icon,
}: {
  text: string
  icon?: React.ReactNode
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
      {icon ?? <CircleDot className="h-3 w-3 text-accent" />}
      {text}
    </div>
  )
}

function StatInline({
  value,
  suffix = '',
  label,
}: {
  value: number
  suffix?: string
  label: string
}) {
  return (
    <div className="px-4 py-6 text-center">
      <div className="flex items-baseline justify-center gap-1">
        <NumberTicker
          value={value}
          className="font-mono text-3xl font-medium tracking-tight sm:text-4xl"
        />
        <span className="font-mono text-xl text-fg-subtle">{suffix}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
    </div>
  )
}

function CompareCell({
  value,
  highlighted,
}: {
  value: boolean | string
  highlighted: boolean
}) {
  if (value === true) {
    return (
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full',
          highlighted
            ? 'bg-accent text-accent-fg'
            : 'border border-success/30 bg-success/10 text-success',
        )}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-bg text-fg-subtle">
        <X className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center font-mono text-[10px] uppercase tracking-wider text-warning">
      sort of
    </span>
  )
}
