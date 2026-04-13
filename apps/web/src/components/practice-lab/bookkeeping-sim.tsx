'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  IndianRupee,
  Landmark,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'

// ─── Scenario data: Sharma Trading Co. — April 2026 ──────────

type BankEntry = {
  id: string
  date: string
  narration: string
  debit: number | null
  credit: number | null
  // The correct classification the student needs to pick:
  correctType: 'sales_receipt' | 'purchase_payment' | 'expense' | 'loan_received' | 'loan_repayment' | 'salary' | 'tds_payment' | 'gst_payment' | 'other'
}

const BANK_STATEMENT: BankEntry[] = [
  { id: 'b1', date: '02 Apr', narration: 'NEFT from Patel Enterprises — Inv #1042', debit: null, credit: 85000, correctType: 'sales_receipt' },
  { id: 'b2', date: '03 Apr', narration: 'RTGS to Gupta Suppliers — Bill #PO-328', debit: 42000, credit: null, correctType: 'purchase_payment' },
  { id: 'b3', date: '05 Apr', narration: 'UPI to Jio — Monthly Internet', debit: 1180, credit: null, correctType: 'expense' },
  { id: 'b4', date: '07 Apr', narration: 'NEFT from Mehta & Sons — Inv #1045', debit: null, credit: 126500, correctType: 'sales_receipt' },
  { id: 'b5', date: '07 Apr', narration: 'TDS 194C deposited — Q4 FY26', debit: 8400, credit: null, correctType: 'tds_payment' },
  { id: 'b6', date: '10 Apr', narration: 'RTGS to Raj Transport — Freight Bill #F-91', debit: 35000, credit: null, correctType: 'purchase_payment' },
  { id: 'b7', date: '12 Apr', narration: 'Salary transfer — Apr 2026', debit: 215000, credit: null, correctType: 'salary' },
  { id: 'b8', date: '15 Apr', narration: 'Loan disbursement — HDFC Bank CC', debit: null, credit: 500000, correctType: 'loan_received' },
  { id: 'b9', date: '18 Apr', narration: 'NEFT from ABC Retail — Inv #1048', debit: null, credit: 34500, correctType: 'sales_receipt' },
  { id: 'b10', date: '20 Apr', narration: 'RTGS to Verma Chemicals — Bill #VC-112', debit: 78200, credit: null, correctType: 'purchase_payment' },
  { id: 'b11', date: '22 Apr', narration: 'GST IGST payment — Mar 2026', debit: 18750, credit: null, correctType: 'gst_payment' },
  { id: 'b12', date: '25 Apr', narration: 'Rent — Office Sector 44 Gurgaon', debit: 55000, credit: null, correctType: 'expense' },
  { id: 'b13', date: '28 Apr', narration: 'UPI from Unknown — Ref 9282817', debit: null, credit: 12000, correctType: 'other' },
  { id: 'b14', date: '29 Apr', narration: 'RTGS to Sharma & Co — Audit Fee', debit: 75000, credit: null, correctType: 'expense' },
  { id: 'b15', date: '30 Apr', narration: 'EMI — HDFC CC Loan', debit: 45000, credit: null, correctType: 'loan_repayment' },
]

type Invoice = {
  id: string
  type: 'sales' | 'purchase'
  party: string
  invoiceNo: string
  amount: number
  // Which bank entry ID it maps to (null if unpaid)
  matchesBankId: string | null
}

const INVOICES: Invoice[] = [
  { id: 'i1', type: 'sales', party: 'Patel Enterprises', invoiceNo: 'INV-1042', amount: 85000, matchesBankId: 'b1' },
  { id: 'i2', type: 'sales', party: 'Mehta & Sons', invoiceNo: 'INV-1045', amount: 126500, matchesBankId: 'b4' },
  { id: 'i3', type: 'sales', party: 'ABC Retail', invoiceNo: 'INV-1048', amount: 34500, matchesBankId: 'b9' },
  { id: 'i4', type: 'sales', party: 'Delhi Distributors', invoiceNo: 'INV-1050', amount: 67000, matchesBankId: null }, // unpaid
  { id: 'i5', type: 'purchase', party: 'Gupta Suppliers', invoiceNo: 'PO-328', amount: 42000, matchesBankId: 'b2' },
  { id: 'i6', type: 'purchase', party: 'Raj Transport', invoiceNo: 'F-91', amount: 35000, matchesBankId: 'b6' },
  { id: 'i7', type: 'purchase', party: 'Verma Chemicals', invoiceNo: 'VC-112', amount: 78200, matchesBankId: 'b10' },
  { id: 'i8', type: 'purchase', party: 'Om Packaging', invoiceNo: 'OP-44', amount: 22000, matchesBankId: null }, // unpaid
]

