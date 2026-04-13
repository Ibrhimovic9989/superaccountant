'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Accounting Visualizer — interactive double-entry animation.
 *
 * Shows how each transaction posts to T-accounts with animated money flow.
 * Step through transactions, watch debits and credits animate into ledger
 * accounts, and see the trial balance update live.
 *
 * Uses the app design system (not Tally theme) — designed to embed
 * inline in lesson pages alongside the read/practice sections.
 */

type Transaction = {
  id: string
  description: string
  debitAccount: string
  creditAccount: string
  amount: number
  explanation: string
}

type Props = {
  locale: 'en' | 'ar'
  /** Pre-built scenarios per lesson topic. Falls back to a default set. */
  transactions?: Transaction[]
  title?: string
}

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 't1', description: 'Sold goods to Patel Enterprises on credit', debitAccount: 'Patel Enterprises (Debtor)', creditAccount: 'Sales A/c', amount: 85000, explanation: 'Debtor increases (asset ↑), Sales increases (income ↑)' },
  { id: 't2', description: 'Patel Enterprises paid via NEFT', debitAccount: 'Bank A/c', creditAccount: 'Patel Enterprises (Debtor)', amount: 85000, explanation: 'Bank increases (asset ↑), Debtor decreases (asset ↓) — the receivable is settled' },
  { id: 't3', description: 'Purchased goods from Gupta Suppliers on credit', debitAccount: 'Purchase A/c', creditAccount: 'Gupta Suppliers (Creditor)', amount: 42000, explanation: 'Purchases increase (expense ↑), Creditor increases (liability ↑)' },
  { id: 't4', description: 'Paid Gupta Suppliers via RTGS', debitAccount: 'Gupta Suppliers (Creditor)', creditAccount: 'Bank A/c', amount: 42000, explanation: 'Creditor decreases (liability ↓), Bank decreases (asset ↓)' },
  { id: 't5', description: 'Paid office rent for the month', debitAccount: 'Rent A/c', creditAccount: 'Bank A/c', amount: 55000, explanation: 'Rent expense increases (expense ↑), Bank decreases (asset ↓)' },
  { id: 't6', description: 'Received loan from HDFC Bank', debitAccount: 'Bank A/c', creditAccount: 'Loan from HDFC', amount: 500000, explanation: 'Bank increases (asset ↑), Loan increases (liability ↑)' },
  { id: 't7', description: 'Paid salaries to employees', debitAccount: 'Salary A/c', creditAccount: 'Bank A/c', amount: 215000, explanation: 'Salary expense increases (expense ↑), Bank decreases (asset ↓)' },
]

