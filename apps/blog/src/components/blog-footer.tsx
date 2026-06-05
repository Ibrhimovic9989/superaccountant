import Link from 'next/link'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Logomark, Wordmark } from './brand/logo'

/**
 * Blog footer — mirrors apps/marketing's Footer so the brand chrome
 * lines up across surfaces. EN-only (the blog has no locale routing
 * yet). Trimmed to the column shape that fits a content site: brand
 * block, sitemap (recent / by-market / careers), contact, address.
 */

const PHONE = '+91 810 613 8866'
const PHONE_HREF = 'tel:+918106138866'
const EMAIL = 'info@superaccountant.in'
const EMAIL_HREF = 'mailto:info@superaccountant.in'

type Props = {
  appUrl: string
}

export function BlogFooter({ appUrl }: Props) {
  return (
    <footer className="relative z-10 mt-16 border-t border-border bg-bg-elev/30 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3">
              <Logomark size={42} />
              <Wordmark className="text-lg" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
              Practitioner-grade reading for B.Com students, recent graduates,
              and accountants in India and Saudi Arabia.
            </p>
          </div>

          <FooterColumn
            label="Browse"
            items={[
              { label: 'Latest posts', href: '/' },
              { label: 'India', href: '/tag/india' },
              { label: 'KSA', href: '/tag/ksa' },
              { label: 'Careers', href: '/tag/careers' },
            ]}
          />

          <FooterColumn
            label="Product"
            items={[
              { label: 'Take the quiz', href: `${appUrl}/en/quiz`, external: true },
              { label: '45-day cohort', href: `${appUrl}/en/cohort`, external: true },
              { label: 'Marketing site', href: 'https://superaccountant.in', external: true },
            ]}
          />

          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Contact
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

          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Address
            </p>
            <div className="flex items-start gap-2.5 text-sm leading-relaxed text-fg-muted">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <address className="not-italic">
                <div>Unit 422, 4th floor</div>
                <div>Downtown Mall</div>
                <div>Lakdikapul</div>
                <div>Hyderabad</div>
              </address>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            © 2026 SuperAccountant · All rights reserved
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            <Link
              href="https://superaccountant.in/en/terms"
              className="transition-colors hover:text-fg"
            >
              Terms
            </Link>
            <Link
              href="https://superaccountant.in/en/privacy"
              className="transition-colors hover:text-fg"
            >
              Privacy
            </Link>
            <span className="text-fg-subtle/40">·</span>
            <span>EN · ZATCA · GST · IFRS · Companies Act 2013</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

type FooterItem = { label: string; href: string; external?: boolean }

function FooterColumn({ label, items }: { label: string; items: readonly FooterItem[] }) {
  return (
    <div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>
      <ul className="space-y-2.5">
        {items.map((i) =>
          i.external ? (
            <li key={i.href}>
              <a
                href={i.href}
                rel="noreferrer"
                className="text-sm text-fg-muted transition-colors hover:text-fg"
              >
                {i.label}
              </a>
            </li>
          ) : (
            <li key={i.href}>
              <Link
                href={i.href}
                className="text-sm text-fg-muted transition-colors hover:text-fg"
              >
                {i.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
