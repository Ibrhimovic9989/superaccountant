import type { Guide } from '../types'

export const ZOHO_BANKING: Guide = {
  slug: 'zoho-books-banking',
  title: 'Connect bank + reconcile in Zoho Books',
  subtitle: 'Auto-feed your bank statement, match in clicks, never reconcile by hand again',
  hook: "Zoho's killer feature vs Tally — direct bank feed. Connect your bank once and every transaction lands in Zoho automatically. Reconciliation becomes a 5-minute job, not a 5-hour one.",
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 20,
  emoji: '🏦',
  color: 'success',
  prerequisites: [
    'Zoho Books org set up',
    'Active business bank account with internet banking enabled',
  ],
  outcomes: [
    'Bank account connected via auto-feed (or manual statement import as fallback)',
    'Auto-fetched transactions categorized correctly',
    'Customer payments / supplier payments matched to invoices and bills',
    'Bank reconciliation completed for the period',
  ],
  startStepId: 'pick-method',
  steps: [
    {
      id: 'pick-method',
      label: 'Pick method',
      title: 'How to import bank data?',
      body: "**Auto-feed** — Zoho connects to your bank, fetches transactions automatically. Best, but only works for supported banks.\n\n**Statement upload** — download statement from bank's portal (CSV or .ofx), upload to Zoho. Works for all banks.\n\n**Manual entry** — type each transaction. Use only if everything else fails.",
      check: {
        question: 'Pick:',
        options: [
          { label: 'Auto-feed (best)', next: 'auto-feed' },
          { label: 'Statement upload', next: 'upload-statement' },
          { label: "Don't know if my bank supports auto-feed", next: 'check-support' },
        ],
      },
    },
    {
      id: 'check-support',
      title: 'Supported banks',
      body: 'Zoho supports auto-feed via **Yodlee aggregator**. Most major Indian banks are supported:\n\n- HDFC, ICICI, Axis, Kotak, SBI, IDFC, Yes Bank, IndusInd, RBL, Standard Chartered, Citi\n- Most NBFCs and co-op banks: hit-or-miss\n\nPath to check: Banking → **Add Bank Account** → search for your bank. If it shows up with the Yodlee logo, supported.',
      check: {
        question: 'Your bank supported?',
        options: [
          { label: 'Yes', next: 'auto-feed' },
          { label: 'No', next: 'upload-statement' },
        ],
      },
    },
    {
      id: 'auto-feed',
      label: 'Auto-feed',
      title: 'Set up auto-feed',
      body: "**Banking** → **Add Bank Account** → search your bank → **Connect**.\n\nZoho redirects to your bank's login page (via Yodlee). Enter your **internet banking credentials**.\n\n- Two-factor auth (OTP) usually triggered\n- Pick which accounts to sync\n- Authorize\n\nFirst sync: 5-10 minutes. After that, **daily auto-sync** runs in the background.",
      callout: {
        kind: 'warning',
        text: 'Yodlee uses your read-only credentials — never used to make payments. But still: use a **dedicated banking user with read-only privileges** if your bank supports it.',
      },
      check: {
        question: 'Bank connected + transactions fetched?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'Login failed', next: 'fix-login' },
          { label: 'Connected but no transactions', next: 'fix-no-tx' },
        ],
      },
    },
    {
      id: 'fix-login',
      title: 'Bank login failed',
      body: "1. **Wrong credentials** — try logging into your bank directly first to confirm\n2. **2FA / OTP not arriving** — make sure your registered mobile is reachable\n3. **Bank requires biometric login on app** — Yodlee doesn't support biometric. Switch to password login in your bank app first\n4. **Account locked** — too many failed attempts. Reset via your bank",
      check: {
        question: 'Connected now?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'No — fall back to upload', next: 'upload-statement' },
        ],
      },
    },
    {
      id: 'fix-no-tx',
      title: 'Connected but no transactions',
      body: '1. **Date range** — Yodlee fetches last 90 days by default. Older transactions need a manual statement upload\n2. **Account inactive** — confirm the account has had transactions recently\n3. **Bank backend issue** — check **Banking → Sync logs**. Errors there usually self-resolve in 24h',
      check: {
        question: 'Transactions appearing?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'Still empty', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'upload-statement',
      label: 'Upload',
      title: 'Upload bank statement (manual)',
      body: "1. Login to your bank's portal → download last month's statement as **CSV** or **.ofx**\n2. In Zoho: **Banking** → pick your bank account → **Import Statement**\n3. Upload the file → Zoho parses transactions\n4. Map columns (Zoho usually auto-detects): Date / Description / Debit / Credit\n\nWorks for every Indian bank. Just less automatic than auto-feed.",
      callout: {
        kind: 'tip',
        text: 'Many banks now offer .ofx (Open Financial Exchange) format — cleaner parsing than CSV. Look for it in the download options.',
      },
      check: {
        question: 'Statement uploaded?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'Parser failed', next: 'fix-upload' },
        ],
      },
    },
    {
      id: 'fix-upload',
      title: 'Statement parse failed',
      body: "1. **Wrong format** — must be CSV or .ofx. PDF doesn't work — Zoho can't parse PDF\n2. **Custom CSV** — try the **Map Columns** step manually\n3. **Date format** — Indian banks export DD/MM/YYYY but some are MM/DD/YYYY. Match what your bank used.",
      check: {
        question: 'Parsed now?',
        options: [
          { label: 'Yes', next: 'categorize' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'categorize',
      label: 'Categorize',
      title: 'Categorize transactions',
      body: "Banking → your bank → list of **uncategorized** transactions.\n\nFor each one, pick an action:\n\n- **Match** — Zoho proposes an existing invoice/bill that matches the amount. One click to match.\n- **Create payment** — record as customer receipt or supplier payment\n- **Create expense** — for cash expenses you didn't record\n- **Categorize** — assign an account if not a transaction (e.g. transfer between accounts → contra)\n\nZoho **learns** from your past choices and pre-suggests on similar transactions.",
      callout: {
        kind: 'tip',
        text: 'Set up **bank rules**: e.g. any transaction with description "Zomato" auto-categorizes to *Food & Beverages*. Saves clicks once you have ~50 categorized.',
      },
      check: {
        question: 'All transactions categorized?',
        options: [
          { label: 'Yes', next: 'reconcile' },
          { label: "Don't know what to do with one", next: 'fix-unknown-tx' },
        ],
      },
    },
    {
      id: 'fix-unknown-tx',
      title: 'Unknown transaction',
      body: "Detective work:\n\n1. **Check description carefully** — Indian bank descriptions are cryptic. Match UTR / IMPS / RTGS prefix to your customer/supplier list.\n2. **Bank statement comparison** — open your bank's actual statement, find the same transaction, copy more context.\n3. **Ask the team** — was this an expense someone else booked?\n4. **Suspense** — book to *Suspense* if truly unknown. Investigate at month-end.",
      next: 'reconcile',
    },
    {
      id: 'reconcile',
      label: 'Reconcile',
      title: 'Reconcile the period',
      body: "Banking → your bank → **Reconcile**.\n\nZoho shows your **end-of-period bank balance** (from the auto-feed) vs your **end-of-period book balance**.\n\n- If they **match**: reconcile in one click. You're done.\n- If they **don't match**: Zoho lists every uncategorized transaction. Process them.",
      callout: {
        kind: 'success',
        text: 'When they match, click **Mark as reconciled** and the period is closed. No bank-vs-Tally manual diff needed.',
      },
      check: {
        question: 'Reconciled?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: "Doesn't match — debugging", next: 'fix-mismatch' },
        ],
      },
    },
    {
      id: 'fix-mismatch',
      title: 'Bank vs book mismatch',
      body: "1. **Outstanding cheques** — issued but not yet cleared. Mark them as outstanding in Zoho — they'll auto-clear when the bank sees them.\n2. **Unrecorded bank charges** — book a transaction for it (Banking auto-feed catches them, but if you uploaded manually, they're easy to miss).\n3. **Duplicate transactions** — Zoho occasionally double-imports if you re-upload the same statement. Delete duplicates.\n4. **Wrong period** — confirm the period start/end dates.",
      check: {
        question: 'Reconciled now?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Still off', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Banking issues often need a fresh pair of eyes. Have your bank statement + Zoho's reconciliation screen side-by-side at your next class.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Banking on autopilot',
      body: "Auto-feed + bank rules = month-end reconciliation in 10 minutes. This is Zoho's biggest productivity win over Tally.\n\n**Next:** **Recurring Invoices** for predictable revenue or **GST Returns** for monthly compliance.",
      terminal: true,
    },
  ],
}
