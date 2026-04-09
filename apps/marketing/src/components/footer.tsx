import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'

type Props = { locale: 'en' | 'ar' }

const PHONE = '+91 810 613 8866'
const PHONE_HREF = 'tel:+918106138866'
const EMAIL = 'info@superaccountant.in'
const EMAIL_HREF = 'mailto:info@superaccountant.in'

const COPY = {
  en: {
    tagline: 'The agentic accounting tutor for India and Saudi Arabia.',
    productLabel: 'Product',
    product: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'About', href: '/about' },
    ],
    learnLabel: 'Learn',
    learn: [
      { label: 'India · Chartered Path', href: '/features#india' },
      { label: "KSA · Mu'tamad Path", href: '/features#ksa' },
      { label: 'How the agent works', href: '/features#agent' },
    ],
    contactLabel: 'Contact',
    addressLabel: 'Address',
    addressLines: ['Unit 422, 4th floor', 'Downtown Mall', 'Lakdikapul', 'Hyderabad'],
    rights: '© 2026 SuperAccountant · All rights reserved',
    badges: 'EN · AR · ZATCA · GST · IFRS · Companies Act 2013',
    terms: 'Terms',
    privacy: 'Privacy',
  },
  ar: {
    tagline: 'مدرس المحاسبة الذكي للهند والمملكة العربية السعودية.',
    productLabel: 'المنتج',
    product: [
      { label: 'الميزات', href: '/features' },
      { label: 'الأسعار', href: '/pricing' },
      { label: 'من نحن', href: '/about' },
    ],
    learnLabel: 'تعلّم',
    learn: [
      { label: 'الهند · المسار المعتمد', href: '/features#india' },
      { label: 'السعودية · مسار مُعتمَد', href: '/features#ksa' },
      { label: 'كيف يعمل المدرس الذكي', href: '/features#agent' },
    ],
    contactLabel: 'تواصل',
    addressLabel: 'العنوان',
    addressLines: ['وحدة 422، الطابق الرابع', 'داون تاون مول', 'لاكديكابول', 'حيدر آباد'],
    rights: '© 2026 سوبر أكاونتنت · جميع الحقوق محفوظة',
    badges: 'إنجليزي · عربي · ZATCA · GST · IFRS · قانون الشركات',
    terms: 'الشروط',
    privacy: 'الخصوصية',
  },
} as const

export function Footer({ locale }: Props) {
  const t = COPY[locale]
  return (
    <footer className="relative z-10 border-t border-border bg-bg-elev/30 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-fg text-bg">
                <span className="font-mono text-[12px] font-bold leading-none">SA</span>
              </span>
              <span className="text-base font-semibold tracking-tight">SuperAccountant</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">{t.tagline}</p>
          </div>

          <FooterColumn label={t.productLabel} items={t.product} locale={locale} />
          <FooterColumn label={t.learnLabel} items={t.learn} locale={locale} />

          {/* Contact */}
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.contactLabel}
            </p>
            <ul className="space-y-3">
              <li>
                <a
                  href={PHONE_HREF}
                  dir="ltr"
                  className="group inline-flex items-start gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="tabular-nums">{PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={EMAIL_HREF}
                  className="group inline-flex items-start gap-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span className="break-all">{EMAIL}</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.addressLabel}
            </p>
            <div className="flex items-start gap-2.5 text-sm leading-relaxed text-fg-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <address className="not-italic">
                {t.addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </address>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.rights}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            <Link
              href={`/${locale}/terms`}
              className="transition-colors hover:text-fg"
            >
              {t.terms}
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className="transition-colors hover:text-fg"
            >
              {t.privacy}
            </Link>
            <span className="text-fg-subtle/40">·</span>
            <span>{t.badges}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  label,
  items,
  locale,
}: {
  label: string
  items: readonly { label: string; href: string }[]
  locale: 'en' | 'ar'
}) {
  return (
    <div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={`/${locale}${i.href}`}
              className="text-sm text-fg-muted transition-colors hover:text-fg"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
