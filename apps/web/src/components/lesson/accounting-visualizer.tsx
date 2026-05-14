'use client'

import { Button } from '@/components/ui/button'
import { PUBLIC_CONFIG } from '@/lib/config/public'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import * as React from 'react'

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
  descriptionAr: string
  debitAccount: string
  creditAccount: string
  amount: number
  explanation: string
  explanationAr: string
  /** Simple voice narration — plain words, no jargon. */
  voiceEn: string
  voiceAr: string
}

type Props = {
  locale: 'en' | 'ar'
  /** Pre-built scenarios per lesson topic. Falls back to a default set. */
  transactions?: Transaction[]
  title?: string
}

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    description: 'Sold goods to Patel Enterprises on credit',
    descriptionAr: 'بيع بضائع لشركة باتل بالأجل',
    debitAccount: 'Patel Enterprises (Debtor)',
    creditAccount: 'Sales A/c',
    amount: 85000,
    explanation: 'Debtor increases (asset ↑), Sales increases (income ↑)',
    explanationAr: 'المدين يزيد (أصل ↑)، المبيعات تزيد (إيراد ↑)',
    voiceEn:
      'We sold goods worth 85 thousand rupees to Patel Enterprises, but they have not paid yet. So Patel now owes us money — that is a debtor, an asset for us. And we earned sales revenue. So we debit the debtor account and credit the sales account.',
    voiceAr:
      'بعنا بضائع بقيمة ٨٥ ألف روبية لشركة باتل، لكنهم لم يدفعوا بعد. فشركة باتل الآن مدينة لنا — وهذا أصل بالنسبة لنا. وحققنا إيراد مبيعات. لذلك نجعل حساب المدين مدينًا ونجعل حساب المبيعات دائنًا.',
  },
  {
    id: 't2',
    description: 'Patel Enterprises paid via NEFT',
    descriptionAr: 'شركة باتل دفعت عبر التحويل البنكي',
    debitAccount: 'Bank A/c',
    creditAccount: 'Patel Enterprises (Debtor)',
    amount: 85000,
    explanation: 'Bank increases (asset ↑), Debtor decreases (asset ↓) — receivable settled',
    explanationAr: 'البنك يزيد (أصل ↑)، المدين ينقص (أصل ↓) — تمت التسوية',
    voiceEn:
      'Patel Enterprises has now paid us 85 thousand rupees into our bank account. Our bank balance goes up — that is an asset increasing, so we debit the bank. And Patel no longer owes us, so the debtor balance goes down — we credit the debtor account. The receivable is now settled.',
    voiceAr:
      'شركة باتل دفعت لنا ٨٥ ألف روبية في حسابنا البنكي. رصيد البنك يرتفع — وهذا أصل يزيد، فنجعل البنك مدينًا. وباتل لم يعد مدينًا لنا، فنجعل حساب المدين دائنًا. تمت التسوية.',
  },
  {
    id: 't3',
    description: 'Purchased goods from Gupta Suppliers on credit',
    descriptionAr: 'شراء بضائع من مورد جوبتا بالأجل',
    debitAccount: 'Purchase A/c',
    creditAccount: 'Gupta Suppliers (Creditor)',
    amount: 42000,
    explanation: 'Purchases increase (expense ↑), Creditor increases (liability ↑)',
    explanationAr: 'المشتريات تزيد (مصروف ↑)، الدائن يزيد (التزام ↑)',
    voiceEn:
      'We bought goods worth 42 thousand rupees from Gupta Suppliers, but we have not paid them yet. So our purchases go up — that is an expense. And we now owe Gupta money — that is a creditor, a liability. Debit purchases, credit the creditor.',
    voiceAr:
      'اشترينا بضائع بقيمة ٤٢ ألف روبية من مورد جوبتا، لكن لم ندفع بعد. فالمشتريات تزيد — وهي مصروف. ونحن الآن مدينون لجوبتا — وهذا التزام. نجعل المشتريات مدينة والدائن دائنًا.',
  },
  {
    id: 't4',
    description: 'Paid Gupta Suppliers via RTGS',
    descriptionAr: 'دفعنا لمورد جوبتا عبر التحويل البنكي',
    debitAccount: 'Gupta Suppliers (Creditor)',
    creditAccount: 'Bank A/c',
    amount: 42000,
    explanation: 'Creditor decreases (liability ↓), Bank decreases (asset ↓)',
    explanationAr: 'الدائن ينقص (التزام ↓)، البنك ينقص (أصل ↓)',
    voiceEn:
      'We are now paying Gupta Suppliers the 42 thousand we owed them. Our liability to Gupta goes down — we debit the creditor account. And money leaves our bank — bank balance decreases, so we credit the bank account.',
    voiceAr:
      'ندفع الآن لمورد جوبتا ٤٢ ألف روبية التي كنا ندينها. التزامنا لجوبتا ينخفض — فنجعل الدائن مدينًا. والمال يخرج من البنك — فنجعل البنك دائنًا.',
  },
  {
    id: 't5',
    description: 'Paid office rent for the month',
    descriptionAr: 'دفع إيجار المكتب للشهر',
    debitAccount: 'Rent A/c',
    creditAccount: 'Bank A/c',
    amount: 55000,
    explanation: 'Rent expense increases (expense ↑), Bank decreases (asset ↓)',
    explanationAr: 'مصروف الإيجار يزيد (مصروف ↑)، البنك ينقص (أصل ↓)',
    voiceEn:
      'We paid 55 thousand rupees for office rent. Rent is an expense — it goes up, so we debit the rent account. The money came out of our bank, so bank goes down — we credit the bank.',
    voiceAr:
      'دفعنا ٥٥ ألف روبية إيجار المكتب. الإيجار مصروف — يزيد فنجعله مدينًا. والمال خرج من البنك فنجعل البنك دائنًا.',
  },
  {
    id: 't6',
    description: 'Received loan from HDFC Bank',
    descriptionAr: 'استلام قرض من بنك HDFC',
    debitAccount: 'Bank A/c',
    creditAccount: 'Loan from HDFC',
    amount: 500000,
    explanation: 'Bank increases (asset ↑), Loan increases (liability ↑)',
    explanationAr: 'البنك يزيد (أصل ↑)، القرض يزيد (التزام ↑)',
    voiceEn:
      'HDFC Bank gave us a loan of 5 lakh rupees. The money came into our bank account — bank goes up, so we debit it. But we now owe HDFC this money — the loan is a liability that increases. So we credit the loan account.',
    voiceAr:
      'أعطانا بنك HDFC قرضًا بقيمة ٥ لاخ روبية. المال دخل حسابنا البنكي — فنجعل البنك مدينًا. لكننا الآن مدينون بهذا المبلغ — القرض التزام يزيد. فنجعل حساب القرض دائنًا.',
  },
  {
    id: 't7',
    description: 'Paid salaries to employees',
    descriptionAr: 'دفع رواتب الموظفين',
    debitAccount: 'Salary A/c',
    creditAccount: 'Bank A/c',
    amount: 215000,
    explanation: 'Salary expense increases (expense ↑), Bank decreases (asset ↓)',
    explanationAr: 'مصروف الرواتب يزيد (مصروف ↑)، البنك ينقص (أصل ↓)',
    voiceEn:
      'We paid 2 lakh 15 thousand rupees in salaries to our employees. Salary is an expense — it increases, so we debit the salary account. The money left our bank, so we credit the bank account.',
    voiceAr:
      'دفعنا ٢ لاخ و١٥ ألف روبية رواتب للموظفين. الراتب مصروف — يزيد فنجعله مدينًا. والمال خرج من البنك فنجعل البنك دائنًا.',
  },
]