export function AccountingVisualizer({
  locale,
  transactions = DEFAULT_TRANSACTIONS,
  title,
}: Props) {
  const [currentStep, setCurrentStep] = React.useState(-1) // -1 = nothing posted yet
  const [playing, setPlaying] = React.useState(false)
  const [animatingEntry, setAnimatingEntry] = React.useState<string | null>(null)

  // Build T-account state up to currentStep
  const tAccounts = React.useMemo(() => {
    const accounts: Record<string, { debits: number[]; credits: number[] }> = {}
    for (let i = 0; i <= currentStep; i++) {
      const txn = transactions[i]
      if (!txn) continue
      if (!accounts[txn.debitAccount]) accounts[txn.debitAccount] = { debits: [], credits: [] }
      if (!accounts[txn.creditAccount]) accounts[txn.creditAccount] = { debits: [], credits: [] }
      accounts[txn.debitAccount]!.debits.push(txn.amount)
      accounts[txn.creditAccount]!.credits.push(txn.amount)
    }
    return accounts
  }, [currentStep, transactions])

  // Trial balance
  const trialBalance = React.useMemo(() => {
    let totalDebit = 0
    let totalCredit = 0
    for (const acc of Object.values(tAccounts)) {
      const dr = acc.debits.reduce((a, b) => a + b, 0)
      const cr = acc.credits.reduce((a, b) => a + b, 0)
      if (dr > cr) totalDebit += dr - cr
      else totalCredit += cr - dr
    }
    return { totalDebit, totalCredit, balanced: totalDebit === totalCredit }
  }, [tAccounts])

  const currentTxn = currentStep >= 0 ? transactions[currentStep] : null
  const isFirst = currentStep <= -1
  const isLast = currentStep >= transactions.length - 1

  function stepForward() {
    if (isLast) return
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    setAnimatingEntry(transactions[nextStep]?.id ?? null)
    setTimeout(() => setAnimatingEntry(null), 800)
  }

  function stepBack() {
    if (isFirst) return
    setCurrentStep(currentStep - 1)
    setAnimatingEntry(null)
  }

  function reset() {
    setCurrentStep(-1)
    setPlaying(false)
    setAnimatingEntry(null)
  }

  // Auto-play
  React.useEffect(() => {
    if (!playing || isLast) {
      if (isLast) setPlaying(false)
      return
    }
    const id = setTimeout(stepForward, 1800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, currentStep])

  // Sorted account names for consistent display
  const accountNames = React.useMemo(
    () => [...new Set(transactions.flatMap((t) => [t.debitAccount, t.creditAccount]))],
    [transactions],
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elev">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-bg-overlay px-5 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            {locale === 'ar' ? 'عرض مرئي تفاعلي' : 'Interactive Visualizer'}
          </p>
          <p className="text-sm font-semibold">
            {title ?? (locale === 'ar' ? 'تدفق القيد المزدوج' : 'Double-Entry Flow')}
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums text-fg-muted">
          {currentStep + 1}/{transactions.length}
        </div>
      </div>

      {/* Current transaction card */}
      <div className="border-b border-border bg-bg px-5 py-4">
        <AnimatePresence mode="wait">
          {currentTxn ? (
            <motion.div
              key={currentTxn.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm font-medium text-fg">{currentTxn.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  Dr. {currentTxn.debitAccount}
                </span>
                <span className="font-mono text-xs text-fg-subtle">→</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Cr. {currentTxn.creditAccount}
                </span>
                <span className="ms-auto font-mono text-sm font-bold tabular-nums text-fg">
                  {locale === 'ar' ? '' : '\u20B9'}{currentTxn.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="mt-2 text-xs italic text-fg-muted">{currentTxn.explanation}</p>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-fg-muted"
            >
              {locale === 'ar'
                ? 'اضغط تشغيل أو الخطوة التالية لبدء ترحيل المعاملات'
                : 'Press Play or Step Forward to start posting transactions'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* T-Accounts grid */}
      <div className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accountNames
            .filter((name) => tAccounts[name])
            .map((name) => {
              const acc = tAccounts[name]!
              const totalDr = acc.debits.reduce((a, b) => a + b, 0)
              const totalCr = acc.credits.reduce((a, b) => a + b, 0)
              const isAnimating =
                animatingEntry !== null &&
                currentTxn &&
                (currentTxn.debitAccount === name || currentTxn.creditAccount === name)

              return (
                <motion.div
                  key={name}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    boxShadow: isAnimating ? '0 0 20px rgba(167,139,250,0.3)' : '0 0 0 transparent',
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden rounded-lg border border-border bg-bg"
                >
                  {/* Account name header */}
                  <div className="border-b border-border bg-bg-overlay px-3 py-1.5 text-center">
                    <p className="truncate text-[11px] font-semibold">{name}</p>
                  </div>

                  {/* T-account body: Debit | Credit */}
                  <div className="grid grid-cols-2 divide-x divide-border">
                    {/* Debit side */}
                    <div className="p-2">
                      <p className="mb-1 text-center font-mono text-[9px] uppercase text-accent">
                        Dr
                      </p>
                      <div className="min-h-[40px] space-y-0.5">
                        {acc.debits.map((amt, i) => (
                          <motion.p
                            key={`dr-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-end font-mono text-[11px] tabular-nums text-fg"
                          >
                            {amt.toLocaleString('en-IN')}
                          </motion.p>
                        ))}
                      </div>
                      {acc.debits.length > 0 && (
                        <div className="mt-1 border-t border-border pt-1 text-end font-mono text-[10px] font-bold tabular-nums text-accent">
                          {totalDr.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    {/* Credit side */}
                    <div className="p-2">
                      <p className="mb-1 text-center font-mono text-[9px] uppercase text-success">
                        Cr
                      </p>
                      <div className="min-h-[40px] space-y-0.5">
                        {acc.credits.map((amt, i) => (
                          <motion.p
                            key={`cr-${i}`}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-end font-mono text-[11px] tabular-nums text-fg"
                          >
                            {amt.toLocaleString('en-IN')}
                          </motion.p>
                        ))}
                      </div>
                      {acc.credits.length > 0 && (
                        <div className="mt-1 border-t border-border pt-1 text-end font-mono text-[10px] font-bold tabular-nums text-success">
                          {totalCr.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
        </div>

        {/* Empty state */}
        {Object.keys(tAccounts).length === 0 && (
          <div className="flex h-40 items-center justify-center text-sm text-fg-muted">
            {locale === 'ar' ? 'لم تُرحل أي معاملات بعد' : 'No transactions posted yet'}
          </div>
        )}
      </div>

      {/* Trial Balance strip */}
      {Object.keys(tAccounts).length > 0 && (
        <div className="border-t border-border bg-bg-overlay px-5 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
              {locale === 'ar' ? 'ميزان المراجعة' : 'Trial Balance'}
            </span>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span>
                <span className="text-fg-subtle">Dr </span>
                <span className="font-medium text-accent">
                  {trialBalance.totalDebit.toLocaleString('en-IN')}
                </span>
              </span>
              <span>
                <span className="text-fg-subtle">Cr </span>
                <span className="font-medium text-success">
                  {trialBalance.totalCredit.toLocaleString('en-IN')}
                </span>
              </span>
              {trialBalance.balanced ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="h-3 w-3" />
                  <span className="text-[10px]">{locale === 'ar' ? 'متوازن' : 'Balanced'}</span>
                </span>
              ) : (
                <span className="text-[10px] text-danger">
                  {locale === 'ar' ? 'غير متوازن' : 'Unbalanced'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between border-t border-border bg-bg-overlay px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isFirst}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={stepBack} disabled={isFirst}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => {
              if (playing) setPlaying(false)
              else { if (isLast) { reset(); setTimeout(() => setPlaying(true), 100) } else setPlaying(true) }
            }}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing
              ? locale === 'ar' ? 'إيقاف' : 'Pause'
              : locale === 'ar' ? 'تشغيل' : 'Play'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={stepForward} disabled={isLast}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {transactions.map((_, i) => (
            <button
              key={transactions[i]!.id}
              type="button"
              onClick={() => { setCurrentStep(i); setPlaying(false) }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i <= currentStep ? 'w-4 bg-accent' : 'w-1.5 bg-border',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