type TdsEntry = {
  bankId: string
  party: string
  amount: number
  section: string // correct section
  tdsRate: number // correct rate %
  isTdsApplicable: boolean
}

const TDS_ENTRIES: TdsEntry[] = [
  { bankId: 'b6', party: 'Raj Transport', amount: 35000, section: '194C', tdsRate: 2, isTdsApplicable: true },
  { bankId: 'b12', party: 'Office Rent', amount: 55000, section: '194I', tdsRate: 10, isTdsApplicable: true },
  { bankId: 'b14', party: 'Sharma & Co (Audit)', amount: 75000, section: '194J', tdsRate: 10, isTdsApplicable: true },
  { bankId: 'b2', party: 'Gupta Suppliers', amount: 42000, section: '-', tdsRate: 0, isTdsApplicable: false },
  { bankId: 'b10', party: 'Verma Chemicals', amount: 78200, section: '-', tdsRate: 0, isTdsApplicable: false },
]

const CLASSIFICATION_OPTIONS = [
  { value: 'sales_receipt', label: 'Sales Receipt', labelAr: 'إيصال مبيعات' },
  { value: 'purchase_payment', label: 'Purchase Payment', labelAr: 'دفعة مشتريات' },
  { value: 'expense', label: 'Expense', labelAr: 'مصروف' },
  { value: 'salary', label: 'Salary', labelAr: 'راتب' },
  { value: 'loan_received', label: 'Loan Received', labelAr: 'قرض مستلم' },
  { value: 'loan_repayment', label: 'Loan Repayment', labelAr: 'سداد قرض' },
  { value: 'tds_payment', label: 'TDS Payment', labelAr: 'دفعة TDS' },
  { value: 'gst_payment', label: 'GST Payment', labelAr: 'دفعة GST' },
  { value: 'other', label: 'Other / Suspense', labelAr: 'أخرى / معلق' },
] as const

// ─── Component ────────────────────────────────────────────

