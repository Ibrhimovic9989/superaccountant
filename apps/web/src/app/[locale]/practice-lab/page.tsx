import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calculator,
  FileSpreadsheet,
  IndianRupee,
  Landmark,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import type { SupportedLocale } from '@sa/i18n'
import { AppNav } from '@/components/app-nav'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { getUserProfile } from '@/lib/data/profile'
import { cn } from '@/lib/utils'

const COPY = {
  en: {
    badge: 'Practice Lab',
    title: 'Hands-on simulations',
    subtitle:
      'Real bookkeeping scenarios from a working CA office. Classify bank entries, match invoices, identify TDS, and reconcile — just like a junior accountant on day one.',
    comingSoon: 'Coming soon',
    live: 'Live',
    start: 'Start simulation',
    tasks: 'tasks',
    mins: 'min',
  },
  ar: {
    badge: 'معمل التمارين',
    title: 'محاكاة عملية',
    subtitle:
      'سيناريوهات محاسبة حقيقية من مكتب CA عامل. صنّف قيود البنك، طابق الفواتير، حدد TDS، وقم بالتسوية — تمامًا كمحاسب مبتدئ في يومه الأول.',
    comingSoon: 'قريبًا',
    live: 'متاح',
    start: 'ابدأ المحاكاة',
    tasks: 'مهام',
    mins: 'دقيقة',
  },
} as const

type Scenario = {
  id: string
  icon: 'building' | 'bank' | 'payroll' | 'gst' | 'tds' | 'recon'
  nameEn: string
  nameAr: string
  descEn: string
  descAr: string
  tasks: number
  estimatedMins: number
  live: boolean
  color: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'monthly-bookkeeping',
    icon: 'building',
    nameEn: 'Monthly Bookkeeping — Sharma Trading Co.',
    nameAr: 'مسك الدفاتر الشهري — شركة شارما التجارية',
    descEn:
      'Process a month of transactions for a small trading company. Classify bank entries, match sales/purchase invoices to the bank statement, identify TDS-applicable payments, and reconcile.',
    descAr:
      'معالجة شهر من المعاملات لشركة تجارية صغيرة. صنّف قيود البنك، طابق فواتير المبيعات والمشتريات مع كشف البنك، حدد المدفوعات الخاضعة لـ TDS، وقم بالتسوية.',
    tasks: 4,
    estimatedMins: 20,
    live: true,
    color: 'accent',
  },
  {
    id: 'payroll-processing',
    icon: 'payroll',
    nameEn: 'Payroll Processing — 15 Employees',
    nameAr: 'معالجة الرواتب — ١٥ موظفًا',
    descEn:
      'Calculate gross-to-net pay for a small firm. Handle PF, ESI, Professional Tax, and TDS on salaries. Generate the payroll summary and statutory payment schedule.',
    descAr:
      'احسب صافي الراتب من الإجمالي لشركة صغيرة. تعامل مع PF و ESI وضريبة المهنة و TDS على الرواتب.',
    tasks: 3,
    estimatedMins: 15,
    live: false,
    color: 'warning',
  },
  {
    id: 'gst-reconciliation',
    icon: 'gst',
    nameEn: 'GST Reconciliation — GSTR-2B vs Books',
    nameAr: 'تسوية GST — GSTR-2B مقابل الدفاتر',
    descEn:
      'Download GSTR-2B data and reconcile it with purchase invoices in the books. Find missing invoices, mismatched amounts, and invoices that do not belong to you.',
    descAr:
      'حمّل بيانات GSTR-2B وقم بتسويتها مع فواتير المشتريات في الدفاتر. اعثر على الفواتير المفقودة والمبالغ غير المتطابقة.',
    tasks: 3,
    estimatedMins: 15,
    live: false,
    color: 'danger',
  },
  {
    id: 'tds-quarterly',
    icon: 'tds',
    nameEn: 'TDS Quarterly Return Filing',
    nameAr: 'تقديم إقرار TDS الفصلي',
    descEn:
      'Review a quarter of expense payments, calculate TDS under sections 194C, 194I, 194J. Prepare Form 26Q and verify against 26AS.',
    descAr:
      'راجع مدفوعات المصاريف لربع سنة، احسب TDS تحت أبواب 194C و 194I و 194J. جهّز النموذج 26Q وتحقق من 26AS.',
    tasks: 4,
    estimatedMins: 20,
    live: false,
    color: 'success',
  },
  {
    id: 'zoho-books-setup',
    icon: 'recon',
    nameEn: 'Zoho Books Setup & First Month',
    nameAr: 'إعداد Zoho Books والشهر الأول',
    descEn:
      'Set up a new Zoho Books organization from scratch: chart of accounts, opening balances, first sales invoice, first purchase bill, and first bank reconciliation.',
    descAr:
      'أعد مؤسسة Zoho Books جديدة من الصفر: دليل الحسابات، الأرصدة الافتتاحية، أول فاتورة مبيعات، أول فاتورة مشتريات، وأول تسوية بنكية.',
    tasks: 5,
    estimatedMins: 25,
    live: false,
    color: 'accent',
  },
]

