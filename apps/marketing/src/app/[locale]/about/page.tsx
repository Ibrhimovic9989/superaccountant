import { ArrowRight, Compass, Heart, Lightbulb, Mail, Sparkles, Target } from 'lucide-react'
import type { SupportedLocale } from '@sa/i18n'
import { MarketingNav } from '@/components/marketing-nav'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { BorderBeam } from '@/components/magicui/border-beam'
import { appLink } from '@/lib/config'

const COPY = {
  en: {
    eyebrow: 'About',
    title: 'We are building the tutor we wish we had.',
    subtitle:
      'SuperAccountant exists because the way most people learn accounting is broken. Static PDFs. Generic YouTube playlists. ChatGPT making up tax rates. None of it respects how the human brain actually learns regulation-heavy work.',

    storyLabel: 'The story',
    story: [
      "We grew up watching our siblings, parents, and friends grind through CA and SOCPA exams with stacks of coaching books and prayer.",
      'The problem was never effort — it was the format. A textbook does not know what you got wrong yesterday. A YouTube lecture does not stop and ask if you understood. A coaching class does not adapt to the gap in your understanding of input tax credit.',
      "We built SuperAccountant to be the thing in the middle: a tutor that knows the curriculum cold, calls real tools, and refuses to guess. It's the one we wish we'd had.",
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
        body: "Arabic is not an afterthought. Every lesson, every prompt, every certificate ships in both languages with equal craft. RTL is a first-class rendering mode, not a stylesheet.",
      },
      {
        icon: 'craft',
        title: 'Craft is a feature',
        body: "We sweat the loading states, the empty states, the keyboard shortcuts, the dark mode, the Arabic kerning. Because the people who use this product are professionals — and professionals can tell.",
      },
      {
        icon: 'access',
        title: 'Access over upsell',
        body: "If a student in Karachi or Dammam can't afford the Pro tier, we will figure something out. We are not in this to maximize ARPU — we are here to make competent accountants.",
      },
    ],

    statsLabel: 'Where we are',
    stats: [
      { label: 'Markets', value: '2', detail: 'India + Saudi Arabia' },
      { label: 'Languages', value: '2', detail: 'English + Arabic' },
      { label: 'Lessons', value: '280+', detail: 'across both tracks' },
      { label: 'Tools', value: '6', detail: 'in the agent loop' },
    ],

    contactLabel: 'Get in touch',
    contactTitle: 'We read every message.',
    contactBody:
      "Found a bug? Have a curriculum suggestion? Want us to add your jurisdiction? Email us — we respond within 48 hours.",
    contactCta: 'info@superaccountant.in',
    contactEmail: 'mailto:info@superaccountant.in',

    finalTitle: 'Try the product.',
    finalSubtitle: 'The best way to understand what we do is to use it for ten minutes.',
    finalCta: 'Start free placement test',
  },

  ar: {
    eyebrow: 'من نحن',
    title: 'نبني المدرس الذي تمنينا أن يكون لدينا.',
    subtitle:
      'سوبر أكاونتنت موجود لأن طريقة تعلم معظم الناس للمحاسبة معطوبة. ملفات PDF ثابتة. قوائم يوتيوب عامة. ChatGPT يخترع معدلات ضرائب. لا شيء من هذا يحترم كيف يتعلم الدماغ البشري العمل الكثيف بالأنظمة.',

    storyLabel: 'القصة',
    story: [
      'كبرنا نشاهد إخواننا وآباءنا وأصدقاءنا يكافحون في امتحانات CA و SOCPA بأكوام من كتب الكورسات والدعاء.',
      'المشكلة لم تكن في الجهد — كانت في الصيغة. الكتاب لا يعرف ما أخطأت فيه أمس. محاضرة يوتيوب لا تتوقف لتسألك إن فهمت. الكورس لا يتكيف مع فجوتك في فهم خصم ضريبة المدخلات.',
      'بنينا سوبر أكاونتنت ليكون الشيء في المنتصف: مدرس يعرف المنهج عن ظهر قلب، يستدعي أدوات حقيقية، ويرفض التخمين.',
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
      { label: 'الأسواق', value: '٢', detail: 'الهند والسعودية' },
      { label: 'اللغات', value: '٢', detail: 'الإنجليزية والعربية' },
      { label: 'الدروس', value: '+٢٨٠', detail: 'عبر المسارين' },
      { label: 'الأدوات', value: '٦', detail: 'في حلقة الوكيل' },
    ],

    contactLabel: 'تواصل معنا',
    contactTitle: 'نقرأ كل رسالة.',
    contactBody:
      'وجدت خطأ؟ لديك اقتراح للمنهج؟ تريد منا إضافة بلدك؟ راسلنا — نرد خلال ٤٨ ساعة.',
    contactCta: 'info@superaccountant.in',
    contactEmail: 'mailto:info@superaccountant.in',

    finalTitle: 'جرب المنتج.',
    finalSubtitle: 'أفضل طريقة لفهم ما نفعله هي استخدامه لعشر دقائق.',
    finalCta: 'ابدأ اختبار التحديد المجاني',
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
                <a href={appLink(locale, '/sign-in')}>
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