const STEPS = ['classify', 'match', 'tds', 'recon'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS = {
  en: { classify: 'Classify Entries', match: 'Match Invoices', tds: 'Identify TDS', recon: 'Reconcile' },
  ar: { classify: 'صنّف القيود', match: 'طابق الفواتير', tds: 'حدد TDS', recon: 'قم بالتسوية' },
} as const

export function BookkeepingSim({ locale }: { locale: 'en' | 'ar' }) {
  const [step, setStep] = React.useState<Step>('classify')
  const [classifications, setClassifications] = React.useState<Record<string, string>>({})
  const [matches, setMatches] = React.useState<Record<string, string>>({}) // invoiceId → bankId
  const [tdsAnswers, setTdsAnswers] = React.useState<Record<string, boolean>>({}) // bankId → applicable?
  const [submitted, setSubmitted] = React.useState<Record<Step, boolean>>({
    classify: false,
    match: false,
    tds: false,
    recon: false,
  })
  const [scores, setScores] = React.useState<Record<Step, number>>({
    classify: 0,
    match: 0,
    tds: 0,
    recon: 0,
  })

  const stepIdx = STEPS.indexOf(step)
  const isLast = stepIdx === STEPS.length - 1
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const maxScore = BANK_STATEMENT.length + INVOICES.length + TDS_ENTRIES.length + 1 // +1 for recon
  const allDone = Object.values(submitted).every(Boolean)

  function gradeClassify() {
    let correct = 0
    for (const entry of BANK_STATEMENT) {
      if (classifications[entry.id] === entry.correctType) correct++
    }
    setScores((s) => ({ ...s, classify: correct }))
    setSubmitted((s) => ({ ...s, classify: true }))
  }

  function gradeMatch() {
    let correct = 0
    for (const inv of INVOICES) {
      if (inv.matchesBankId === null) {
        if (!matches[inv.id] || matches[inv.id] === 'unpaid') correct++
      } else if (matches[inv.id] === inv.matchesBankId) {
        correct++
      }
    }
    setScores((s) => ({ ...s, match: correct }))
    setSubmitted((s) => ({ ...s, match: true }))
  }

  function gradeTds() {
    let correct = 0
    for (const entry of TDS_ENTRIES) {
      const answer = tdsAnswers[entry.bankId]
      if (answer === entry.isTdsApplicable) correct++
    }
    setScores((s) => ({ ...s, tds: correct }))
    setSubmitted((s) => ({ ...s, tds: true }))
  }

  function gradeRecon() {
    // The bank closing balance calculation
    const opening = 150000
    const totalCredits = BANK_STATEMENT.reduce((a, e) => a + (e.credit ?? 0), 0)
    const totalDebits = BANK_STATEMENT.reduce((a, e) => a + (e.debit ?? 0), 0)
    const closing = opening + totalCredits - totalDebits
    setScores((s) => ({ ...s, recon: 1 })) // auto-pass — the recon step is educational
    setSubmitted((s) => ({ ...s, recon: true }))
    return closing
  }

  const closingBalance = React.useMemo(() => {
    const opening = 150000
    const totalCredits = BANK_STATEMENT.reduce((a, e) => a + (e.credit ?? 0), 0)
    const totalDebits = BANK_STATEMENT.reduce((a, e) => a + (e.debit ?? 0), 0)
    return opening + totalCredits - totalDebits
  }, [])

  return (
    <div>
      {/* Header */}
      <BlurFade delay={0.05}>
        <Link
          href={`/${locale}/practice-lab`}
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          {locale === 'ar' ? 'معمل التمارين' : 'Practice Lab'}
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {locale === 'ar'
                ? 'مسك الدفاتر الشهري — شركة شارما التجارية'
                : 'Monthly Bookkeeping — Sharma Trading Co.'}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {locale === 'ar' ? 'أبريل ٢٠٢٦ · ١٥ قيد بنكي · ٨ فواتير' : 'April 2026 · 15 bank entries · 8 invoices'}
            </p>
          </div>
        </div>
      </BlurFade>

      {/* Step nav */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              step === s
                ? 'bg-accent text-accent-fg'
                : submitted[s]
                  ? 'bg-success/10 text-success'
                  : 'bg-bg-elev text-fg-muted hover:bg-bg-overlay',
            )}
          >
            {submitted[s] ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <span className="font-mono text-[10px]">{i + 1}</span>
            )}
            {STEP_LABELS[locale][s]}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-6"
        >
          {step === 'classify' && (
            <ClassifyStep
              locale={locale}
              entries={BANK_STATEMENT}
              classifications={classifications}
              setClassifications={setClassifications}
              submitted={submitted.classify}
              score={scores.classify}
              onSubmit={gradeClassify}
            />
          )}
          {step === 'match' && (
            <MatchStep
              locale={locale}
              invoices={INVOICES}
              bankEntries={BANK_STATEMENT}
              matches={matches}
              setMatches={setMatches}
              submitted={submitted.match}
              score={scores.match}
              onSubmit={gradeMatch}
            />
          )}
          {step === 'tds' && (
            <TdsStep
              locale={locale}
              entries={TDS_ENTRIES}
              answers={tdsAnswers}
              setAnswers={setTdsAnswers}
              submitted={submitted.tds}
              score={scores.tds}
              onSubmit={gradeTds}
            />
          )}
          {step === 'recon' && (
            <ReconStep
              locale={locale}
              entries={BANK_STATEMENT}
              closingBalance={closingBalance}
              submitted={submitted.recon}
              onSubmit={gradeRecon}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          disabled={stepIdx === 0}
          onClick={() => setStep(STEPS[stepIdx - 1]!)}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {locale === 'ar' ? 'السابق' : 'Previous'}
        </Button>
        {!isLast ? (
          <Button type="button" variant="accent" onClick={() => setStep(STEPS[stepIdx + 1]!)}>
            {locale === 'ar' ? 'التالي' : 'Next'}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : allDone ? (
          <div className="relative overflow-hidden rounded-lg">
            <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-5 py-3">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold text-success">
                  {locale === 'ar' ? 'اكتمل!' : 'Complete!'}
                </p>
                <p className="font-mono text-xs tabular-nums text-fg-muted">
                  {totalScore}/{maxScore} {locale === 'ar' ? 'صحيح' : 'correct'}
                </p>
              </div>
            </div>
            <BorderBeam size={60} duration={6} colorFrom="#22c55e" colorTo="#16a34a" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Task 1: Classify bank entries ─────────────────────────

function ClassifyStep({
  locale,
  entries,
  classifications,
  setClassifications,
  submitted,
  score,
  onSubmit,
}: {
  locale: 'en' | 'ar'
  entries: BankEntry[]
  classifications: Record<string, string>
  setClassifications: React.Dispatch<React.SetStateAction<Record<string, string>>>
  submitted: boolean
  score: number
  onSubmit: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/50">
      <div className="border-b border-border bg-bg-overlay px-5 py-3">
        <h2 className="text-sm font-semibold">
          {locale === 'ar'
            ? 'المهمة ١: صنّف كل قيد في كشف البنك'
            : 'Task 1: Classify each bank entry'}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {locale === 'ar'
            ? 'لكل قيد، اختر النوع الصحيح: إيصال مبيعات، دفعة مشتريات، مصروف، راتب، قرض، أو معلق.'
            : 'For each entry, pick the correct type: sales receipt, purchase payment, expense, salary, loan, or suspense.'}
        </p>
        {submitted && (
          <Badge variant="accent" className="mt-2">
            {score}/{entries.length} {locale === 'ar' ? 'صحيح' : 'correct'}
          </Badge>
        )}
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const isCorrect = submitted && classifications[entry.id] === entry.correctType
          const isWrong = submitted && classifications[entry.id] !== entry.correctType
          return (
            <div
              key={entry.id}
              className={cn(
                'flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between',
                isCorrect && 'bg-success/5',
                isWrong && 'bg-danger/5',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-fg-subtle">
                  <span className="font-mono tabular-nums">{entry.date}</span>
                  {entry.credit ? (
                    <span className="text-success">+₹{entry.credit.toLocaleString()}</span>
                  ) : (
                    <span className="text-danger">−₹{entry.debit?.toLocaleString()}</span>
                  )}
                  {submitted && isCorrect && <CheckCircle2 className="h-3 w-3 text-success" />}
                  {submitted && isWrong && <XCircle className="h-3 w-3 text-danger" />}
                </div>
                <p className="truncate text-sm">{entry.narration}</p>
                {submitted && isWrong && (
                  <p className="mt-1 font-mono text-[10px] text-danger">
                    → {CLASSIFICATION_OPTIONS.find((o) => o.value === entry.correctType)?.label}
                  </p>
                )}
              </div>
              <select
                value={classifications[entry.id] ?? ''}
                onChange={(e) =>
                  setClassifications((prev) => ({ ...prev, [entry.id]: e.target.value }))
                }
                disabled={submitted}
                className="shrink-0 rounded-lg border border-border bg-bg px-3 py-2 text-xs outline-none transition-colors focus:border-accent sm:w-44"
              >
                <option value="">{locale === 'ar' ? '— اختر —' : '— Select —'}</option>
                {CLASSIFICATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {locale === 'ar' ? opt.labelAr : opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {!submitted && (
        <div className="border-t border-border bg-bg-overlay px-5 py-3">
          <Button
            type="button"
            variant="accent"
            onClick={onSubmit}
            disabled={Object.keys(classifications).length < entries.length}
          >
            <Check className="h-3.5 w-3.5" />
            {locale === 'ar' ? 'تحقق من الإجابات' : 'Check answers'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Task 2: Match invoices to bank entries ─────────────────

function MatchStep({
  locale,
  invoices,
  bankEntries,
  matches,
  setMatches,
  submitted,
  score,
  onSubmit,
}: {
  locale: 'en' | 'ar'
  invoices: Invoice[]
  bankEntries: BankEntry[]
  matches: Record<string, string>
  setMatches: React.Dispatch<React.SetStateAction<Record<string, string>>>
  submitted: boolean
  score: number
  onSubmit: () => void
}) {
  const bankOptions = bankEntries.filter(
    (e) => e.credit !== null || e.debit !== null,
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/50">
      <div className="border-b border-border bg-bg-overlay px-5 py-3">
        <h2 className="text-sm font-semibold">
          {locale === 'ar'
            ? 'المهمة ٢: طابق كل فاتورة مع قيد البنك المناسب'
            : 'Task 2: Match each invoice to its bank entry'}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {locale === 'ar'
            ? 'بعض الفواتير لم تُسدد بعد — اختر "غير مسدد" لها.'
            : 'Some invoices are unpaid — select "Unpaid" for those.'}
        </p>
        {submitted && (
          <Badge variant="accent" className="mt-2">
            {score}/{invoices.length} {locale === 'ar' ? 'صحيح' : 'correct'}
          </Badge>
        )}
      </div>
      <div className="divide-y divide-border">
        {invoices.map((inv) => {
          const isCorrect =
            submitted &&
            ((inv.matchesBankId === null && (!matches[inv.id] || matches[inv.id] === 'unpaid')) ||
              matches[inv.id] === inv.matchesBankId)
          const isWrong = submitted && !isCorrect
          return (
            <div
              key={inv.id}
              className={cn(
                'flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between',
                isCorrect && 'bg-success/5',
                isWrong && 'bg-danger/5',
              )}
            >
              <div className="min-w-0 flex-1">
                <Badge variant={inv.type === 'sales' ? 'accent' : 'default'} className="mb-1">
                  {inv.type === 'sales'
                    ? locale === 'ar'
                      ? 'مبيعات'
                      : 'Sales'
                    : locale === 'ar'
                      ? 'مشتريات'
                      : 'Purchase'}
                </Badge>
                <p className="text-sm font-medium">{inv.party}</p>
                <p className="font-mono text-[10px] text-fg-subtle">
                  {inv.invoiceNo} · ₹{inv.amount.toLocaleString()}
                </p>
                {submitted && isWrong && (
                  <p className="mt-1 font-mono text-[10px] text-danger">
                    → {inv.matchesBankId
                      ? bankEntries.find((b) => b.id === inv.matchesBankId)?.narration?.slice(0, 40)
                      : 'Unpaid'}
                  </p>
                )}
              </div>
              <select
                value={matches[inv.id] ?? ''}
                onChange={(e) =>
                  setMatches((prev) => ({ ...prev, [inv.id]: e.target.value }))
                }
                disabled={submitted}
                className="shrink-0 rounded-lg border border-border bg-bg px-3 py-2 text-xs outline-none transition-colors focus:border-accent sm:w-56"
              >
                <option value="">{locale === 'ar' ? '— اختر —' : '— Select —'}</option>
                <option value="unpaid">{locale === 'ar' ? '🔴 غير مسدد' : '🔴 Unpaid'}</option>
                {bankOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.date} · {b.credit ? `+₹${b.credit.toLocaleString()}` : `-₹${b.debit?.toLocaleString()}`} · {b.narration.slice(0, 30)}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
      {!submitted && (
        <div className="border-t border-border bg-bg-overlay px-5 py-3">
          <Button
            type="button"
            variant="accent"
            onClick={onSubmit}
            disabled={Object.keys(matches).length < invoices.length}
          >
            <Check className="h-3.5 w-3.5" />
            {locale === 'ar' ? 'تحقق من المطابقة' : 'Check matches'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Task 3: Identify TDS applicability ─────────────────────

function TdsStep({
  locale,
  entries,
  answers,
  setAnswers,
  submitted,
  score,
  onSubmit,
}: {
  locale: 'en' | 'ar'
  entries: TdsEntry[]
  answers: Record<string, boolean>
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  submitted: boolean
  score: number
  onSubmit: () => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/50">
      <div className="border-b border-border bg-bg-overlay px-5 py-3">
        <h2 className="text-sm font-semibold">
          {locale === 'ar'
            ? 'المهمة ٣: حدد المدفوعات الخاضعة لخصم TDS'
            : 'Task 3: Identify which payments require TDS deduction'}
        </h2>
        <p className="mt-1 text-xs text-fg-muted">
          {locale === 'ar'
            ? 'لكل دفعة، حدد ما إذا كانت تتطلب خصم TDS بموجب أي باب (194C، 194I، 194J).'
            : 'For each payment, decide if TDS must be deducted under any section (194C, 194I, 194J).'}
        </p>
        {submitted && (
          <Badge variant="accent" className="mt-2">
            {score}/{entries.length} {locale === 'ar' ? 'صحيح' : 'correct'}
          </Badge>
        )}
      </div>
      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const answer = answers[entry.bankId]
          const isCorrect = submitted && answer === entry.isTdsApplicable
          const isWrong = submitted && answer !== entry.isTdsApplicable
          return (
            <div
              key={entry.bankId}
              className={cn(
                'flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between',
                isCorrect && 'bg-success/5',
                isWrong && 'bg-danger/5',
              )}
            >
              <div>
                <p className="text-sm font-medium">{entry.party}</p>
                <p className="font-mono text-[10px] text-fg-subtle">₹{entry.amount.toLocaleString()}</p>
                {submitted && entry.isTdsApplicable && (
                  <p className="mt-1 font-mono text-[10px] text-accent">
                    § {entry.section} @ {entry.tdsRate}% = ₹{Math.round(entry.amount * entry.tdsRate / 100).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [entry.bankId]: true }))}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                    answer === true
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-border bg-bg text-fg-muted hover:border-border-strong',
                  )}
                >
                  {locale === 'ar' ? 'نعم TDS' : 'Yes TDS'}
                </button>
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [entry.bankId]: false }))}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-xs font-medium transition-colors',
                    answer === false
                      ? 'border-accent bg-accent text-accent-fg'
                      : 'border-border bg-bg text-fg-muted hover:border-border-strong',
                  )}
                >
                  {locale === 'ar' ? 'لا TDS' : 'No TDS'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {!submitted && (
        <div className="border-t border-border bg-bg-overlay px-5 py-3">
          <Button
            type="button"
            variant="accent"
            onClick={onSubmit}
            disabled={Object.keys(answers).length < entries.length}
          >
            <Check className="h-3.5 w-3.5" />
            {locale === 'ar' ? 'تحقق' : 'Check answers'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Task 4: Bank reconciliation ────────────────────────────

function ReconStep({
  locale,
  entries,
  closingBalance,
  submitted,
  onSubmit,
}: {
  locale: 'en' | 'ar'
  entries: BankEntry[]
  closingBalance: number
  submitted: boolean
  onSubmit: () => number
}) {
  const [inputBalance, setInputBalance] = React.useState('')
  const opening = 150000
  const totalCredits = entries.reduce((a, e) => a + (e.credit ?? 0), 0)
  const totalDebits = entries.reduce((a, e) => a + (e.debit ?? 0), 0)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev/50">
      <div className="border-b border-border bg-bg-overlay px-5 py-3">
        <h2 className="text-sm font-semibold">
          {locale === 'ar'
            ? 'المهمة ٤: تسوية البنك — احسب الرصيد الختامي'
            : 'Task 4: Bank Reconciliation — calculate the closing balance'}
        </h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-border bg-bg p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {locale === 'ar' ? 'الرصيد الافتتاحي' : 'Opening'}
            </p>
            <p className="mt-2 font-mono text-lg font-medium">₹{opening.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-success">
              {locale === 'ar' ? 'إجمالي الإيداعات' : 'Total Credits'}
            </p>
            <p className="mt-2 font-mono text-lg font-medium text-success">
              +₹{totalCredits.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-danger">
              {locale === 'ar' ? 'إجمالي السحوبات' : 'Total Debits'}
            </p>
            <p className="mt-2 font-mono text-lg font-medium text-danger">
              −₹{totalDebits.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            {locale === 'ar' ? 'الرصيد الختامي (₹)' : 'Closing balance (₹)'}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={inputBalance}
              onChange={(e) => setInputBalance(e.target.value)}
              disabled={submitted}
              placeholder={locale === 'ar' ? 'أدخل الرصيد' : 'Enter balance'}
              className="flex-1 rounded-lg border border-border bg-bg px-4 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-fg-subtle focus:border-accent"
            />
            {!submitted && (
              <Button
                type="button"
                variant="accent"
                onClick={onSubmit}
                disabled={!inputBalance}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div
              className={cn(
                'rounded-xl border p-4',
                Number(inputBalance) === closingBalance
                  ? 'border-success/30 bg-success/10'
                  : 'border-warning/30 bg-warning/10',
              )}
            >
              <p className="text-sm font-semibold">
                {Number(inputBalance) === closingBalance
                  ? locale === 'ar'
                    ? '✓ صحيح! الرصيد يتطابق.'
                    : '✓ Correct! Balance matches.'
                  : locale === 'ar'
                    ? '⚠ ليس تمامًا.'
                    : '⚠ Not quite.'}
              </p>
              <p className="mt-1 font-mono text-xs text-fg-muted">
                {locale === 'ar' ? 'الرصيد الختامي الصحيح' : 'Correct closing balance'}: ₹{closingBalance.toLocaleString()}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                {locale === 'ar'
                  ? `₹${opening.toLocaleString()} + ₹${totalCredits.toLocaleString()} − ₹${totalDebits.toLocaleString()} = ₹${closingBalance.toLocaleString()}`
                  : `₹${opening.toLocaleString()} + ₹${totalCredits.toLocaleString()} − ₹${totalDebits.toLocaleString()} = ₹${closingBalance.toLocaleString()}`}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
