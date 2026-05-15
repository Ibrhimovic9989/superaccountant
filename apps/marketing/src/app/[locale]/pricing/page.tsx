import { Footer } from '@/components/footer'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { MarketingNav } from '@/components/marketing-nav'
import { Button } from '@/components/ui/button'
import { appLink } from '@/lib/config'
import { cn } from '@/lib/utils'
import type { SupportedLocale } from '@sa/i18n'
import {
  ArrowRight,
  Award,
  Calendar,
  Check,
  CircleDot,
  Clock,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react'

/**
 * Pricing page. The product is a paid 45-day offline cohort with an AI
 * tutor app bundled in — not a SaaS subscription. So this page mirrors
 * the live cohort data in the web app: one card per active cohort,
 * pricing in the local currency, with the 50%-off launch framing.
 */

type Track = {
  code: string
  emoji: string
  name: string
  jurisdiction: string
  city: string
  startDate: string
  durationDays: number
  seats: number
  currency: string
  priceLabel: string
  originalPriceLabel: string
  discountPct: number
  highlighted?: boolean
}

const TRACKS: Track[] = [
  {
    code: 'iA26',
    emoji: '🇮🇳',
    name: 'Indian Chartered',
    jurisdiction: 'India',
    city: 'Hyderabad',
    startDate: '1 June 2026',
    durationDays: 45,
    seats: 30,
    currency: 'INR',
    priceLabel: '₹24,999',
    originalPriceLabel: '₹50,000',
    discountPct: 50,
    highlighted: true,
  },
  {
    code: 'sA26',
    emoji: '🇸🇦',
    name: "Saudi Mu'tamad",
    jurisdiction: 'Saudi Arabia',
    city: 'Riyadh',
    startDate: '1 July 2026',
    durationDays: 45,
    seats: 30,
    currency: 'SAR',
    priceLabel: 'SAR 4,999',
    originalPriceLabel: 'SAR 9,999',
    discountPct: 50,
  },
]

const COPY = {
  en: {
    eyebrow: 'Pricing',
    badge: '50% launch discount · Limited seats',
    title: 'One fee. One cohort. Job-ready in 45 days.',
    subtitle:
      'Pay once. Get 45 days of offline classroom + nightly AI tutor + placement support. Both tracks include the full curriculum, daily homework, mock interviews, and a verifiable certificate.',
    nextCohorts: 'Next cohorts',

    cohortLabel: 'Cohort',
    durationLabel: 'Duration',
    seatsLabel: 'Seats',
    startsLabel: 'Starts',
    cityLabel: 'Venue',
    oneTimeFee: 'One-time fee · No subscription · No hidden costs',
    reserveSeat: 'Reserve seat',

    whatsIncludedLabel: "What's included in every cohort",
    includes: [
      '45 days of evening offline classes (Mon–Sat, 6:30–9:30 PM)',
      'Hands-on Tally Prime end-to-end (or Zoho Books for KSA)',
      '24/7 AI tutor app — bilingual, grounded in your curriculum',
      'Daily homework, personalised to what you struggled with',
      'WhatsApp doubt-clearing channel with your instructor',
      'Mock interviews + resume rebuild + salary negotiation',
      'Hiring partner introductions (CA firms, SMEs, BPOs)',
      'Verifiable e-certificate — hash-signed, employer-checkable',
    ],

    paymentLabel: 'How payment works',
    paymentBody:
      'Pay securely via Razorpay (UPI, cards, netbanking, wallets). Indian cohort billed in INR; Saudi cohort billed in SAR. We email a tax invoice within 24 hours. 7-day cooling-off refund, no questions.',
    refundLink: 'See refund policy',

    discountLabel: 'Founder discount codes',
    discountBody:
      "Have a discount code? Enter it on the apply form — codes are scoped per cohort and applied at checkout. Some codes drop the price to ₹1 for early supporters; we don't list them publicly.",

    promiseLabel: 'Our pricing promise',
    promise: [
      'No subscription, no recurring billing. One payment per cohort.',
      'If the cohort doesn’t run, you get a full refund — no questions.',
      "If you're a serious student struggling to pay, email us. We'll figure something out.",
      'We don’t lock content behind tiers — your seat fee unlocks everything.',
    ],

    faqLabel: 'Pricing questions',
    faqs: [
      {
        q: 'Why one fee instead of a monthly subscription?',
        a: 'Accounting is a finite curriculum, not an endless content feed. We sell completion, not retention. 45 days, one fee, you’re job-ready.',
      },
      {
        q: 'What does the fee actually pay for?',
        a: 'Classroom rent + instructor pay + AI tutor compute + placement support + certificate verification infrastructure. Roughly 40% goes to instructors, 25% to placement, the rest to platform.',
      },
      {
        q: 'Can I pay in EMIs?',
        a: 'Yes. Razorpay supports 3 / 6 EMI options on most Indian credit cards. We walk you through it on the application call.',
      },
      {
        q: 'What if I miss classes?',
        a: 'Every classroom session is recorded. The AI tutor has full curriculum context so you can catch up at your own pace. Miss more than 6 of 45 sessions and we’ll chat about whether this is the right cohort.',
      },
      {
        q: 'Is placement guaranteed?',
        a: 'No. The support is guaranteed — 3 mocks, resume rebuild, hiring partner intros. Whether you land depends on you doing the work. ~80% of graduates have a job within 90 days.',
      },
      {
        q: 'Do you offer student discounts?',
        a: "Real students at real institutions in India and KSA: yes. Email info@superaccountant.in with proof of enrolment and we'll send a code.",
      },
      {
        q: 'Can my employer sponsor my seat?',
        a: 'Yes. We can invoice your firm directly with GSTIN/VAT details. Tell us at signup and we’ll route to billing.',
      },
    ],
  },

  ar: {
    eyebrow: 'الأسعار',
    badge: 'خصم الإطلاق ٥٠٪ · مقاعد محدودة',
    title: 'رسوم واحدة. دفعة واحدة. جاهز للعمل في ٤٥ يومًا.',
    subtitle:
      'ادفع مرة واحدة. احصل على ٤٥ يومًا من الفصل الدراسي + مدرس ذكي + دعم التوظيف. كلا المسارين يتضمنان المنهج الكامل والواجبات اليومية والمقابلات التدريبية وشهادة قابلة للتحقق.',
    nextCohorts: 'الدفعات القادمة',

    cohortLabel: 'الدفعة',
    durationLabel: 'المدة',
    seatsLabel: 'المقاعد',
    startsLabel: 'تبدأ',
    cityLabel: 'المكان',
    oneTimeFee: 'رسوم لمرة واحدة · بدون اشتراك · بدون رسوم مخفية',
    reserveSeat: 'احجز مقعدك',

    whatsIncludedLabel: 'ما المُتضمَّن في كل دفعة',
    includes: [
      '٤٥ يومًا من الفصول المسائية (الإثنين-السبت، ٦:٣٠-٩:٣٠ مساءً)',
      'تطبيق عملي على Zoho Books / Tally Prime من البداية للنهاية',
      'مدرس ذكي على مدار الساعة — ثنائي اللغة، مُتجذِّر في منهجك',
      'واجبات يومية مخصصة لما تواجهه من صعوبات',
      'قناة واتساب لحل الإشكالات مع المدرب',
      'مقابلات تدريبية + إعادة بناء السيرة + التفاوض على الراتب',
      'تعريفات بشركاء التوظيف (مكاتب محاسبية، شركات صغيرة)',
      'شهادة إلكترونية قابلة للتحقق — موقّعة، يفحصها صاحب العمل',
    ],

    paymentLabel: 'طريقة الدفع',
    paymentBody:
      'الدفع الآمن عبر Razorpay (UPI، بطاقات، تحويلات، محافظ). الدفعة الهندية بالروبية؛ السعودية بالريال. تصلك فاتورة ضريبية خلال ٢٤ ساعة. استرداد كامل خلال ٧ أيام، بلا أسئلة.',
    refundLink: 'سياسة الاسترداد',

    discountLabel: 'أكواد خصم المؤسسين',
    discountBody:
      'هل لديك كود خصم؟ أدخله في نموذج التسجيل — الأكواد مقيدة لكل دفعة وتُطبَّق عند الدفع. بعض الأكواد تخفض السعر إلى ١ روبية للداعمين الأوائل؛ لا نعلنها للعامة.',

    promiseLabel: 'وعد التسعير',
    promise: [
      'بدون اشتراك أو فواتير متكررة. دفعة واحدة لكل دفعة طلابية.',
      'إذا لم تنطلق الدفعة، تسترد المبلغ كاملًا — بلا أسئلة.',
      'إذا كنت طالبًا جادًا وتواجه صعوبة في الدفع، راسلنا.',
      'لا نحبس المحتوى خلف فئات — رسومك تفتح كل شيء.',
    ],

    faqLabel: 'أسئلة الأسعار',
    faqs: [
      {
        q: 'لماذا رسوم واحدة بدلًا من اشتراك شهري؟',
        a: 'المحاسبة منهج محدود، لا تيار محتوى لا ينتهي. نبيع الإنجاز لا الإبقاء. ٤٥ يومًا، رسوم واحدة، أنت جاهز للعمل.',
      },
      {
        q: 'فيمَ تُصرف الرسوم فعليًا؟',
        a: 'إيجار الفصل + أجور المدربين + حوسبة المدرس الذكي + دعم التوظيف + بنية التحقق من الشهادات.',
      },
      {
        q: 'هل يمكن الدفع بالأقساط؟',
        a: 'نعم. Razorpay يدعم تقسيط ٣ أو ٦ أشهر على معظم البطاقات الائتمانية الهندية.',
      },
      {
        q: 'ماذا لو فاتتني الفصول؟',
        a: 'كل جلسة فصلية تُسجَّل. والمدرس الذكي يعرف منهجك كاملًا لتلحق بإيقاعك. تفويت أكثر من ٦ من ٤٥ جلسة نتحدث عن مدى ملاءمة الدفعة.',
      },
      {
        q: 'هل التوظيف مضمون؟',
        a: 'لا. الدعم مضمون — ٣ مقابلات تدريبية، إعادة بناء السيرة، تعريفات شركاء التوظيف. النتيجة تعتمد عليك. ~٨٠٪ من الخريجين يجدون عملًا خلال ٩٠ يومًا.',
      },
      {
        q: 'هل تقدمون خصومات طلابية؟',
        a: 'نعم. الطلاب الحقيقيون في مؤسسات حقيقية في الهند والسعودية. راسلنا على info@superaccountant.in مع إثبات.',
      },
      {
        q: 'هل يمكن لصاحب العمل أن يموّل مقعدي؟',
        a: 'نعم. نُصدر فاتورة باسم شركتك مع تفاصيل GSTIN/VAT. أخبرنا عند التسجيل.',
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
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-accent backdrop-blur">
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

      {/* Cohort cards */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        <BlurFade delay={0.2}>
          <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.nextCohorts}
          </p>
        </BlurFade>
        <div className="grid gap-5 lg:grid-cols-2">
          {TRACKS.map((track, i) => (
            <BlurFade key={track.code} delay={0.22 + i * 0.06}>
              <CohortCard track={track} t={t} locale={locale} />
            </BlurFade>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-fg-subtle">{t.oneTimeFee}</p>
      </section>

      {/* What's included */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <BlurFade delay={0.05}>
          <div className="rounded-3xl border border-border bg-bg-elev/50 p-8 backdrop-blur sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t.whatsIncludedLabel}
            </h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {t.includes.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 text-sm leading-relaxed text-fg-muted"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </BlurFade>
      </section>

      {/* Payment + discount */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2">
          <BlurFade delay={0.05}>
            <div className="h-full rounded-2xl border border-border bg-bg-elev/50 p-6 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                {t.paymentLabel}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t.paymentBody}</p>
              <a
                href={appLink(locale, '/refund-policy')}
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent/80"
              >
                {t.refundLink}
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </a>
            </div>
          </BlurFade>
          <BlurFade delay={0.1}>
            <div className="h-full rounded-2xl border border-border bg-bg-elev/50 p-6 backdrop-blur">
              <p className="font-mono text-[10px] uppercase tracking-wider text-success">
                {t.discountLabel}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t.discountBody}</p>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Promise */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <BlurFade delay={0.05}>
          <div className="rounded-3xl border border-border bg-bg-elev/40 p-10 backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
              <CircleDot className="h-3 w-3 text-accent" />
              {t.promiseLabel}
            </div>
            <ul className="mt-6 space-y-4">
              {t.promise.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 text-sm leading-relaxed text-fg-muted"
                >
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

function CohortCard({
  track,
  t,
  locale,
}: {
  track: Track
  t: (typeof COPY)[keyof typeof COPY]
  locale: SupportedLocale
}) {
  const isIndia = track.jurisdiction === 'India'
  const accent = isIndia ? '#a78bfa' : '#10b981'
  return (
    <div
      className={cn(
        'lift group relative h-full overflow-hidden rounded-2xl border-2 p-7 backdrop-blur transition-all hover:-translate-y-0.5',
        isIndia
          ? 'border-accent/40 bg-gradient-to-br from-accent-soft/40 via-bg-elev/50 to-bg-elev/50 hover:border-accent/70'
          : 'border-success/40 bg-gradient-to-br from-success/10 via-bg-elev/50 to-bg-elev/50 hover:border-success/70',
      )}
    >
      <BorderBeam
        size={140}
        duration={9}
        colorFrom={accent}
        colorTo={isIndia ? '#8b5cf6' : '#059669'}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider',
            isIndia ? 'text-accent' : 'text-success',
          )}
        >
          <span aria-hidden className="text-base leading-none">
            {track.emoji}
          </span>
          {track.name}
        </p>
        <span
          className={cn(
            'rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
            isIndia
              ? 'border-accent/30 bg-accent-soft/60 text-accent'
              : 'border-success/30 bg-success/10 text-success',
          )}
        >
          {track.discountPct}% off · launch
        </span>
      </div>

      {/* Cohort code as a token */}
      <div className="mt-4 inline-flex items-baseline gap-2 font-mono">
        <span className="text-fg-subtle">[</span>
        <span className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: accent }}>
          {track.code}
        </span>
        <span className="text-fg-subtle">]</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
        <CohortStat
          icon={<Calendar className="h-3.5 w-3.5" />}
          label={t.startsLabel}
          value={track.startDate}
        />
        <CohortStat
          icon={<MapPin className="h-3.5 w-3.5" />}
          label={t.cityLabel}
          value={track.city}
        />
        <CohortStat
          icon={<Clock className="h-3.5 w-3.5" />}
          label={t.durationLabel}
          value={`${track.durationDays} ${locale === 'ar' ? 'يومًا' : 'days'}`}
        />
        <CohortStat
          icon={<Users className="h-3.5 w-3.5" />}
          label={t.seatsLabel}
          value={`${track.seats} ${locale === 'ar' ? 'مقاعد' : 'seats'}`}
        />
      </div>

      <div className="my-6 h-px bg-border" />

      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          {track.priceLabel}
        </span>
        <span className="text-lg text-fg-subtle line-through">{track.originalPriceLabel}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-success">
        <Award className="me-1 inline h-3 w-3" />
        Includes placement support
      </p>

      <Button asChild variant={isIndia ? 'accent' : 'secondary'} size="lg" className="mt-6 w-full">
        <a href={appLink(locale, '/cohort#apply')}>
          {t.reserveSeat} · {track.priceLabel}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      </Button>
    </div>
  )
}

function CohortStat({
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
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  )
}
