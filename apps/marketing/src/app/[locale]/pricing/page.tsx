import { ArrowRight, Check, CircleDot, Sparkles, Zap } from 'lucide-react'
import type { SupportedLocale } from '@sa/i18n'
import { MarketingNav } from '@/components/marketing-nav'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/magicui/blur-fade'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { BorderBeam } from '@/components/magicui/border-beam'
import { appLink } from '@/lib/config'
import { cn } from '@/lib/utils'

const COPY = {
  en: {
    eyebrow: 'Pricing',
    title: 'Free during beta. Honest pricing after.',
    subtitle:
      "We're in beta. Everything is free right now. When we launch, the price you'll pay is the price you'd happily pay — and less than a single textbook.",
    badge: 'Beta · everything free',

    tiers: [
      {
        name: 'Starter',
        priceLabel: 'Free',
        priceDetail: 'Forever, during beta',
        tagline: 'Everything you need to learn one track end-to-end.',
        features: [
          'Adaptive placement test',
          'Full lesson content (EN + AR)',
          'Daily plan generation',
          'AI tutor with all 6 tools',
          'Practice grading + mastery scoring',
          'One verifiable certificate',
        ],
        cta: 'Get started free',
        highlighted: false,
      },
      {
        name: 'Pro',
        priceLabel: '$19',
        priceDetail: 'per month, post-beta',
        tagline: 'For students serious about CA / SOCPA.',
        features: [
          'Everything in Starter',
          'Both India + KSA tracks',
          'Unlimited tutor messages',
          'Priority generation queue',
          'Exam-mode grand tests',
          'Certificate library',
        ],
        cta: 'Join waitlist',
        highlighted: true,
      },
      {
        name: 'Firm',
        priceLabel: 'Custom',
        priceDetail: 'For training departments',
        tagline: 'For accounting firms training their associates.',
        features: [
          'Everything in Pro',
          'Team dashboard + reports',
          'Per-associate progress tracking',
          'Custom curriculum modules',
          'SSO + SCIM provisioning',
          'Dedicated success manager',
        ],
        cta: 'Talk to us',
        highlighted: false,
      },
    ],

    promiseLabel: 'Our pricing promise',
    promise: [
      'No hidden tiers. What you see is what you get.',
      "If you're a student in India or KSA struggling to pay, email us. We'll figure something out.",
      "We'll never lock content behind a 'premium' tier mid-program.",
      'Cancel any time, no clawback, no email gauntlet.',
    ],

    faqLabel: 'Pricing questions',
    faqs: [
      {
        q: 'When does beta end?',
        a: "When we're confident the product holds up under real load and the curriculum is fully reviewed. Probably late 2026.",
      },
      {
        q: 'Will my Starter access stay free after beta?',
        a: 'Yes. Everyone who signs up during beta keeps free access to one full track for life.',
      },
      {
        q: 'Do you offer student discounts?',
        a: "We will. Real students at real institutions in India and KSA will get a meaningful discount on Pro.",
      },
      {
        q: 'Can my firm pay in INR or SAR?',
        a: 'Yes. Firm plans are billed in your local currency with local tax invoices.',
      },
    ],
  },

  ar: {
    eyebrow: 'الأسعار',
    title: 'مجاني خلال النسخة التجريبية. أسعار صادقة بعد ذلك.',
    subtitle:
      'نحن في النسخة التجريبية. كل شيء مجاني الآن. عند الإطلاق، السعر الذي ستدفعه هو السعر الذي ستدفعه بسعادة — وأقل من كتاب دراسي واحد.',
    badge: 'النسخة التجريبية · كل شيء مجاني',

    tiers: [
      {
        name: 'المبتدئ',
        priceLabel: 'مجاني',
        priceDetail: 'إلى الأبد خلال النسخة التجريبية',
        tagline: 'كل ما تحتاجه لتعلم مسار واحد كاملًا.',
        features: [
          'اختبار تحديد تكيفي',
          'محتوى الدروس كاملًا (EN + AR)',
          'توليد الخطة اليومية',
          'مدرس ذكي بكل الأدوات الست',
          'تصحيح التمارين ودرجة الإتقان',
          'شهادة قابلة للتحقق',
        ],
        cta: 'ابدأ مجانًا',
        highlighted: false,
      },
      {
        name: 'المحترف',
        priceLabel: '٧١ ر.س',
        priceDetail: 'شهريًا، بعد النسخة التجريبية',
        tagline: 'للطلاب الجادين في CA / SOCPA.',
        features: [
          'كل ما في المبتدئ',
          'مساري الهند والسعودية',
          'رسائل غير محدودة للمدرس',
          'أولوية في طابور التوليد',
          'وضع امتحان للاختبار الكبير',
          'مكتبة شهادات',
        ],
        cta: 'انضم لقائمة الانتظار',
        highlighted: true,
      },
      {
        name: 'الشركات',
        priceLabel: 'حسب الطلب',
        priceDetail: 'لأقسام التدريب',
        tagline: 'لشركات المحاسبة التي تدرب موظفيها.',
        features: [
          'كل ما في المحترف',
          'لوحة فريق + تقارير',
          'تتبع تقدم لكل موظف',
          'وحدات منهج مخصصة',
          'SSO + SCIM',
          'مدير نجاح مخصص',
        ],
        cta: 'تحدث معنا',
        highlighted: false,
      },
    ],

    promiseLabel: 'وعد التسعير',
    promise: [
      'لا فئات مخفية. ما تراه هو ما تحصل عليه.',
      'إذا كنت طالبًا في الهند أو السعودية وتجد صعوبة في الدفع، راسلنا.',
      'لن نحبس المحتوى خلف فئة "مميزة" في منتصف البرنامج.',
      'إلغاء في أي وقت، بدون استرداد، بدون رسائل إيميل مضايقة.',
    ],

    faqLabel: 'أسئلة الأسعار',
    faqs: [
      {
        q: 'متى تنتهي النسخة التجريبية؟',
        a: 'عندما نكون واثقين أن المنتج يصمد تحت الحمل الحقيقي وأن المنهج تمت مراجعته بالكامل. على الأرجح أواخر 2026.',
      },
      {
        q: 'هل سيظل وصولي للمبتدئ مجانيًا بعد النسخة التجريبية؟',
        a: 'نعم. كل من يسجل خلال النسخة التجريبية يحتفظ بوصول مجاني لمسار واحد كامل مدى الحياة.',
      },
      {
        q: 'هل تقدمون خصومات للطلاب؟',
        a: 'سنفعل. الطلاب الحقيقيون في الهند والسعودية سيحصلون على خصم حقيقي على المحترف.',
      },
      {
        q: 'هل يمكن لشركتي الدفع بالروبية أو الريال؟',
        a: 'نعم. خطط الشركات تُحاسَب بعملتك المحلية مع فواتير ضريبية محلية.',
      },
    ],
  },
} as const

