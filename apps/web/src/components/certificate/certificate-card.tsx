'use client'

import * as React from 'react'
import { Award, Check, Download, Link as LinkIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { MagicCard } from '@/components/magicui/magic-card'
import { BorderBeam } from '@/components/magicui/border-beam'
import { NumberTicker } from '@/components/magicui/number-ticker'

type Locale = 'en' | 'ar'

const COPY = {
  en: {
    badge: 'Verified certificate',
    completed: 'has successfully completed the',
    score: 'Score',
    issued: 'Issued',
    verify: 'Verify',
    hash: 'Verification hash',
    download: 'Download PDF',
    share: 'Copy link',
    linkCopied: 'Link copied',
    trackIndia: 'Chartered Path · India',
    trackKsa: "Mu'tamad Path · Saudi Arabia",
  },
  ar: {
    badge: 'شهادة موثقة',
    completed: 'قد أكمل بنجاح',
    score: 'النتيجة',
    issued: 'تاريخ الإصدار',
    verify: 'تحقق',
    hash: 'رمز التحقق',
    download: 'تنزيل PDF',
    share: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط',
    trackIndia: 'المسار المعتمد · الهند',
    trackKsa: 'مسار مُعتمَد · المملكة العربية السعودية',
  },
} as const

type Props = {
  locale: Locale
  studentName: string
  market: 'india' | 'ksa'
  score: number
  issuedAt: string
  hash: string
  pdfUrl?: string
  verifyUrl?: string
  showActions?: boolean
}

export function CertificateCard({
  locale,
  studentName,
  market,
  score,
  issuedAt,
  hash,
  pdfUrl,
  verifyUrl,
  showActions = true,
}: Props) {
  const t = COPY[locale]
  const [copied, setCopied] = React.useState(false)
  const trackLabel = market === 'india' ? t.trackIndia : t.trackKsa
  const pct = Math.round(score * 100)
  const issuedDate = new Date(issuedAt).toLocaleDateString(
    locale === 'ar' ? 'ar-SA' : 'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  )

  function copyLink() {
    if (!verifyUrl) return
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <MagicCard className="rounded-3xl border border-border">
      <div className="relative flex flex-col items-center px-6 py-12 text-center sm:px-12 sm:py-16">
        {/* Verified pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
          <Check className="h-3 w-3" />
          {t.badge}
        </div>

        {/* Award icon tile */}
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-bg shadow-lg">
          <Award className="h-7 w-7 text-accent" />
        </div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
        >
          {studentName}
        </motion.h1>

        <p className="mt-4 text-sm text-fg-muted">{t.completed}</p>
        <p className="mt-1 text-base font-medium">{trackLabel}</p>

        {/* Spec strip */}
        <div className="mt-10 grid w-full max-w-md grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border">
          <div className="bg-bg-elev p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.score}
            </p>
            <div className="mt-1 flex items-baseline justify-center gap-0.5">
              <NumberTicker
                value={pct}
                className="font-mono text-2xl font-medium tracking-tight"
              />
              <span className="font-mono text-sm text-fg-subtle">%</span>
            </div>
          </div>
          <div className="bg-bg-elev p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.issued}
            </p>
            <p className="mt-1 text-sm font-medium tabular-nums">{issuedDate}</p>
          </div>
          <div className="bg-bg-elev p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {t.verify}
            </p>
            {verifyUrl ? (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                <LinkIcon className="h-3 w-3" />
                {locale === 'ar' ? 'رابط' : 'Link'}
              </a>
            ) : (
              <p className="mt-1 text-sm font-medium text-fg-subtle">—</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {pdfUrl && (
              <Button asChild variant="accent">
                <a href={pdfUrl} download>
                  <Download className="h-4 w-4" />
                  {t.download}
                </a>
              </Button>
            )}
            {verifyUrl && (
              <Button type="button" variant="secondary" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                {copied ? t.linkCopied : t.share}
              </Button>
            )}
          </div>
        )}

        {/* Hash */}
        <div className="mt-12 w-full max-w-md border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {t.hash}
          </p>
          <p
            dir="ltr"
            className="mt-1 break-all text-start font-mono text-[10px] text-fg-subtle"
          >
            {hash}
          </p>
        </div>

        <BorderBeam size={80} duration={10} colorFrom="#a78bfa" colorTo="#8b5cf6" />
      </div>
    </MagicCard>
  )
}
