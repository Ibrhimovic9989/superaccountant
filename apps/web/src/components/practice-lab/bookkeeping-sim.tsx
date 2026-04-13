'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TallyShell, TallyRow, TallyAccountPicker, TallyFKeyBar } from './tally-theme'
import { cn } from '@/lib/utils'

const ACCOUNTS = [
  { code: 'BANK', name: 'Bank A/c (HDFC)', subGroup: 'Current Assets' },
  { code: 'CASH', name: 'Cash A/c', subGroup: 'Current Assets' },
  { code: 'PATEL', name: 'Patel Enterprises', subGroup: 'Sundry Debtors' },
  { code: 'MEHTA', name: 'Mehta & Sons', subGroup: 'Sundry Debtors' },
  { code: 'ABC', name: 'ABC Retail', subGroup: 'Sundry Debtors' },
  { code: 'DELHI', name: 'Delhi Distributors', subGroup: 'Sundry Debtors' },
  { code: 'GUPTA', name: 'Gupta Suppliers', subGroup: 'Sundry Creditors' },
  { code: 'RAJ', name: 'Raj Transport', subGroup: 'Sundry Creditors' },
  { code: 'VERMA', name: 'Verma Chemicals', subGroup: 'Sundry Creditors' },
  { code: 'OM', name: 'Om Packaging', subGroup: 'Sundry Creditors' },
  { code: 'SHARMA', name: 'Sharma & Co (Audit)', subGroup: 'Sundry Creditors' },
  { code: 'HDFC_LOAN', name: 'Loan from HDFC Bank', subGroup: 'Loans' },
  { code: 'TDS_PAY', name: 'TDS Payable', subGroup: 'Duties & Taxes' },
  { code: 'GST_PAY', name: 'GST Payable', subGroup: 'Duties & Taxes' },
  { code: 'SALES', name: 'Sales A/c', subGroup: 'Revenue' },
  { code: 'PURCHASE', name: 'Purchase A/c', subGroup: 'Direct Expenses' },
  { code: 'FREIGHT', name: 'Freight Charges', subGroup: 'Direct Expenses' },
  { code: 'SALARY', name: 'Salary A/c', subGroup: 'Indirect Expenses' },
  { code: 'RENT', name: 'Rent A/c', subGroup: 'Indirect Expenses' },
  { code: 'INTERNET', name: 'Internet Expense', subGroup: 'Indirect Expenses' },
  { code: 'AUDIT', name: 'Audit Fees', subGroup: 'Indirect Expenses' },
  { code: 'EMI', name: 'Loan EMI (Principal)', subGroup: 'Indirect Expenses' },
  { code: 'SUSPENSE', name: 'Suspense A/c', subGroup: 'Current Assets' },
]

type BankEntry = { id: string; date: string; narration: string; debit: number | null; credit: number | null }
const BANK: BankEntry[] = [
  { id: 'b1', date: '02-Apr', narration: 'NEFT from Patel Enterprises - Inv #1042', debit: null, credit: 85000 },
  { id: 'b2', date: '03-Apr', narration: 'RTGS to Gupta Suppliers - Bill #PO-328', debit: 42000, credit: null },
  { id: 'b3', date: '05-Apr', narration: 'UPI to Jio - Monthly Internet', debit: 1180, credit: null },
  { id: 'b4', date: '07-Apr', narration: 'NEFT from Mehta & Sons - Inv #1045', debit: null, credit: 126500 },
  { id: 'b5', date: '07-Apr', narration: 'TDS 194C deposited - Q4 FY26', debit: 8400, credit: null },
  { id: 'b6', date: '10-Apr', narration: 'RTGS to Raj Transport - Freight #F-91', debit: 35000, credit: null },
  { id: 'b7', date: '12-Apr', narration: 'Salary transfer - Apr 2026', debit: 215000, credit: null },
  { id: 'b8', date: '15-Apr', narration: 'Loan disbursement - HDFC Bank CC', debit: null, credit: 500000 },
  { id: 'b9', date: '18-Apr', narration: 'NEFT from ABC Retail - Inv #1048', debit: null, credit: 34500 },
  { id: 'b10', date: '20-Apr', narration: 'RTGS to Verma Chemicals - Bill #VC-112', debit: 78200, credit: null },
  { id: 'b11', date: '22-Apr', narration: 'GST IGST payment - Mar 2026', debit: 18750, credit: null },
  { id: 'b12', date: '25-Apr', narration: 'Rent - Office Sector 44 Gurgaon', debit: 55000, credit: null },
  { id: 'b13', date: '28-Apr', narration: 'UPI from Unknown - Ref 9282817', debit: null, credit: 12000 },
  { id: 'b14', date: '29-Apr', narration: 'RTGS to Sharma & Co - Audit Fee', debit: 75000, credit: null },
  { id: 'b15', date: '30-Apr', narration: 'EMI - HDFC CC Loan', debit: 45000, credit: null },
]