export default async function PricingPage({
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
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-20 pb-12 text-center">
        <BlurFade delay={0.05}>
          <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {t.badge}
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

      {/* Tiers */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 lg:grid-cols-3">
          {t.tiers.map((tier, i) => (
            <BlurFade key={tier.name} delay={0.1 + i * 0.08}>
              <div
                className={cn(
                  'relative h-full overflow-hidden rounded-2xl border p-8 backdrop-blur',
                  tier.highlighted
                    ? 'border-accent bg-bg-elev shadow-2xl shadow-accent/10'
                    : 'border-border bg-bg-elev/50',
                )}
              >
                {tier.highlighted && (
                  <div className="absolute end-4 top-4">
                    <div className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
                      <Zap className="h-2.5 w-2.5" />
                      {locale === 'ar' ? 'الأشهر' : 'Most loved'}
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-tight">{tier.priceLabel}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {tier.priceDetail}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-fg-muted">{tier.tagline}</p>

                <div className="my-6 h-px bg-border" />

                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-fg">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Button
                    asChild
                    variant={tier.highlighted ? 'accent' : 'secondary'}
                    size="lg"
                    className="relative w-full overflow-hidden"
                  >
                    <a href={appLink(locale, '/sign-in')}>
                      {tier.cta}
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                      {tier.highlighted && (
                        <BorderBeam
                          size={48}
                          duration={6}
                          colorFrom="#a78bfa"
                          colorTo="#8b5cf6"
                        />
                      )}
                    </a>
                  </Button>
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </section>

      {/* Promise */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <BlurFade delay={0.05}>
          <div className="rounded-3xl border border-border bg-bg-elev/50 p-10 backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <CircleDot className="h-3 w-3 text-accent" />
              {t.promiseLabel}
            </div>
            <ul className="mt-6 space-y-4">
              {t.promise.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm leading-relaxed text-fg-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </BlurFade>
      </section>

      {/* FAQ */}
      <section className="relative z-10 border-t border-border bg-bg-elev/30 py-24 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6">
          <BlurFade delay={0.05}>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.faqLabel}</h2>
          </BlurFade>
          <div className="mt-10 space-y-3">
            {t.faqs.map((faq, i) => (
              <BlurFade key={faq.q} delay={0.05 + i * 0.05}>
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

      <Footer locale={locale} />
    </div>
  )
}
