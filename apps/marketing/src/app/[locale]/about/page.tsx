import { Footer } from '@/components/footer'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { MarketingNav } from '@/components/marketing-nav'
import { Button } from '@/components/ui/button'
import { appLink } from '@/lib/config'
import type { SupportedLocale } from '@sa/i18n'
import { ArrowRight, Compass, Heart, Lightbulb, Mail, Sparkles, Target } from 'lucide-react'

const COPY = {
  en: {
    eyebrow: 'About',
    title: 'We make hireable accountants in 45 days.',
    subtitle:
      'SuperAccountant exists because the way most people learn accounting is broken. Universities teach theory then leave you alone. Coaching classes drill for an exam, not a job. Online courses have ~5% completion rates. We do something different: a small, focused cohort that pairs a real instructor with an AI tutor — and ends with a job, not just a certificate.',

    storyLabel: 'The story',
    story: [
      'We grew up watching our siblings, parents, and friends grind through CA and SOCPA exams with stacks of coaching books and prayer. Many of them passed and still couldn’t do the work — because no one had ever made them sit in front of Tally and process a real invoice.',
      'The problem was never effort. It was the format. A textbook doesn’t know what you got wrong yesterday. A YouTube lecture doesn’t stop and ask if you understood. A 2,000-student auditorium class doesn’t adapt to your gap with input tax credit.',
      'So we built the thing in the middle: small cohorts of 30, a real instructor at a real whiteboard, and an AI tutor that knows your curriculum cold and refuses to guess. 45 days, one fee, you walk out hireable.',
    ],

    valuesLabel: 'What we believe',
    values: [
      {
        icon: 'precision',
        title: 'Precision over enthusiasm',
        body: 'A tutor that confidently invents a tax rate is worse than no tutor at all. Our agent cites the lesson it learned from. If something is not in the curriculum, it says so.',
      },
      {
        icon: 'parity',
        title: 'Bilingual is non-negotiable',
        body: 'Arabic is not an afterthought. Every lesson, every prompt, every certificate ships in both languages with equal craft. RTL is a first-class rendering mode, not a stylesheet.',
      },
      {
        icon: 'craft',
        title: 'Craft is a feature',
        body: 'We sweat the loading states, the empty states, the keyboard shortcuts, the dark mode, the Arabic kerning. Because the people who use this product are professionals — and professionals can tell.',
      },
      {
        icon: 'access',
        title: 'Access over upsell',
        body: "If a student in Karachi or Dammam can't afford the Pro tier, we will figure something out. We are not in this to maximize ARPU — we are here to make competent accountants.",
      },
    ],

    statsLabel: 'Where we are',
    stats: [
      { label: 'Cohorts', value: '2', detail: 'iA26 + sA26' },
      { label: 'Days', value: '45', detail: 'per cohort' },
      { label: 'Seats', value: '30', detail: 'per cohort, max' },
      { label: 'Tracks', value: '2', detail: 'India + KSA' },
    ],

    contactLabel: 'Get in touch',
    contactTitle: 'We read every message.',
    contactBody:
      'Found a bug? Have a curriculum suggestion? Want us to add your jurisdiction? Email us — we respond within 48 hours.',
    contactCta: 'info@superaccountant.in',
    contactEmail: 'mailto:info@superaccountant.in',

    finalTitle: 'Take 45 days. Get the rest of your career.',
    finalSubtitle:
      'Reserve your seat in iA26 (Hyderabad, 1 June 2026) or sA26 (Riyadh, 1 July 2026) before the cohort fills.',
    finalCta: 'Reserve seat — from ₹24,999',
  },

  ar: {
    eyebrow: 'من نحن',
    title: 'نصنع محاسبين قابلين للتوظيف في ٤٥ يومًا.',
    subtitle:
      'سوبر أكاونتنت موجود لأن طريقة تعلم معظم الناس للمحاسبة معطوبة. الجامعات تُدرّس النظرية ثم تتركك وحدك. الكورسات تدرّب على الامتحان لا على الوظيفة. الدورات الأونلاين نسب إتمامها ~٥٪. نفعل شيئًا مختلفًا: دفعة صغيرة مركّزة تجمع مدرّبًا حقيقيًا مع مدرس ذكي — تنتهي بوظيفة لا بشهادة فقط.',

    storyLabel: 'القصة',
    story: [
      'كبرنا نشاهد إخواننا وآباءنا وأصدقاءنا يكافحون في امتحانات CA و SOCPA بأكوام من كتب الكورسات والدعاء. كثير منهم نجح ولا يستطيع أداء العمل — لأن لا أحد أجلسه أمام Tally وجعله يعالج فاتورة حقيقية.',
      'المشكلة لم تكن في الجهد، بل في الصيغة. الكتاب لا يعرف ما أخطأت فيه أمس. محاضرة يوتيوب لا تتوقف لتسألك إن فهمت. فصل بألفي طالب لا يتكيف مع فجوتك في فهم خصم ضريبة المدخلات.',
      'فبنينا الشيء في المنتصف: دفعات صغيرة بثلاثين طالبًا، مدرب حقيقي على لوح حقيقي، ومدرس ذكي يعرف منهجك عن ظهر قلب ويرفض التخمين. ٤٥ يومًا، رسوم واحدة، تخرج قابلًا للتوظيف.',
    ],

    valuesLabel: 'ما نؤمن به',
    values: [
      {
        icon: 'precision',
        title: 'الدقة قبل الحماس',
        body: 'مدرس يخترع معدل ضريبة بثقة أسوأ من لا مدرس. وكيلنا يستشهد بالدرس. إذا لم يكن الموضوع في المنهج، يقول ذلك.',
      },
      {
        icon: 'parity',
        title: 'ثنائية اللغة غير قابلة للتفاوض',
        body: 'العربية ليست فكرة لاحقة. كل درس وتعليمة وشهادة بكلتا اللغتين بنفس الحرفية. RTL وضع عرض أساسي.',
      },
      {
        icon: 'craft',
        title: 'الحرفية ميزة',
        body: 'نهتم بحالات التحميل، الحالات الفارغة، اختصارات لوحة المفاتيح، الوضع الداكن، الكيرنينج العربي. لأن مستخدمي هذا المنتج محترفون.',
      },
      {
        icon: 'access',
        title: 'الوصول قبل البيع',
        body: 'إذا لم يستطع طالب في كراتشي أو الدمام تحمل تكلفة الفئة المحترف، سنجد حلًا. لسنا هنا لتعظيم الإيرادات.',
      },
    ],

    statsLabel: 'أين نحن',
    stats: [
      { label: 'الدفعات', value: '٢', detail: 'iA26 + sA26' },
      { label: 'الأيام', value: '٤٥', detail: 'لكل دفعة' },
      { label: 'المقاعد', value: '٣٠', detail: 'حد أقصى لكل دفعة' },
      { label: 'المسارات', value: '٢', detail: 'الهند والسعودية' },
    ],

    contactLabel: 'تواصل معنا',
    contactTitle: 'نقرأ كل رسالة.',
    contactBody: 'وجدت خطأ؟ لديك اقتراح للمنهج؟ تريد منا إضافة بلدك؟ راسلنا — نرد خلال ٤٨ ساعة.',
    contactCta: 'info@superaccountant.in',
    contactEmail: 'mailto:info@superaccountant.in',

    finalTitle: 'خذ ٤٥ يومًا. واحصل على مسار حياتك المهنية.',
    finalSubtitle:
      'احجز مقعدك في iA26 (حيدر آباد، ١ يونيو ٢٠٢٦) أو sA26 (الرياض، ١ يوليو ٢٠٢٦) قبل امتلاء الدفعة.',
    finalCta: 'احجز مقعدك — من ₹24,999',
  },
} as const

