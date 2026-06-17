'use client'

import { cn } from '@/lib/utils'
import { Award, Check, Copy, FileText, TrendingUp } from 'lucide-react'
import { useState } from 'react'

/**
 * Share-with-recruiter card. Shows up on /[locale]/my-progress once
 * the student has either a certificate OR a learning-curve report
 * generated. One-click copy for either URL plus a "copy both" combo
 * that pastes a recruiter-ready email body.
 */

type Props = {
  locale: 'en' | 'ar'
  curveVerifyHash: string | null
  curvePdfUrl: string | null
  certVerifyHash: string | null
}

const COPY = {
  en: {
    title: 'Your verifiable credentials',
    sub: 'Share these links with a recruiter — they can confirm authenticity in one click. Each link includes an HMAC-signed verification page; nothing on your machine can be tampered with.',
    cert: 'Certificate',
    curve: 'Learning curve',
    download: 'Download PDF',
    copyUrl: 'Copy link',
    copied: 'Copied',
    bothBtn: 'Copy a recruiter-ready blurb',
    bothBlurb: (certUrl: string, curveUrl: string) =>
      `Hi — sharing my SuperAccountant credentials for your review.

Certificate (verifies pass + score):
  ${certUrl}

Learning curve (verifies phase-by-phase mastery + trajectory):
  ${curveUrl}

Both pages are HMAC-signed by SuperAccountant. Happy to share more detail on any phase.`,
  },
  ar: {
    title: 'بيانات اعتمادك القابلة للتحقق',
    sub: 'شارك هذه الروابط مع المسؤول عن التوظيف — يستطيع التحقق من صحتها بنقرة واحدة. كل رابط يتضمن صفحة تحقق موقعة برمز HMAC؛ لا يمكن العبث بأي شيء على جهازك.',
    cert: 'الشهادة',
    curve: 'منحنى التعلم',
    download: 'تنزيل PDF',
    copyUrl: 'نسخ الرابط',
    copied: 'تم النسخ',
    bothBtn: 'نسخ رسالة جاهزة للمسؤول عن التوظيف',
    bothBlurb: (certUrl: string, curveUrl: string) =>
      `مرحباً — أشارك بيانات اعتمادي من سوبر أكاونتنت للمراجعة.

الشهادة (تتحقق من النجاح + الدرجة):
  ${certUrl}

منحنى التعلم (يتحقق من إتقان كل مرحلة + المسار):
  ${curveUrl}

كلا الصفحتين موقعتان برمز HMAC من سوبر أكاونتنت. يسعدني مشاركة تفاصيل أكثر عن أي مرحلة.`,
  },
} as const

export function ShareCredentialsCard({
  locale,
  curveVerifyHash,
  curvePdfUrl,
  certVerifyHash,
}: Props) {
  const t = COPY[locale]
  // The window.location.origin call only happens after mount; on SSR
  // we fall back to the production domain so the copied URLs are
  // recruiter-shareable even if no JS has run yet.
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.superaccountant.in'
  const certUrl = certVerifyHash ? `${origin}/${locale}/verify/${certVerifyHash}` : null
  const curveUrl = curveVerifyHash
    ? `${origin}/${locale}/verify-curve/${curveVerifyHash}`
    : null

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-5">
      <p className="text-sm font-semibold">{t.title}</p>
      <p className="mt-1 text-xs text-fg-muted">{t.sub}</p>

      <div className="mt-4 space-y-3">
        {certUrl && (
          <CredentialRow
            icon={<Award className="h-4 w-4" />}
            label={t.cert}
            url={certUrl}
            pdfUrl={null}
            copyLabel={t.copyUrl}
            copiedLabel={t.copied}
            downloadLabel={t.download}
          />
        )}
        {curveUrl && (
          <CredentialRow
            icon={<TrendingUp className="h-4 w-4" />}
            label={t.curve}
            url={curveUrl}
            pdfUrl={curvePdfUrl}
            copyLabel={t.copyUrl}
            copiedLabel={t.copied}
            downloadLabel={t.download}
          />
        )}
      </div>

      {certUrl && curveUrl && (
        <BothButton
          label={t.bothBtn}
          copiedLabel={t.copied}
          getText={() => t.bothBlurb(certUrl, curveUrl)}
        />
      )}
    </div>
  )
}

function CredentialRow({
  icon,
  label,
  url,
  pdfUrl,
  copyLabel,
  copiedLabel,
  downloadLabel,
}: {
  icon: React.ReactNode
  label: string
  url: string
  pdfUrl: string | null
  copyLabel: string
  copiedLabel: string
  downloadLabel: string
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev/60 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border bg-bg px-2 py-1 font-mono text-[11px] text-fg-muted">
          {url}
        </code>
        <CopyButton text={url} idle={copyLabel} done={copiedLabel} />
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-elev px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg"
          >
            <FileText className="h-3.5 w-3.5" />
            {downloadLabel}
          </a>
        )}
      </div>
    </div>
  )
}

function CopyButton({
  text,
  idle,
  done,
}: {
  text: string
  idle: string
  done: string
}) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Older browsers / strict CSP — fall back to nothing visible; the
      // recruiter URL is still in the code element above for them to
      // hand-select.
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
        copied
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-border bg-bg-elev text-fg-muted hover:bg-bg-overlay hover:text-fg',
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? done : idle}
    </button>
  )
}

function BothButton({
  label,
  copiedLabel,
  getText,
}: {
  label: string
  copiedLabel: string
  getText: () => string
}) {
  const [copied, setCopied] = useState(false)
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(getText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
        copied
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-accent/30 bg-accent text-accent-fg hover:opacity-90',
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </button>
  )
}
