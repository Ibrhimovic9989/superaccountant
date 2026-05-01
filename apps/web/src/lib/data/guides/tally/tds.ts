import type { Guide } from '../types'

export const TALLY_TDS: Guide = {
  slug: 'tally-prime-tds',
  title: 'TDS in Tally — set up, deduct, file',
  subtitle: 'Section 194C, 194J, 194I deductions auto-calculated and tracked',
  hook: 'TDS is mandatory above thresholds and the penalties for missing it are stiff. Tally automates the deduction at the moment you book the expense — no spreadsheets needed.',
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 25,
  emoji: '🧮',
  color: 'warning',
  prerequisites: [
    "Your firm's TAN (Tax Deduction Account Number)",
    'Sample invoices that need TDS deduction (rent, professional fees, contractor)',
  ],
  outcomes: [
    'TDS enabled in Tally with your TAN configured',
    'TDS-applicable expense ledgers (rent, professional, contractor) set up',
    'Deductee party ledgers configured with PAN + TDS rate',
    'Expense voucher booked with TDS auto-deducted',
    'Form 26Q quarterly statement generated for filing',
  ],
  startStepId: 'enable-tds',
  steps: [
    {
      id: 'enable-tds',
      label: 'Enable TDS',
      title: 'Turn TDS on',
      body: 'F11 (Features) → **Statutory & Taxation** → **Enable TDS: Yes** → **Set/Alter TDS details: Yes**.\n\nFill:\n- **TAN:** your 10-character TAN (format: 4 letters + 5 digits + 1 letter)\n- **Deductor type:** Company / Other / Government\n- **Applicable from:** **1-Apr-2026**\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'warning',
        text: 'Wrong TAN = TDS challans rejected at the bank. Verify against the TAN allotment letter or at incometax.gov.in.',
      },
      check: {
        question: 'TDS enabled with TAN saved?',
        options: [
          { label: 'Yes', next: 'expense-ledger' },
          { label: 'TAN format error', next: 'fix-tan' },
        ],
      },
    },
    {
      id: 'fix-tan',
      title: 'TAN format issue',
      body: 'TAN format: **4 letters + 5 digits + 1 letter** (e.g. *PUNE12345A*). All caps, no spaces.\n\nVerify yours at **incometax.gov.in** → Quick Links → Know Your TAN.',
      check: {
        question: 'TAN saved now?',
        options: [
          { label: 'Yes', next: 'expense-ledger' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'expense-ledger',
      label: 'Expense ledger',
      title: 'Create a TDS-applicable expense ledger',
      body: 'Example: Rent expense (Section 194I).\n\nGateway → **Create** → **Ledger**.\n\n- **Name:** *Rent Paid*\n- **Under:** Indirect Expenses\n- **Is TDS Applicable:** Yes\n- **Default nature of payment:** Rent on Land/Building (194I)\n- **Tally auto-fills:**\n  - Section 194I\n  - Threshold: ₹2,40,000 p.a.\n  - Rate: 10% (building) / 2% (machinery)\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'Tally has every TDS section pre-configured. Pick the right "nature of payment" and rates auto-fill from the Income Tax Act schedule.',
      },
      check: {
        question: 'Expense ledger created?',
        options: [
          { label: 'Yes', next: 'pick-section' },
          { label: 'TDS options not showing', next: 'fix-tds-options' },
        ],
      },
    },
    {
      id: 'fix-tds-options',
      title: 'TDS options not showing',
      body: 'Confirm TDS is enabled in F11 (previous step). Also check the ledger group — TDS is only applicable to Direct Expenses, Indirect Expenses, and a few asset/liability groups.',
      check: {
        question: 'Showing now?',
        options: [
          { label: 'Yes', next: 'pick-section' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'pick-section',
      label: 'Common sections',
      title: 'Common TDS sections',
      body: "Quick reference for the sections you'll use most:\n\n| Section | What | Rate | Threshold |\n|---|---|---|---|\n| **192** | Salary | Slab rate | n/a |\n| **194A** | Interest | 10% | ₹40k p.a. (₹50k senior) |\n| **194C** | Contractor | 1% (ind) / 2% (firm) | ₹30k single / ₹1L aggregate |\n| **194H** | Commission | 2% | ₹20k p.a. |\n| **194I** | Rent | 10% (bldg) / 2% (mach) | ₹2.4L p.a. |\n| **194J** | Professional | 10% / 2% (technical) | ₹30k p.a. |\n| **194Q** | Goods purchase | 0.1% | > ₹50L from single seller |\n\nCreate similar expense ledgers for any sections you need.",
      next: 'deductee-ledger',
    },
    {
      id: 'deductee-ledger',
      label: 'Deductee',
      title: 'Set up the deductee party ledger',
      body: "Example: a landlord you're paying rent to.\n\nGateway → **Create** → **Ledger**.\n\n- **Name:** *Mehta Properties*\n- **Under:** Sundry Creditors\n- **Bill-by-bill:** Yes\n- **Is TDS Deductable:** Yes\n- **Deductee type:** Individual / HUF / Company / Firm — picks the right rate\n- **PAN:** mandatory; format `[5 letters][4 digits][1 letter]`\n\n**Ctrl + A** to save.",
      callout: {
        kind: 'warning',
        text: 'No PAN = TDS at 20% under §206AA, regardless of section. Always collect the PAN before booking the expense.',
      },
      check: {
        question: 'Deductee ledger saved?',
        options: [
          { label: 'Yes', next: 'book-voucher' },
          { label: 'PAN format error', next: 'fix-pan' },
          { label: 'No PAN available', next: 'no-pan' },
        ],
      },
    },
    {
      id: 'fix-pan',
      title: 'PAN format issue',
      body: 'PAN = **5 letters + 4 digits + 1 letter** (e.g. *AABCM1234E*). 4th letter codes entity type: P (individual), C (company), F (firm), H (HUF), T (trust).',
      check: {
        question: 'PAN saved?',
        options: [
          { label: 'Yes', next: 'book-voucher' },
          { label: 'Still erroring', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'no-pan',
      title: 'Deductee has no PAN',
      body: "Set deductee type, leave PAN blank — Tally will apply **§206AA: 20% TDS** automatically.\n\nMessage the deductee that they're losing 10-15% extra cash flow until they share their PAN. Most people fix this fast.",
      next: 'book-voucher',
    },
    {
      id: 'book-voucher',
      label: 'Book voucher',
      title: 'Book the expense voucher',
      body: 'Gateway → **Vouchers** → **F7 (Journal)**.\n\nDr **Rent Paid** ₹50,000\nDr **TDS Receivable** (auto)\nCr **Mehta Properties** ₹50,000 — TDS\nCr **TDS Payable — 194I** (auto)\n\nTally auto-applies the TDS rate, computes the net payable, and creates the TDS liability ledger.\n\n**Ctrl + A** to save.',
      video: {
        youtubeId: 'DRXvsuxN6T4',
        caption: 'Complete TDS in Tally Prime — configuration + entries',
      },
      callout: {
        kind: 'tip',
        text: 'Some firms use F5 (Payment) directly, with TDS deducted at the moment of payment. Both work — pick the one your firm uses consistently.',
      },
      check: {
        question: 'TDS auto-deducted on the voucher?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'TDS not calculating', next: 'fix-no-tds' },
        ],
      },
    },
    {
      id: 'fix-no-tds',
      title: "TDS isn't calculating",
      body: "1. **Expense ledger** has TDS Applicable: Yes + nature of payment set?\n2. **Deductee ledger** has TDS Deductable: Yes + deductee type set?\n3. **Threshold check** — is the cumulative spend on this party for the year above the section's threshold?\n\nFix all three then redo. Below-threshold deductions are intentional behaviour.",
      check: {
        question: 'TDS deducting now?',
        options: [
          { label: 'Yes', next: 'verify' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify',
      label: 'Verify',
      title: 'Verify the deduction',
      body: '1. **TDS Outstandings report** — Display → Statutory Reports → TDS Reports → TDS Outstandings — your deduction shows as a payable\n2. **Deductee ledger** — outstanding shows the net (rent minus TDS)\n3. **TDS Payable** ledger has the deducted amount\n\nIf all three line up, the deduction is fully booked.',
      next: 'monthly-payment',
    },
    {
      id: 'monthly-payment',
      label: 'Monthly payment',
      title: 'Pay TDS to government (by 7th of next month)',
      body: 'TDS deducted in a month must be paid by the **7th of the following month** (April deductions due May 7, etc.).\n\nWorkflow:\n\n1. Display → Statutory Reports → TDS Reports → **Form 26Q Challan**\n2. Tally generates Challan ITNS-281 with the right amount per section\n3. Pay via **TIN-NSDL e-payment portal** or your bank\n4. Get the **CIN** (Challan Identification Number)\n5. Back in Tally, book a **Payment voucher**: Cr Bank, Dr TDS Payable — note the CIN in the narration',
      callout: {
        kind: 'warning',
        text: 'Late payment of TDS attracts interest @ 1.5% per month under §201(1A). The interest compounds monthly — pay on time.',
      },
      check: {
        question: 'TDS paid + booked?',
        options: [
          { label: 'Yes', next: 'form-26q' },
          { label: "It's not yet the 7th", next: 'form-26q' },
          { label: 'Skip — practice mode', next: 'form-26q' },
        ],
      },
    },
    {
      id: 'form-26q',
      label: 'Form 26Q',
      title: 'File quarterly Form 26Q',
      body: 'Form 26Q is the **quarterly TDS return** for non-salary deductions. Due dates:\n\n- **Q1 (Apr-Jun)** — 31 Jul\n- **Q2 (Jul-Sep)** — 31 Oct\n- **Q3 (Oct-Dec)** — 31 Jan\n- **Q4 (Jan-Mar)** — 31 May\n\nGenerate from Tally:\n\n1. Display → Statutory Reports → TDS Reports → **Form 26Q**\n2. Set quarter (F2)\n3. Review section-wise summary\n4. **Alt + E (Export)** → **e-TDS file**\n5. Validate the file via **NSDL FVU** (free download from tin-nsdl.com)\n6. Upload validated file at **incometaxindia.gov.in**',
      callout: {
        kind: 'warning',
        text: "Late 26Q filing = ₹200/day under §234E (capped at TDS amount). File on time even if you can't pay — the filing is a separate compliance.",
      },
      check: {
        question: 'Form 26Q generated?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'FVU validation failed', next: 'fix-fvu' },
        ],
      },
    },
    {
      id: 'fix-fvu',
      title: 'FVU validation failed',
      body: 'Common errors:\n\n- **PAN missing on deductee** — go back and add it, regenerate\n- **Section wrong for deductee** — check expense ledger nature of payment\n- **Challan mismatch** — CIN entered into Tally must match what NSDL has\n\nThe FVU error report tells you exactly which row is the problem — read it carefully.',
      check: {
        question: 'Validation passing?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Bring this to your instructor',
      body: 'TDS errors often need someone to look at the actual ledger configuration. Take screenshots of the expense ledger + deductee ledger + the failing voucher.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'TDS sorted',
      body: 'You now know TDS end-to-end: deduction at source → monthly challan → quarterly 26Q. Set calendar reminders for the **7th** (challan) and **31 Jul / 31 Oct / 31 Jan / 31 May** (26Q) — never miss a deadline.\n\n**Next:** the **Reports & Backup** guide to close out your Tally fluency.',
      terminal: true,
    },
  ],
}
