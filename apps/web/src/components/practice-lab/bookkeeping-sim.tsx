'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Landmark,
  List,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { cn } from '@/lib/utils'

// ─── Chart of Accounts — Sharma Trading Co. ─────────────────

type Account = {
  code: string
  name: string
  group: 'asset' | 'liability' | 'income' | 'expense' | 'equity'
  subGroup: string
}

const ACCOUNTS: Account[] = [
  { code: 'BANK', name: 'Bank A/c (HDFC)', group: 'asset', subGroup: 'Current Assets' },
  { code: 'CASH', name: 'Cash A/c', group: 'asset', subGroup: 'Current Assets' },
  // Sundry Debtors
  { code: 'PATEL', name: 'Patel Enterprises', group: 'asset', subGroup: 'Sundry Debtors' },
  { code: 'MEHTA', name: 'Mehta & Sons', group: 'asset', subGroup: 'Sundry Debtors' },
  { code: 'ABC', name: 'ABC Retail', group: 'asset', subGroup: 'Sundry Debtors' },
  { code: 'DELHI', name: 'Delhi Distributors', group: 'asset', subGroup: 'Sundry Debtors' },
  // Sundry Creditors
  { code: 'GUPTA', name: 'Gupta Suppliers', group: 'liability', subGroup: 'Sundry Creditors' },
  { code: 'RAJ', name: 'Raj Transport', group: 'liability', subGroup: 'Sundry Creditors' },
  { code: 'VERMA', name: 'Verma Chemicals', group: 'liability', subGroup: 'Sundry Creditors' },
  { code: 'OM', name: 'Om Packaging', group: 'liability', subGroup: 'Sundry Creditors' },
  { code: 'SHARMA', name: 'Sharma & Co (Audit)', group: 'liability', subGroup: 'Sundry Creditors' },
  // Loans
  { code: 'HDFC_LOAN', name: 'Loan from HDFC Bank', group: 'liability', subGroup: 'Loans (Liability)' },
  // Duties & Taxes
  { code: 'TDS_PAY', name: 'TDS Payable', group: 'liability', subGroup: 'Duties & Taxes' },
  { code: 'GST_PAY', name: 'GST Payable', group: 'liability', subGroup: 'Duties & Taxes' },
  // Income
  { code: 'SALES', name: 'Sales A/c', group: 'income', subGroup: 'Revenue' },
  // Expenses
  { code: 'PURCHASE', name: 'Purchase A/c', group: 'expense', subGroup: 'Direct Expenses' },
  { code: 'FREIGHT', name: 'Freight Charges', group: 'expense', subGroup: 'Direct Expenses' },
  { code: 'SALARY', name: 'Salary A/c', group: 'expense', subGroup: 'Indirect Expenses' },
  { code: 'RENT', name: 'Rent A/c', group: 'expense', subGroup: 'Indirect Expenses' },
  { code: 'INTERNET', name: 'Internet Expense', group: 'expense', subGroup: 'Indirect Expenses' },
  { code: 'AUDIT', name: 'Audit Fees', group: 'expense', subGroup: 'Indirect Expenses' },
  { code: 'EMI_INT', name: 'Loan EMI (Principal)', group: 'expense', subGroup: 'Indirect Expenses' },
  { code: 'SUSPENSE', name: 'Suspense A/c', group: 'asset', subGroup: 'Current Assets' },
]

// ─── Bank Statement — the source document ───────────────────

type BankEntry = {
  id: string
  date: string
  narration: string
  debit: number | null
  credit: number | null
}

const BANK_STATEMENT: BankEntry[] = [
  { id: 'b1', date: '02 Apr', narration: 'NEFT from Patel Enterprises — Inv #1042', debit: null, credit: 85000 },
  { id: 'b2', date: '03 Apr', narration: 'RTGS to Gupta Suppliers — Bill #PO-328', debit: 42000, credit: null },
  { id: 'b3', date: '05 Apr', narration: 'UPI to Jio — Monthly Internet', debit: 1180, credit: null },
  { id: 'b4', date: '07 Apr', narration: 'NEFT from Mehta & Sons — Inv #1045', debit: null, credit: 126500 },
  { id: 'b5', date: '07 Apr', narration: 'TDS 194C deposited — Q4 FY26', debit: 8400, credit: null },
  { id: 'b6', date: '10 Apr', narration: 'RTGS to Raj Transport — Freight Bill #F-91', debit: 35000, credit: null },
  { id: 'b7', date: '12 Apr', narration: 'Salary transfer — Apr 2026', debit: 215000, credit: null },
  { id: 'b8', date: '15 Apr', narration: 'Loan disbursement — HDFC Bank CC', debit: null, credit: 500000 },
  { id: 'b9', date: '18 Apr', narration: 'NEFT from ABC Retail — Inv #1048', debit: null, credit: 34500 },
  { id: 'b10', date: '20 Apr', narration: 'RTGS to Verma Chemicals — Bill #VC-112', debit: 78200, credit: null },
  { id: 'b11', date: '22 Apr', narration: 'GST IGST payment — Mar 2026', debit: 18750, credit: null },
  { id: 'b12', date: '25 Apr', narration: 'Rent — Office Sector 44 Gurgaon', debit: 55000, credit: null },
  { id: 'b13', date: '28 Apr', narration: 'UPI from Unknown — Ref 9282817', debit: null, credit: 12000 },
  { id: 'b14', date: '29 Apr', narration: 'RTGS to Sharma & Co — Audit Fee', debit: 75000, credit: null },
  { id: 'b15', date: '30 Apr', narration: 'EMI — HDFC CC Loan', debit: 45000, credit: null },
]