const ICON_MAP = {
  building: Building2,
  bank: Landmark,
  payroll: Calculator,
  gst: FileSpreadsheet,
  tds: IndianRupee,
  recon: BookOpen,
} as const

export default async function PracticeLabPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const u = await getUserProfile(session.user.id)
  if (!u?.preferredTrack) redirect(`/${locale}/welcome`)
  const t = COPY[locale]

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <FileSpreadsheet className="h-3 w-3 text-accent" />
            {t.badge}
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-2xl text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
        </BlurFade>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((scenario, i) => {
            const Icon = ICON_MAP[scenario.icon]
            return (
              <BlurFade key={scenario.id} delay={0.1 + i * 0.05}>
                <div
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-bg-elev/50 backdrop-blur transition-all',
                    scenario.live
                      ? 'border-border hover:border-border-strong hover:bg-bg-elev'
                      : 'border-border/50 opacity-60',
                  )}
                >
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'inline-flex h-10 w-10 items-center justify-center rounded-xl border',
                          scenario.color === 'accent' &&
                            'border-accent/30 bg-accent-soft text-accent',
                          scenario.color === 'warning' &&
                            'border-warning/30 bg-warning/10 text-warning',
                          scenario.color === 'success' &&
                            'border-success/30 bg-success/10 text-success',
                          scenario.color === 'danger' &&
                            'border-danger/30 bg-danger/10 text-danger',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <Badge
                        variant={scenario.live ? 'accent' : 'default'}
                        className={cn(!scenario.live && 'text-fg-subtle')}
                      >
                        {scenario.live ? t.live : t.comingSoon}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-sm font-semibold leading-snug sm:text-base">
                      {locale === 'ar' ? scenario.nameAr : scenario.nameEn}
                    </h3>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-fg-muted">
                      {locale === 'ar' ? scenario.descAr : scenario.descEn}
                    </p>
                    <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                      <span>
                        {scenario.tasks} {t.tasks}
                      </span>
                      <span className="text-fg-subtle/40">·</span>
                      <span>
                        ~{scenario.estimatedMins} {t.mins}
                      </span>
                    </div>
                  </div>
                  {scenario.live && (
                    <Link
                      href={`/${locale}/practice-lab/${scenario.id}`}
                      className="flex items-center justify-center gap-2 border-t border-border bg-bg-overlay/50 py-3 text-sm font-medium text-accent transition-colors hover:bg-bg-overlay"
                    >
                      {t.start}
                      <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </Link>
                  )}
                  {scenario.live && (
                    <BorderBeam
                      size={100}
                      duration={10}
                      colorFrom="#a78bfa"
                      colorTo="#8b5cf6"
                    />
                  )}
                </div>
              </BlurFade>
            )
          })}
        </div>
      </main>
    </div>
  )
}