const VALUE_ICONS = {
  precision: Target,
  parity: Compass,
  craft: Lightbulb,
  access: Heart,
} as const

export default async function AboutPage({
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

      {/* Story */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <BlurFade delay={0.05}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <span className="inline-block h-1 w-1 rounded-full bg-accent" />
            {t.storyLabel}
          </div>
        </BlurFade>
        <div className="mt-8 space-y-6">
          {t.story.map((para, i) => (
            <BlurFade key={i} delay={0.1 + i * 0.05}>
              <p className="text-base leading-relaxed text-fg-muted">{para}</p>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="relative z-10 border-y border-border bg-bg-elev/30 py-24 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <BlurFade delay={0.05}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <span className="inline-block h-1 w-1 rounded-full bg-accent" />
              {t.valuesLabel}
            </div>
          </BlurFade>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {t.values.map((v, i) => {
              const Icon = VALUE_ICONS[v.icon as keyof typeof VALUE_ICONS]
              return (
                <BlurFade key={v.title} delay={0.1 + i * 0.06}>
                  <div className="h-full rounded-2xl border border-border bg-bg-elev/50 p-7 backdrop-blur">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{v.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{v.body}</p>
                  </div>
                </BlurFade>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <BlurFade delay={0.05}>
          <p className="mb-8 text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.statsLabel}
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {t.stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-bg-elev/50 p-6 text-center backdrop-blur"
              >
                <div className="font-mono text-4xl font-medium tracking-tight">{s.value}</div>
                <p className="mt-2 text-sm font-medium">{s.label}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>
        </BlurFade>
      </section>

      {/* Contact */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <BlurFade delay={0.05}>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-bg-elev/50 p-10 backdrop-blur sm:p-14">
            <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                <Mail className="h-3 w-3 text-accent" />
                {t.contactLabel}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t.contactTitle}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-muted">
                {t.contactBody}
              </p>
              <div className="mt-8">
                <Button asChild variant="secondary" size="lg">
                  <a href={t.contactEmail}>
                    <Mail className="h-4 w-4" />
                    {t.contactCta}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </BlurFade>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
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
