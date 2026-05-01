import type { Guide } from '../types'

export const TALLY_PAYROLL: Guide = {
  slug: 'tally-prime-payroll',
  title: 'Payroll in Tally — salaries, PF, ESI, PT',
  subtitle: 'Process salaries with statutory deductions, generate payslips, file PF/ESI returns',
  hook: "Most Indian firms still pay salaries via a separate Excel sheet and forget to journal it into the books. Tally's payroll runs everything in one place — slabs, deductions, statutory filings, and the journal entry posts itself.",
  market: 'both',
  family: 'tally-prime',
  estimatedMinutes: 30,
  emoji: '👥',
  color: 'warning',
  prerequisites: ['Tally company set up', "Your firm's PF / ESI / PT registration numbers"],
  outcomes: [
    'Payroll enabled with statutory rates configured',
    'Employee masters created with PF/ESI/PAN/Aadhaar',
    'Salary structure (Basic / HRA / Allowances) defined',
    'Monthly payroll voucher posted with payslips generated',
    'PF + ESI + PT challans ready for filing',
  ],
  startStepId: 'enable',
  steps: [
    {
      id: 'enable',
      label: 'Enable',
      title: 'Turn on payroll',
      body: 'F11 → **Payroll Features**.\n\n- **Maintain payroll:** Yes\n- **Maintain more than one payroll / cost category:** Yes if multi-branch\n- **Statutory & Taxation:**\n  - **Provident Fund (PF):** Yes — enter establishment code, PF group code\n  - **Employee State Insurance (ESI):** Yes — enter ESI No\n  - **Professional Tax (PT):** Yes — state-specific\n  - **Income Tax (TDS on salary §192):** Yes\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'warning',
        text: 'Wrong PF / ESI codes = challans rejected at the bank. Verify each code at the **EPFO** / **ESIC** portal before entering.',
      },
      check: {
        question: 'Payroll enabled?',
        options: [
          { label: 'Yes', next: 'employee' },
          { label: "Don't have PF/ESI yet", next: 'no-pf' },
        ],
      },
    },
    {
      id: 'no-pf',
      title: 'Firm not registered for PF / ESI',
      body: 'PF is mandatory at **20+ employees**, ESI at **10+ employees** (state-specific thresholds). Below these, you can skip them in F11 and still run payroll for basic salary + PT + TDS.\n\nIf you cross the threshold mid-year, register at **unifiedportal-emp.epfindia.gov.in** (PF) and **esic.in** (ESI) — usually 7 working days for approval.',
      next: 'employee',
    },
    {
      id: 'employee',
      label: 'Employee master',
      title: 'Create an employee',
      body: 'Gateway → **Create** → **Employee**.\n\n- **Name** + **Date of joining**\n- **Designation, department, location** (set up first as Employee Categories / Groups if you want to slice payroll by them)\n- **Bank A/c No** + **IFSC** (for direct deposit)\n- **PAN** + **Aadhaar**\n- **Statutory:**\n  - **PF Account No** (UAN)\n  - **ESI Number**\n  - **PT applicability**\n\n**Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'Use the **UAN** (Universal Account Number) — it stays with the employee across employers. Old PF numbers are deprecated.',
      },
      next: 'salary-structure',
    },
    {
      id: 'salary-structure',
      label: 'Salary heads',
      title: 'Set up pay heads',
      body: "Gateway → **Create** → **Pay Head**.\n\nMost firms need:\n\n**Earnings:**\n- *Basic Salary* — Earnings → On Attendance / On Days Present\n- *HRA* — usually 40% of Basic (50% in metros)\n- *Conveyance Allowance*\n- *Special Allowance*\n\n**Deductions:**\n- *PF Employee* — auto-calc 12% of Basic (capped at ₹15k Basic)\n- *PF Employer* — 12% of Basic (employer's share)\n- *ESI Employee* — 0.75% of gross (if gross ≤ ₹21k)\n- *ESI Employer* — 3.25%\n- *Professional Tax* — slab per state\n- *TDS on Salary* — based on §192\n\n**Ctrl + A** for each.",
      callout: {
        kind: 'warning',
        text: "Tally calculates PF on **Basic + DA**, capped at ₹15,000 Basic. If your employee's basic > ₹15k, PF is on ₹15k only — set the calculation type accordingly.",
      },
      check: {
        question: 'Pay heads created?',
        options: [
          { label: 'Yes', next: 'salary-details' },
          { label: 'Confused on calculations', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'salary-details',
      label: 'Assign',
      title: 'Assign salary structure to employee',
      body: 'Gateway → **Alter** → **Salary Details** → pick the employee.\n\nFor each pay head, enter the value:\n- Basic: ₹30,000\n- HRA: ₹12,000\n- Conveyance: ₹1,600\n- Special Allowance: ₹6,400\n- Total Gross: ₹50,000\n\nDeductions auto-calculate from rates. **Ctrl + A** to save.',
      next: 'attendance',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      title: 'Mark attendance for the month',
      body: 'Gateway → **Vouchers** → **Ctrl + F5 (Attendance)**.\n\n- **Date:** end of month\n- For each employee: **Days Worked** + **Leaves Taken**\n\nIf you use a separate HRMS, you can skip this and assume full attendance — Tally defaults to working days.',
      next: 'payroll-voucher',
    },
    {
      id: 'payroll-voucher',
      label: 'Run payroll',
      title: 'Process the monthly payroll voucher',
      body: "Gateway → **Vouchers** → **Ctrl + F4 (Payroll)** → **Auto-fill (Alt + A)**.\n\nTally auto-fills every employee with their structured salary, applies attendance, computes deductions, and shows the **net payable** for each.\n\nReview each line. **Ctrl + A** to save.\n\n**Result:** the entire month's salary journal is posted in one voucher — Dr Basic / HRA / etc., Cr Salary Payable + PF Payable + ESI Payable + TDS Payable.",
      video: {
        youtubeId: 'IWIEIjmzmUs',
        caption: 'Tally Prime payroll — pay heads, PF, ESI, salary processing',
      },
      callout: {
        kind: 'tip',
        text: "Run on the **last working day** of the month so that all attendance + leave data is finalised. Don't pre-run on the 25th and patch later.",
      },
      check: {
        question: 'Payroll voucher posted?',
        options: [
          { label: 'Yes', next: 'payslips' },
          { label: 'Auto-fill missing employees', next: 'fix-autofill' },
        ],
      },
    },
    {
      id: 'fix-autofill',
      title: 'Auto-fill missing employees',
      body: '1. **Salary structure not assigned** — Alter → Salary Details → check each employee has pay heads\n2. **Wrong period** — F2 set the right month\n3. **Employee left mid-month** — date of resignation set in employee master',
      check: {
        question: 'Fixed?',
        options: [
          { label: 'Yes', next: 'payslips' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'payslips',
      label: 'Payslips',
      title: 'Generate + email payslips',
      body: "Display → **Payroll Reports** → **Pay Slip** → set period.\n\n- **Print** to give physically\n- **Email** (Alt + M) to email all employees in one click — Tally pulls email from each employee's master\n- **Export PDF** (Alt + E) for HR records\n\nTally also generates **Pay Slip Summary** (one-page summary of all employees) and **Pay Sheet** (CTC breakdown).",
      next: 'pf-challan',
    },
    {
      id: 'pf-challan',
      label: 'PF + ESI',
      title: 'Generate PF + ESI challans',
      body: "**PF (due 15th of next month):**\nDisplay → Statutory Reports → Payroll Reports → **PF Challan** → review → Print or export ECR (Electronic Challan Return) file → upload to **unifiedportal-emp.epfindia.gov.in** → pay.\n\n**ESI (due 15th of next month):**\nDisplay → Statutory Reports → Payroll → **ESI Challan** → export → upload to **esic.in** → pay.\n\n**PT (state-specific deadlines, usually 10th-15th):**\nGenerate PT Challan from same menu, file at your state's commercial tax portal.",
      callout: {
        kind: 'warning',
        text: 'PF late = 12% interest p.a. + damages up to 25%. ESI late = 12% interest. Mark calendar reminders for the 15th — these are non-negotiable.',
      },
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: "Payroll calculations have firm-specific quirks (CTC vs gross, gratuity provisions, bonus accruals). Bring a sample payslip + your firm's salary structure to your next class.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Payroll automated',
      body: 'From here, monthly payroll is a 15-minute job:\n1. Mark attendance (or auto-import from HRMS)\n2. Run payroll voucher (Auto-fill)\n3. Email payslips\n4. Generate + file PF/ESI/PT challans\n\n**Next:** **Multi-currency** for forex transactions, or **Reports & Backup** to close the loop.',
      terminal: true,
    },
  ],
}