type Expected = { bankId: string; type: string; debit: string; credit: string; hint: string }
const EXPECTED: Expected[] = [
  { bankId: 'b1', type: 'receipt', debit: 'BANK', credit: 'PATEL', hint: 'Receipt against Inv #1042' },
  { bankId: 'b2', type: 'payment', debit: 'GUPTA', credit: 'BANK', hint: 'Payment for PO-328' },
  { bankId: 'b3', type: 'payment', debit: 'INTERNET', credit: 'BANK', hint: 'Jio internet expense' },
  { bankId: 'b4', type: 'receipt', debit: 'BANK', credit: 'MEHTA', hint: 'Receipt against Inv #1045' },
  { bankId: 'b5', type: 'payment', debit: 'TDS_PAY', credit: 'BANK', hint: 'TDS liability paid' },
  { bankId: 'b6', type: 'payment', debit: 'FREIGHT', credit: 'BANK', hint: 'Freight - TDS u/s 194C' },
  { bankId: 'b7', type: 'payment', debit: 'SALARY', credit: 'BANK', hint: 'April salaries' },
  { bankId: 'b8', type: 'receipt', debit: 'BANK', credit: 'HDFC_LOAN', hint: 'Loan credited - liability' },
  { bankId: 'b9', type: 'receipt', debit: 'BANK', credit: 'ABC', hint: 'Receipt against Inv #1048' },
  { bankId: 'b10', type: 'payment', debit: 'VERMA', credit: 'BANK', hint: 'Payment for VC-112' },
  { bankId: 'b11', type: 'payment', debit: 'GST_PAY', credit: 'BANK', hint: 'GST liability paid' },
  { bankId: 'b12', type: 'payment', debit: 'RENT', credit: 'BANK', hint: 'Rent - TDS u/s 194I' },
  { bankId: 'b13', type: 'receipt', debit: 'BANK', credit: 'SUSPENSE', hint: 'Unknown - park in Suspense' },
  { bankId: 'b14', type: 'payment', debit: 'AUDIT', credit: 'BANK', hint: 'Audit fee - TDS u/s 194J' },
  { bankId: 'b15', type: 'payment', debit: 'EMI', credit: 'BANK', hint: 'Loan EMI repayment' },
]

type Voucher = { bankId: string; type: string; debit: string; credit: string; amount: number }
type View = 'entry' | 'daybook' | 'trial'