// ─── Expected correct vouchers ──────────────────────────────

type ExpectedVoucher = {
  bankId: string
  type: 'receipt' | 'payment' | 'contra' | 'journal'
  debit: string  // account code
  credit: string // account code
  amount: number
  hint: string
}

const EXPECTED: ExpectedVoucher[] = [
  { bankId: 'b1', type: 'receipt', debit: 'BANK', credit: 'PATEL', amount: 85000, hint: 'Receipt from Patel against Inv #1042' },
  { bankId: 'b2', type: 'payment', debit: 'GUPTA', credit: 'BANK', amount: 42000, hint: 'Payment to Gupta Suppliers for PO-328' },
  { bankId: 'b3', type: 'payment', debit: 'INTERNET', credit: 'BANK', amount: 1180, hint: 'Jio internet expense' },
  { bankId: 'b4', type: 'receipt', debit: 'BANK', credit: 'MEHTA', amount: 126500, hint: 'Receipt from Mehta & Sons against Inv #1045' },
  { bankId: 'b5', type: 'payment', debit: 'TDS_PAY', credit: 'BANK', amount: 8400, hint: 'TDS liability discharged' },
  { bankId: 'b6', type: 'payment', debit: 'FREIGHT', credit: 'BANK', amount: 35000, hint: 'Freight to Raj Transport — remember 194C TDS!' },
  { bankId: 'b7', type: 'payment', debit: 'SALARY', credit: 'BANK', amount: 215000, hint: 'April salaries' },
  { bankId: 'b8', type: 'receipt', debit: 'BANK', credit: 'HDFC_LOAN', amount: 500000, hint: 'Loan credited — liability increases' },
  { bankId: 'b9', type: 'receipt', debit: 'BANK', credit: 'ABC', amount: 34500, hint: 'Receipt from ABC Retail against Inv #1048' },
  { bankId: 'b10', type: 'payment', debit: 'VERMA', credit: 'BANK', amount: 78200, hint: 'Payment to Verma Chemicals for VC-112' },
  { bankId: 'b11', type: 'payment', debit: 'GST_PAY', credit: 'BANK', amount: 18750, hint: 'GST liability discharged' },
  { bankId: 'b12', type: 'payment', debit: 'RENT', credit: 'BANK', amount: 55000, hint: 'Rent expense — remember 194I TDS!' },
  { bankId: 'b13', type: 'receipt', debit: 'BANK', credit: 'SUSPENSE', amount: 12000, hint: 'Unknown credit — park in Suspense until clarified' },
  { bankId: 'b14', type: 'payment', debit: 'AUDIT', credit: 'BANK', amount: 75000, hint: 'Audit fee — remember 194J TDS!' },
  { bankId: 'b15', type: 'payment', debit: 'EMI_INT', credit: 'BANK', amount: 45000, hint: 'Loan EMI repayment' },
]

const VOUCHER_TYPES = [
  { value: 'receipt', label: 'Receipt', icon: '↓', desc: 'Money coming IN to bank' },
  { value: 'payment', label: 'Payment', icon: '↑', desc: 'Money going OUT of bank' },
  { value: 'contra', label: 'Contra', icon: '↔', desc: 'Bank ↔ Cash transfer' },
  { value: 'journal', label: 'Journal', icon: '📝', desc: 'Non-cash adjustment' },
] as const

type Voucher = {
  bankId: string
  type: string
  debit: string
  credit: string
  amount: number
}

type Tab = 'vouchers' | 'ledger' | 'trial'

// ─── Main Component ─────────────────────────────────────────

