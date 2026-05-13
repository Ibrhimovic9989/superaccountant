'use client'

import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/loading'
import { AlertTriangle, Download, Repeat, Trash2 } from 'lucide-react'
import * as React from 'react'

type Props = {
  locale: 'en' | 'ar'
  market: 'india' | 'ksa'
  switchTrackAction: () => Promise<void>
  exportDataAction: () => Promise<{ filename: string; json: string }>
  deleteAccountAction: () => Promise<void>
}

const COPY = {
  en: {
    sectionTitle: 'Account',
    sectionSub: 'Switch tracks, export your data, or close your account.',
    switchTitle: 'Switch tracks',
    switchBody: (current: 'india' | 'ksa') =>
      current === 'india'
        ? "You're on the Chartered Path (India). Switching to Mu'tamad Path (KSA) will reset your placement test — your profile and history are kept."
        : "You're on the Mu'tamad Path (KSA). Switching to Chartered Path (India) will reset your placement test — your profile and history are kept.",
    switchCta: 'Switch tracks',
    switchPending: 'Resetting…',
    switchConfirm:
      'This will clear your placement and send you back to the welcome flow. Continue?',

    exportTitle: 'Export your data',
    exportBody:
      'Download a JSON snapshot of everything we hold about you — profile, attempts, lessons, certificates.',
    exportCta: 'Download my data',
    exportPending: 'Preparing…',

    deleteTitle: 'Delete account',
    deleteBody:
      'Permanently remove your account and every record linked to it. This cannot be undone.',
    deleteCta: 'Delete account',
    deletePending: 'Deleting…',
    deleteConfirm:
      'This permanently deletes your account, your learning history, your tutor sessions, and any certificates you have earned. Are you sure?',
    deleteSecondConfirm: 'Type DELETE to confirm:',
  },
  ar: {
    sectionTitle: 'الحساب',
    sectionSub: 'بدّل المسار، صدّر بياناتك، أو أغلق حسابك.',
    switchTitle: 'تبديل المسار',
    switchBody: (current: 'india' | 'ksa') =>
      current === 'india'
        ? 'أنت حالياً على المسار المعتمد (الهند). الانتقال إلى مسار مُعتمَد (السعودية) سيعيد تعيين اختبار التحديد — يبقى ملفك الشخصي والسجل.'
        : 'أنت حالياً على مسار مُعتمَد (السعودية). الانتقال إلى المسار المعتمد (الهند) سيعيد تعيين اختبار التحديد — يبقى ملفك الشخصي والسجل.',
    switchCta: 'تبديل المسار',
    switchPending: 'جارٍ إعادة التعيين…',
    switchConfirm: 'سيؤدي هذا إلى مسح تحديدك وإعادتك إلى تدفق الترحيب. هل تريد المتابعة؟',

    exportTitle: 'صدّر بياناتك',
    exportBody: 'حمّل لقطة JSON لكل ما نحتفظ به عنك — الملف الشخصي، المحاولات، الدروس، الشهادات.',
    exportCta: 'تنزيل بياناتي',
    exportPending: 'جارٍ التحضير…',

    deleteTitle: 'حذف الحساب',
    deleteBody: 'إزالة حسابك وكل السجلات المرتبطة به نهائياً. لا يمكن التراجع.',
    deleteCta: 'حذف الحساب',
    deletePending: 'جارٍ الحذف…',
    deleteConfirm:
      'سيؤدي هذا إلى حذف حسابك وسجل تعلمك وجلسات المدرس وأي شهادات حصلت عليها بشكل دائم. هل أنت متأكد؟',
    deleteSecondConfirm: 'اكتب DELETE للتأكيد:',
  },
} as const

export function ProfileDangerZone({
  locale,
  market,
  switchTrackAction,
  exportDataAction,
  deleteAccountAction,
}: Props) {
  const t = COPY[locale]
  const [exporting, setExporting] = React.useState(false)

  // Track switch — confirm in JS, then submit the server action.
  function handleSwitchSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(t.switchConfirm)) {
      e.preventDefault()
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { filename, json } = await exportDataAction()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function handleDeleteSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm(t.deleteConfirm)) {
      e.preventDefault()
      return
    }
    const typed = prompt(t.deleteSecondConfirm)
    if (typed?.trim() !== 'DELETE') {
      e.preventDefault()
    }
  }

  return (
    <section className="mt-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        <Settings2Icon />
        {t.sectionTitle}
      </div>
      <p className="mb-6 max-w-xl text-sm text-fg-muted">{t.sectionSub}</p>

      <div className="space-y-3">
        {/* ── Switch tracks ───────────────────────────────────── */}
        <Row
          icon={<Repeat className="h-4 w-4" />}
          tone="default"
          title={t.switchTitle}
          body={t.switchBody(market)}
        >
          <form action={switchTrackAction} onSubmit={handleSwitchSubmit}>
            <SubmitButton variant="secondary" pendingLabel={t.switchPending}>
              <Repeat className="h-3.5 w-3.5" />
              {t.switchCta}
            </SubmitButton>
          </form>
        </Row>

        {/* ── Export ─────────────────────────────────────────── */}
        <Row
          icon={<Download className="h-4 w-4" />}
          tone="default"
          title={t.exportTitle}
          body={t.exportBody}
        >
          <Button type="button" variant="secondary" disabled={exporting} onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? t.exportPending : t.exportCta}
          </Button>
        </Row>

        {/* ── Delete ─────────────────────────────────────────── */}
        <Row
          icon={<AlertTriangle className="h-4 w-4" />}
          tone="danger"
          title={t.deleteTitle}
          body={t.deleteBody}
        >
          <form action={deleteAccountAction} onSubmit={handleDeleteSubmit}>
            <SubmitButton
              variant="secondary"
              pendingLabel={t.deletePending}
              className="border-danger/40 text-danger hover:border-danger hover:bg-danger/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.deleteCta}
            </SubmitButton>
          </form>
        </Row>
      </div>
    </section>
  )
}

function Row({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: React.ReactNode
  tone: 'default' | 'danger'
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${
        tone === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-border bg-bg-elev/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            tone === 'danger'
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-border bg-bg text-fg-muted'
          }`}
        >
          {icon}
        </span>
        <div>
          <p className={`text-sm font-semibold ${tone === 'danger' ? 'text-danger' : 'text-fg'}`}>
            {title}
          </p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-fg-muted">{body}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Settings2Icon() {
  // Inlined to avoid an extra import
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  )
}