export function AccountingVisualizer({
  locale,
  transactions = DEFAULT_TRANSACTIONS,
  title,
}: Props) {
  const [currentStep, setCurrentStep] = React.useState(-1) // -1 = nothing posted yet
  const [playing, setPlaying] = React.useState(false)
  const [animatingEntry, setAnimatingEntry] = React.useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = React.useState(true)
  const [speaking, setSpeaking] = React.useState(false)

  // ── Speech synthesis ──────────────────────────────────────
  // Voices load asynchronously — we cache them and refresh on voiceschanged.
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const findVoice = React.useCallback(
    (lang: string): SpeechSynthesisVoice | undefined => {
      // Exact match first (e.g. ar-SA), then prefix match (ar-*), then any
      const exact = voices.find((v) => v.lang === lang)
      if (exact) return exact
      const prefix = lang.split('-')[0] ?? lang
      const partial = voices.find((v) => v.lang.startsWith(prefix))
      if (partial) return partial
      // For Arabic, also try ar_SA (underscore variant some browsers use)
      if (prefix === 'ar') {
        return voices.find((v) => v.lang.includes('ar'))
      }
      return undefined
    },
    [voices],
  )

  // Audio element for Azure TTS playback
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  const speak = React.useCallback(
    async (text: string) => {
      if (!voiceEnabled || typeof window === 'undefined') return

      // Stop any previous audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel()

      setSpeaking(true)

      // Try Azure TTS via the API (works reliably for both EN and AR)
      try {
        const url = `${PUBLIC_CONFIG.apiUrl}/curriculum/speak?text=${encodeURIComponent(text)}&locale=${locale}`
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          setSpeaking(false)
          audioRef.current = null
        }
        audio.onerror = () => {
          // Fallback to browser TTS if Azure fails
          setSpeaking(false)
          audioRef.current = null
          speakBrowser(text)
        }
        await audio.play()
      } catch {
        // Fallback to browser TTS
        speakBrowser(text)
      }
    },
    [locale, voiceEnabled],
  )

  // Browser TTS fallback (works well for English, spotty for Arabic)
  const speakBrowser = React.useCallback(
    (text: string) => {
      if (!window.speechSynthesis) {
        setSpeaking(false)
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      const targetLang = locale === 'ar' ? 'ar-SA' : 'en-US'
      utterance.lang = targetLang
      const voice = findVoice(targetLang)
      if (voice) utterance.voice = voice
      utterance.rate = locale === 'ar' ? 0.85 : 0.92
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [locale, findVoice],
  )

  // Stop all audio on unmount or when voice is disabled
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  React.useEffect(() => {
    if (!voiceEnabled) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [voiceEnabled])

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
    // Speak the voice explanation
    const txn = transactions[nextStep]
    if (txn) speak(locale === 'ar' ? txn.voiceAr : txn.voiceEn)
  }

  function stopAllAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  function stepBack() {
    if (isFirst) return
    setCurrentStep(currentStep - 1)
    setAnimatingEntry(null)
    stopAllAudio()
    const txn = transactions[currentStep - 1]
    if (txn) speak(locale === 'ar' ? txn.voiceAr : txn.voiceEn)
  }

  function reset() {
    setCurrentStep(-1)
    setPlaying(false)
    setAnimatingEntry(null)
    stopAllAudio()
  }

  // Auto-play — waits for speech to finish if voice is on, otherwise 2.5s
  React.useEffect(() => {
    if (!playing || isLast) {
      if (isLast) setPlaying(false)
      return
    }
    if (voiceEnabled && speaking) {
      // Poll until audio finishes (works for both Azure Audio + browser TTS)
      const check = setInterval(() => {
        const azurePlaying = audioRef.current && !audioRef.current.paused && !audioRef.current.ended
        const browserPlaying = window.speechSynthesis?.speaking
        if (!azurePlaying && !browserPlaying) {
          clearInterval(check)
          setTimeout(stepForward, 600)
        }
      }, 250)
      return () => clearInterval(check)
    }
    const id = setTimeout(stepForward, 2500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, currentStep, speaking, voiceEnabled])

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVoiceEnabled((v) => !v)}
            title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
              voiceEnabled
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border text-fg-muted hover:text-fg',
              speaking && voiceEnabled && 'animate-pulse',
            )}
          >
            {voiceEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>
          <span className="font-mono text-[10px] tabular-nums text-fg-muted">
            {currentStep + 1}/{transactions.length}
          </span>
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
              <p className="text-sm font-medium text-fg">
                {locale === 'ar' ? currentTxn.descriptionAr : currentTxn.description}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                  Dr. {currentTxn.debitAccount}
                </span>
                <span className="font-mono text-xs text-fg-subtle">→</span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                  Cr. {currentTxn.creditAccount}
                </span>
                <span className="ms-auto font-mono text-sm font-bold tabular-nums text-fg">
                  {locale === 'ar' ? '' : '\u20B9'}
                  {currentTxn.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="mt-2 text-xs italic text-fg-muted">
                {locale === 'ar' ? currentTxn.explanationAr : currentTxn.explanation}
              </p>
              {speaking && voiceEnabled && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-accent">
                  <Volume2 className="h-3 w-3 animate-pulse" />
                  {locale === 'ar' ? 'يتحدث...' : 'Speaking...'}
                </div>
              )}
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
              else {
                if (isLast) {
                  reset()
                  setTimeout(() => setPlaying(true), 100)
                } else setPlaying(true)
              }
            }}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? (locale === 'ar' ? 'إيقاف' : 'Pause') : locale === 'ar' ? 'تشغيل' : 'Play'}
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
              onClick={() => {
                setCurrentStep(i)
                setPlaying(false)
              }}
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