export function BookkeepingSim({ locale }: { locale: 'en' | 'ar' }) {
  const [vouchers, setVouchers] = React.useState<Voucher[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<Tab>('vouchers')
  const [showResults, setShowResults] = React.useState(false)

  // Voucher form state
  const [formType, setFormType] = React.useState('')
  const [formDebit, setFormDebit] = React.useState('')
  const [formCredit, setFormCredit] = React.useState('')

  const completedBankIds = new Set(vouchers.map((v) => v.bankId))
  const selectedEntry = BANK_STATEMENT.find((e) => e.id === selectedBankId)

  function resetForm() {
    setFormType('')
    setFormDebit('')
    setFormCredit('')
  }

  function submitVoucher() {
    if (!selectedBankId || !formType || !formDebit || !formCredit || !selectedEntry) return
    const amount = selectedEntry.credit ?? selectedEntry.debit ?? 0
    setVouchers((prev) => [
      ...prev.filter((v) => v.bankId !== selectedBankId),
      { bankId: selectedBankId, type: formType, debit: formDebit, credit: formCredit, amount },
    ])
    resetForm()
    // Auto-advance to next unprocessed entry
    const nextUnprocessed = BANK_STATEMENT.find(
      (e) => e.id !== selectedBankId && !completedBankIds.has(e.id),
    )
    setSelectedBankId(nextUnprocessed?.id ?? null)
  }

  function checkResults() {
    setShowResults(true)
    setTab('vouchers')
  }

  // Compute trial balance from vouchers
  const balances = React.useMemo(() => {
    const bal: Record<string, { debit: number; credit: number }> = {}
    // Opening: Bank has ₹1,50,000
    bal.BANK = { debit: 150000, credit: 0 }
    for (const v of vouchers) {
      if (!bal[v.debit]) bal[v.debit] = { debit: 0, credit: 0 }
      if (!bal[v.credit]) bal[v.credit] = { debit: 0, credit: 0 }
      bal[v.debit]!.debit += v.amount
      bal[v.credit]!.credit += v.amount
    }
    return bal
  }, [vouchers])

  const score = React.useMemo(() => {
    if (!showResults) return { correct: 0, total: EXPECTED.length }
    let correct = 0
    for (const exp of EXPECTED) {
      const v = vouchers.find((v) => v.bankId === exp.bankId)
      if (v && v.type === exp.type && v.debit === exp.debit && v.credit === exp.credit) {
        correct++
      }
    }
    return { correct, total: EXPECTED.length }
  }, [vouchers, showResults])

  return (
    <div>
      {/* Header */}
      <BlurFade delay={0.05}>
        <Link
          href={`/${locale}/practice-lab`}
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
          Practice Lab
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent">
              <Landmark className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-2xl">
                Tally Simulation — Sharma Trading Co.
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                April 2026 · Opening bank balance: ₹1,50,000 · {vouchers.length}/{BANK_STATEMENT.length} entries posted
              </p>
            </div>
          </div>
          <Badge variant={completedBankIds.size === BANK_STATEMENT.length ? 'accent' : 'default'}>
            {completedBankIds.size}/{BANK_STATEMENT.length}
          </Badge>
        </div>
      </BlurFade>

      {/* Tab bar */}
      <div className="mt-5 flex items-center gap-1 border-b border-border">
        {([
          { id: 'vouchers' as Tab, label: 'Voucher Entry', icon: FileText },
          { id: 'ledger' as Tab, label: 'Day Book', icon: List },
          { id: 'trial' as Tab, label: 'Trial Balance', icon: BookOpen },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        {completedBankIds.size === BANK_STATEMENT.length && !showResults && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="ms-auto mb-1"
            onClick={checkResults}
          >
            <Check className="h-3.5 w-3.5" />
            Check All Entries
          </Button>
        )}
      </div>

      {/* Voucher Entry tab */}
      {tab === 'vouchers' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          {/* Left: Bank Statement */}
          <div className="overflow-hidden rounded-xl border border-border bg-bg-elev/50">
            <div className="border-b border-border bg-bg-overlay px-4 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                <Landmark className="mb-0.5 inline h-3 w-3" /> HDFC Bank Statement — April 2026
              </p>
            </div>
            <div className="max-h-[65vh] divide-y divide-border overflow-y-auto">
              {BANK_STATEMENT.map((entry) => {
                const done = completedBankIds.has(entry.id)
                const selected = selectedBankId === entry.id
                const expected = showResults ? EXPECTED.find((e) => e.bankId === entry.id) : null
                const voucher = showResults ? vouchers.find((v) => v.bankId === entry.id) : null
                const isCorrect = showResults && expected && voucher &&
                  voucher.type === expected.type && voucher.debit === expected.debit && voucher.credit === expected.credit
                const isWrong = showResults && !isCorrect

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedBankId(entry.id)
                      resetForm()
                      // Pre-fill if already posted
                      const existing = vouchers.find((v) => v.bankId === entry.id)
                      if (existing) {
                        setFormType(existing.type)
                        setFormDebit(existing.debit)
                        setFormCredit(existing.credit)
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-4 py-2.5 text-start transition-colors',
                      selected ? 'bg-accent-soft' : 'hover:bg-bg-overlay',
                      showResults && isCorrect && 'bg-success/5',
                      showResults && isWrong && 'bg-danger/5',
                    )}
                  >
                    <span className="shrink-0">
                      {showResults ? (
                        isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-danger" />
                        )
                      ) : done ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[8px] text-fg-subtle">
                          {BANK_STATEMENT.indexOf(entry) + 1}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{entry.narration}</p>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-fg-subtle">
                        <span>{entry.date}</span>
                        {entry.credit ? (
                          <span className="text-success">Cr ₹{entry.credit.toLocaleString()}</span>
                        ) : (
                          <span className="text-danger">Dr ₹{entry.debit?.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Voucher Form */}
          <div className="overflow-hidden rounded-xl border border-border bg-bg-elev/50">
            {selectedEntry ? (
              <>
                <div className="border-b border-border bg-bg-overlay px-4 py-2.5">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                    Create Voucher
                  </p>
                  <p className="mt-1 text-sm">{selectedEntry.narration}</p>
                  <p className="font-mono text-xs text-fg-muted">
                    {selectedEntry.date} · {selectedEntry.credit ? `Cr ₹${selectedEntry.credit.toLocaleString()}` : `Dr ₹${selectedEntry.debit?.toLocaleString()}`}
                  </p>
                </div>
                <div className="space-y-4 p-4">
                  {/* Voucher Type */}
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      Voucher Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {VOUCHER_TYPES.map((vt) => (
                        <button
                          key={vt.value}
                          type="button"
                          onClick={() => setFormType(vt.value)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-center text-xs transition-colors',
                            formType === vt.value
                              ? 'border-accent bg-accent text-accent-fg'
                              : 'border-border bg-bg hover:border-border-strong',
                          )}
                        >
                          <span className="text-base">{vt.icon}</span>
                          <p className="mt-1 font-medium">{vt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Debit Account */}
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      Debit A/c (Dr.)
                    </label>
                    <select
                      value={formDebit}
                      onChange={(e) => setFormDebit(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
                    >
                      <option value="">— Select Account —</option>
                      {Object.entries(groupAccountsBySubGroup()).map(([group, accs]) => (
                        <optgroup key={group} label={group}>
                          {accs.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              {acc.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Credit Account */}
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      Credit A/c (Cr.)
                    </label>
                    <select
                      value={formCredit}
                      onChange={(e) => setFormCredit(e.target.value)}
                      className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
                    >
                      <option value="">— Select Account —</option>
                      {Object.entries(groupAccountsBySubGroup()).map(([group, accs]) => (
                        <optgroup key={group} label={group}>
                          {accs.map((acc) => (
                            <option key={acc.code} value={acc.code}>
                              {acc.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Amount (auto-filled, read-only) */}
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                      Amount
                    </label>
                    <div className="rounded-lg border border-border bg-bg-overlay px-4 py-2.5 font-mono text-lg tabular-nums">
                      ₹{(selectedEntry.credit ?? selectedEntry.debit ?? 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="button"
                    variant="accent"
                    className="w-full"
                    disabled={!formType || !formDebit || !formCredit}
                    onClick={submitVoucher}
                  >
                    <Plus className="h-4 w-4" />
                    Post Voucher
                  </Button>

                  {/* Show hint for wrong entries after results */}
                  {showResults && (() => {
                    const exp = EXPECTED.find((e) => e.bankId === selectedBankId)
                    if (!exp) return null
                    const v = vouchers.find((v) => v.bankId === selectedBankId)
                    const isCorrect = v && v.type === exp.type && v.debit === exp.debit && v.credit === exp.credit
                    if (isCorrect) return null
                    return (
                      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
                        <p className="font-semibold text-warning">Expected:</p>
                        <p className="mt-1 text-fg-muted">
                          {VOUCHER_TYPES.find((t) => t.value === exp.type)?.label} — Dr. {ACCOUNTS.find((a) => a.code === exp.debit)?.name}, Cr. {ACCOUNTS.find((a) => a.code === exp.credit)?.name}
                        </p>
                        <p className="mt-1 italic text-fg-subtle">{exp.hint}</p>
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center gap-3 p-6 text-center">
                <Landmark className="h-8 w-8 text-fg-subtle" />
                <p className="text-sm text-fg-muted">
                  Select a bank entry from the left to create a voucher
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {completedBankIds.size}/{BANK_STATEMENT.length} entries posted
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Book tab */}
      {tab === 'ledger' && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-bg-elev/50">
          <div className="border-b border-border bg-bg-overlay px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Day Book — All Vouchers Posted
            </p>
          </div>
          {vouchers.length === 0 ? (
            <p className="p-8 text-center text-sm text-fg-muted">No vouchers posted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-overlay/50 text-[10px] uppercase tracking-wider text-fg-subtle">
                    <th className="px-4 py-2 text-start font-mono">Date</th>
                    <th className="px-4 py-2 text-start font-mono">Type</th>
                    <th className="px-4 py-2 text-start font-mono">Debit A/c</th>
                    <th className="px-4 py-2 text-start font-mono">Credit A/c</th>
                    <th className="px-4 py-2 text-end font-mono">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers
                    .sort((a, b) => {
                      const ia = BANK_STATEMENT.findIndex((e) => e.id === a.bankId)
                      const ib = BANK_STATEMENT.findIndex((e) => e.id === b.bankId)
                      return ia - ib
                    })
                    .map((v) => {
                      const entry = BANK_STATEMENT.find((e) => e.id === v.bankId)
                      return (
                        <tr key={v.bankId} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-mono text-xs text-fg-subtle">
                            {entry?.date}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant="default" className="text-[9px]">
                              {v.type}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {ACCOUNTS.find((a) => a.code === v.debit)?.name}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            {ACCOUNTS.find((a) => a.code === v.credit)?.name}
                          </td>
                          <td className="px-4 py-2 text-end font-mono text-xs tabular-nums">
                            ₹{v.amount.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trial Balance tab */}
      {tab === 'trial' && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-bg-elev/50">
          <div className="border-b border-border bg-bg-overlay px-4 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Trial Balance — as at 30 April 2026
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-overlay/50 text-[10px] uppercase tracking-wider text-fg-subtle">
                  <th className="px-4 py-2 text-start font-mono">Account</th>
                  <th className="px-4 py-2 text-end font-mono">Debit (₹)</th>
                  <th className="px-4 py-2 text-end font-mono">Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.filter((a) => balances[a.code]).map((acc) => {
                  const b = balances[acc.code]!
                  const net = b.debit - b.credit
                  return (
                    <tr key={acc.code} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-xs">{acc.name}</td>
                      <td className="px-4 py-2 text-end font-mono text-xs tabular-nums">
                        {net > 0 ? net.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-end font-mono text-xs tabular-nums">
                        {net < 0 ? Math.abs(net).toLocaleString() : '—'}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-border bg-bg-overlay font-semibold">
                  <td className="px-4 py-2 text-xs">Total</td>
                  <td className="px-4 py-2 text-end font-mono text-xs tabular-nums">
                    {Object.values(balances)
                      .reduce((a, b) => a + Math.max(b.debit - b.credit, 0), 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-end font-mono text-xs tabular-nums">
                    {Object.values(balances)
                      .reduce((a, b) => a + Math.max(b.credit - b.debit, 0), 0)
                      .toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Score card */}
      {showResults && (
        <BlurFade delay={0.1}>
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-bg-elev p-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              Simulation Complete
            </p>
            <p className="mt-3 font-mono text-4xl font-medium tabular-nums">
              {score.correct}/{score.total}
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              {score.correct === score.total
                ? 'Perfect! Every voucher posted correctly.'
                : `${score.correct} vouchers correct. Click on red entries to see the expected answer.`}
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              onClick={() => {
                setVouchers([])
                setShowResults(false)
                setSelectedBankId(BANK_STATEMENT[0]?.id ?? null)
                resetForm()
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </Button>
            {score.correct === score.total && (
              <BorderBeam size={80} duration={6} colorFrom="#22c55e" colorTo="#16a34a" />
            )}
          </div>
        </BlurFade>
      )}
    </div>
  )
}

function groupAccountsBySubGroup(): Record<string, Account[]> {
  const groups: Record<string, Account[]> = {}
  for (const acc of ACCOUNTS) {
    if (!groups[acc.subGroup]) groups[acc.subGroup] = []
    groups[acc.subGroup]!.push(acc)
  }
  return groups
}