export function BookkeepingSim({ locale }: { locale: 'en' | 'ar' }) {
  const [vouchers, setVouchers] = React.useState<Voucher[]>([])
  const [selId, setSelId] = React.useState<string | null>(BANK[0]?.id ?? null)
  const [view, setView] = React.useState<View>('entry')
  const [vType, setVType] = React.useState('')
  const [vDebit, setVDebit] = React.useState('')
  const [vCredit, setVCredit] = React.useState('')
  const [checked, setChecked] = React.useState(false)

  const done = new Set(vouchers.map((v) => v.bankId))
  const sel = BANK.find((e) => e.id === selId)
  const amt = sel ? (sel.credit ?? sel.debit ?? 0) : 0

  function post() {
    if (!selId || !vType || !vDebit || !vCredit) return
    setVouchers((p) => [...p.filter((v) => v.bankId !== selId), { bankId: selId, type: vType, debit: vDebit, credit: vCredit, amount: amt }])
    const next = BANK.find((e) => !done.has(e.id) && e.id !== selId)
    if (next) setSelId(next.id)
    setVType(''); setVDebit(''); setVCredit('')
  }

  function selectEntry(id: string) {
    setSelId(id)
    const v = vouchers.find((v) => v.bankId === id)
    if (v) { setVType(v.type); setVDebit(v.debit); setVCredit(v.credit) }
    else { setVType(''); setVDebit(''); setVCredit('') }
  }

  const balances = React.useMemo(() => {
    const b: Record<string, number> = { BANK: 150000 }
    for (const v of vouchers) { b[v.debit] = (b[v.debit] ?? 0) + v.amount; b[v.credit] = (b[v.credit] ?? 0) - v.amount }
    return b
  }, [vouchers])

  const score = React.useMemo(() => {
    if (!checked) return 0
    return EXPECTED.filter((exp) => { const v = vouchers.find((v) => v.bankId === exp.bankId); return v && v.type === exp.type && v.debit === exp.debit && v.credit === exp.credit }).length
  }, [vouchers, checked])

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); setVType('payment') }
      if (e.key === 'F6') { e.preventDefault(); setVType('receipt') }
      if (e.key === 'F7') { e.preventDefault(); setVType('journal') }
      if (e.key === 'F8') { e.preventDefault(); setVType('contra') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div>
      <Link href={`/${locale}/practice-lab`} className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-subtle hover:text-fg">
        <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> Practice Lab
      </Link>

      <TallyShell company="Sharma Trading Co. - April 2026">
        <div className="flex border-b border-tally-border">
          {(['entry', 'daybook', 'trial'] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn('px-4 py-1.5 text-[10px] uppercase tracking-wider', view === v ? 'bg-tally-select text-white' : 'text-tally-dim hover:text-tally-fg')}>{v === 'entry' ? 'Voucher Entry' : v === 'daybook' ? 'Day Book' : 'Trial Balance'}</button>
          ))}
          <div className="ms-auto flex items-center gap-2 px-3 text-[10px] text-tally-dim">
            <span>{done.size}/{BANK.length} posted</span>
            {done.size === BANK.length && !checked && <button type="button" onClick={() => setChecked(true)} className="bg-tally-yellow px-2 py-0.5 font-bold text-tally-bg">CHECK ALL</button>}
            {checked && <span className={score === EXPECTED.length ? 'text-tally-green' : 'text-tally-red'}>{score}/{EXPECTED.length} correct</span>}
          </div>
        </div>

        {view === 'entry' && (
          <div className="flex min-h-[520px] flex-col sm:flex-row">
            <div className="flex w-full flex-col border-b border-tally-border sm:w-[45%] sm:border-b-0 sm:border-e">
              <div className="border-b border-tally-border bg-tally-header px-3 py-1"><span className="text-[10px] text-tally-dim">HDFC BANK STATEMENT</span><span className="ms-2 text-[10px] text-tally-yellow">Opening: 1,50,000</span></div>
              <div className="flex border-b border-tally-border bg-tally-header/50 px-3 py-0.5 text-[9px] uppercase text-tally-dim"><span className="w-5 shrink-0">#</span><span className="w-12 shrink-0">Date</span><span className="flex-1">Narration</span><span className="w-16 shrink-0 text-end">Dr</span><span className="w-16 shrink-0 text-end">Cr</span></div>
              <div className="max-h-[380px] overflow-y-auto sm:max-h-none sm:flex-1">
                {BANK.map((entry, i) => {
                  const isDone = done.has(entry.id); const exp = checked ? EXPECTED.find((e) => e.bankId === entry.id) : null; const v = checked ? vouchers.find((v) => v.bankId === entry.id) : null; const isOk = !!(checked && exp && v && v.type === exp.type && v.debit === exp.debit && v.credit === exp.credit)
                  return (<TallyRow key={entry.id} selected={selId === entry.id} done={isDone && !checked} correct={isOk} wrong={checked && !isOk} onClick={() => selectEntry(entry.id)}>
                    <span className="w-5 shrink-0 text-[9px] text-tally-dim">{checked ? (isOk ? '\u2713' : '\u2717') : isDone ? '\u2713' : i + 1}</span>
                    <span className="w-12 shrink-0 text-[10px]">{entry.date}</span>
                    <span className="flex-1 truncate text-[10px]">{entry.narration}</span>
                    <span className="w-16 shrink-0 text-end text-[10px] tabular-nums text-tally-red">{entry.debit ? entry.debit.toLocaleString('en-IN') : ''}</span>
                    <span className="w-16 shrink-0 text-end text-[10px] tabular-nums text-tally-green">{entry.credit ? entry.credit.toLocaleString('en-IN') : ''}</span>
                  </TallyRow>)
                })}
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              {sel ? (<>
                <div className="border-b border-tally-border bg-tally-header px-3 py-1"><span className="text-[10px] text-tally-yellow">ACCOUNTING VOUCHER</span></div>
                <div className="border-b border-tally-border/50 px-3 py-2"><p className="text-xs text-tally-fg">{sel.narration}</p><p className="mt-1 text-lg font-bold tabular-nums text-tally-yellow">Rs. {amt.toLocaleString('en-IN')}<span className="ms-2 text-[10px] font-normal text-tally-dim">{sel.credit ? '(Credit in Bank)' : '(Debit in Bank)'}</span></p></div>
                <div className="border-b border-tally-border/30 px-3 py-1.5"><span className="me-3 text-[10px] uppercase text-tally-dim">Type:</span>{(['receipt', 'payment', 'contra', 'journal'] as const).map((t, i) => (<button key={t} type="button" onClick={() => setVType(t)} className={cn('me-1 px-2 py-0.5 text-[10px] uppercase', vType === t ? 'bg-tally-select text-white' : 'text-tally-dim hover:text-tally-fg')}><span className="text-tally-yellow">F{i + 5}</span> {t}</button>))}</div>
                <TallyAccountPicker label="Dr (Debit)" value={vDebit} onChange={setVDebit} accounts={ACCOUNTS} />
                <TallyAccountPicker label="Cr (Credit)" value={vCredit} onChange={setVCredit} accounts={ACCOUNTS} />
                <div className="flex items-center gap-2 border-b border-tally-border/30 px-3 py-1.5"><span className="w-28 shrink-0 text-[10px] uppercase text-tally-dim">Amount</span><span className="text-xs tabular-nums text-tally-yellow">{amt.toLocaleString('en-IN')}</span></div>
                <div className="flex-1" />
                <div className="border-t border-tally-border px-3 py-2"><button type="button" onClick={post} disabled={!vType || !vDebit || !vCredit} className={cn('w-full py-1.5 text-xs font-bold uppercase', vType && vDebit && vCredit ? 'bg-tally-yellow text-tally-bg' : 'bg-tally-dim/20 text-tally-dim cursor-not-allowed')}>Accept (Enter)</button></div>
                {checked && (() => { const exp = EXPECTED.find((e) => e.bankId === selId); const v = vouchers.find((v) => v.bankId === selId); if (!exp) return null; const ok = v && v.type === exp.type && v.debit === exp.debit && v.credit === exp.credit; if (ok) return null; return (<div className="border-t border-tally-red/30 bg-tally-red/10 px-3 py-2 text-[10px]"><span className="text-tally-red">Expected: </span><span className="text-tally-fg">{exp.type.toUpperCase()} | Dr. {ACCOUNTS.find((a) => a.code === exp.debit)?.name} | Cr. {ACCOUNTS.find((a) => a.code === exp.credit)?.name}</span><p className="mt-1 italic text-tally-dim">{exp.hint}</p></div>) })()}
              </>) : (<div className="flex flex-1 items-center justify-center text-[10px] text-tally-dim">Select a bank entry</div>)}
            </div>
          </div>
        )}

        {view === 'daybook' && (<div className="min-h-[400px]">
          <div className="flex border-b border-tally-border bg-tally-header/50 px-3 py-0.5 text-[9px] uppercase text-tally-dim"><span className="w-14 shrink-0">Date</span><span className="w-16 shrink-0">Type</span><span className="flex-1">Debit A/c</span><span className="flex-1">Credit A/c</span><span className="w-24 shrink-0 text-end">Amount</span></div>
          {vouchers.length === 0 ? <div className="p-6 text-center text-[10px] text-tally-dim">No vouchers posted</div> : vouchers.sort((a, b) => BANK.findIndex((e) => e.id === a.bankId) - BANK.findIndex((e) => e.id === b.bankId)).map((v) => { const entry = BANK.find((e) => e.id === v.bankId); return (<div key={v.bankId} className="flex border-b border-tally-border/30 px-3 py-1 text-[10px]"><span className="w-14 shrink-0 text-tally-dim">{entry?.date}</span><span className="w-16 shrink-0 uppercase text-tally-yellow">{v.type}</span><span className="flex-1 truncate">{ACCOUNTS.find((a) => a.code === v.debit)?.name}</span><span className="flex-1 truncate">{ACCOUNTS.find((a) => a.code === v.credit)?.name}</span><span className="w-24 shrink-0 text-end tabular-nums">{v.amount.toLocaleString('en-IN')}</span></div>) })}
        </div>)}

        {view === 'trial' && (<div className="min-h-[400px]">
          <div className="flex border-b border-tally-border bg-tally-header/50 px-3 py-0.5 text-[9px] uppercase text-tally-dim"><span className="flex-1">Particulars</span><span className="w-28 shrink-0 text-end">Debit (Rs.)</span><span className="w-28 shrink-0 text-end">Credit (Rs.)</span></div>
          {ACCOUNTS.filter((a) => balances[a.code] !== undefined && balances[a.code] !== 0).map((acc) => { const val = balances[acc.code] ?? 0; return (<div key={acc.code} className="flex border-b border-tally-border/30 px-3 py-1 text-[10px]"><span className="flex-1">{acc.name}</span><span className="w-28 shrink-0 text-end tabular-nums text-tally-yellow">{val > 0 ? val.toLocaleString('en-IN') : ''}</span><span className="w-28 shrink-0 text-end tabular-nums text-tally-green">{val < 0 ? Math.abs(val).toLocaleString('en-IN') : ''}</span></div>) })}
          <div className="flex border-t-2 border-tally-yellow/40 bg-tally-header px-3 py-1 text-[10px] font-bold"><span className="flex-1">Total</span><span className="w-28 shrink-0 text-end tabular-nums text-tally-yellow">{Object.values(balances).filter((v) => v > 0).reduce((a, b) => a + b, 0).toLocaleString('en-IN')}</span><span className="w-28 shrink-0 text-end tabular-nums text-tally-green">{Object.values(balances).filter((v) => v < 0).reduce((a, b) => a + Math.abs(b), 0).toLocaleString('en-IN')}</span></div>
        </div>)}

        <TallyFKeyBar keys={[
          { key: 'F5', label: 'Payment', onClick: () => setVType('payment'), active: vType === 'payment' },
          { key: 'F6', label: 'Receipt', onClick: () => setVType('receipt'), active: vType === 'receipt' },
          { key: 'F7', label: 'Journal', onClick: () => setVType('journal'), active: vType === 'journal' },
          { key: 'F8', label: 'Contra', onClick: () => setVType('contra'), active: vType === 'contra' },
        ]} />
      </TallyShell>
    </div>
  )
}
