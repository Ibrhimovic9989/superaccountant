import type { Guide } from '../types'

export const ZOHO_GST_RETURNS: Guide = {
  slug: 'zoho-books-gst-returns',
  title: 'File GST returns from Zoho Books',
  subtitle: 'GSTR-1, GSTR-3B, GSTR-2B reconciliation — direct portal integration',
  hook: 'Zoho can push GSTR-1 directly to the GST portal via API — no JSON download, no manual upload. This guide walks you through the cleanest path from data → filed return.',
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 25,
  emoji: '📤',
  color: 'warning',
  prerequisites: [
    'Sales + bills booked for the month',
    'GSTIN configured + verified in Zoho',
    'GST portal credentials handy',
  ],
  outcomes: [
    'GSTR-1 generated, validated, filed (via API or JSON)',
    'GSTR-2B fetched and reconciled against bills',
    'GSTR-3B prepared with auto-pulled figures',
    'Common mismatches resolved at source, not in spreadsheets',
  ],
  startStepId: 'connect-portal',
  steps: [
    {
      id: 'connect-portal',
      label: 'Connect',
      title: 'Connect to GST portal (one-time)',
      body: '**Settings** → **Taxes** → **GST Portal** → **Connect**.\n\n- Enter your **GST portal username**\n- Zoho sends an **OTP to your registered mobile** via the GST portal\n- Enter OTP → Zoho validates → connection live\n\nFrom now on Zoho can:\n- Push GSTR-1 directly\n- Pull GSTR-2A/2B automatically\n- Pre-fill GSTR-3B figures',
      callout: {
        kind: 'tip',
        text: 'If your firm has multiple GSTINs (multi-state), connect each one separately. Zoho lets you switch between them in the GST module.',
      },
      check: {
        question: 'Connected?',
        options: [
          { label: 'Yes', next: 'pick-return' },
          { label: 'OTP fails', next: 'fix-otp' },
        ],
      },
    },
    {
      id: 'fix-otp',
      title: 'OTP not arriving / failing',
      body: '1. **Mobile registered with GST portal** — verify at gst.gov.in → My Profile → mobile must be your current number\n2. **Network issue** — try again in 5 mins\n3. **Multiple OTPs requested** — wait for the latest one\n\nFallback: skip API connection, use **JSON upload** flow (covered later in this guide).',
      check: {
        question: 'Connected now?',
        options: [
          { label: 'Yes', next: 'pick-return' },
          { label: 'Skip — use JSON upload', next: 'pick-return' },
        ],
      },
    },
    {
      id: 'pick-return',
      label: 'Pick return',
      title: 'Which return are you filing?',
      body: 'Pick the one due:',
      check: {
        question: 'Choose:',
        options: [
          { label: 'GSTR-1 (outward sales) — due 11th', next: 'gstr1-prep' },
          { label: 'GSTR-3B (summary) — due 20th', next: 'gstr3b-prep' },
          { label: 'GSTR-2B reconciliation', next: 'gstr2b-fetch' },
        ],
      },
    },
    {
      id: 'gstr1-prep',
      label: 'GSTR-1 prep',
      title: 'Prepare GSTR-1 in Zoho',
      body: '**Reports** → **GST Filing** → **GSTR-1**.\n\nSet **return period** (the month). Zoho shows sections:\n\n- **B2B** — sales to registered customers\n- **B2C (Large)** — inter-state to unregistered > ₹2.5L\n- **B2C (Small)** — everything else to unregistered\n- **CDNR** — credit/debit notes to registered\n- **CDNUR** — to unregistered\n- **Exports** + **Nil-rated** + **HSN summary**\n\nReview each. **Mismatched** rows show in red — fix before filing.',
      callout: {
        kind: 'warning',
        text: "Click any mismatch — Zoho drills to the offending invoice. Don't paste different data into the portal manually; always fix in Zoho and refresh.",
      },
      check: {
        question: 'GSTR-1 looks clean?',
        options: [
          { label: 'Yes', next: 'gstr1-file' },
          { label: 'Has mismatches', next: 'fix-gstr1-mismatch' },
        ],
      },
    },
    {
      id: 'fix-gstr1-mismatch',
      title: 'Fix GSTR-1 mismatches',
      body: '1. **Missing customer GSTIN** — Contacts → customer → Edit → fill GSTIN\n2. **Wrong state** — customer state ≠ GSTIN state code\n3. **No HSN on item** — Items → item → Edit → add HSN\n4. **Place of Supply wrong** — open the offending invoice → tax section → fix POS\n\nFix → Reports refreshes immediately.',
      check: {
        question: 'Mismatches resolved?',
        options: [
          { label: 'Yes', next: 'gstr1-file' },
          { label: 'Stuck', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr1-file',
      label: 'File GSTR-1',
      title: 'File GSTR-1',
      body: '**Two paths:**\n\n**Direct (if portal connected):** click **Push to GSTN** at the top → confirm → Zoho uploads → status updates to "Pushed". Then go to gst.gov.in to **Submit + File** with DSC/EVC.\n\n**JSON upload (fallback):** click **Download JSON** → log into gst.gov.in → Returns → GSTR-1 → **Prepare Offline** → upload the JSON → Submit + File.',
      callout: {
        kind: 'warning',
        text: "GSTR-1 cannot be revised once filed. Errors only fixable via amendments in next month's return.",
      },
      check: {
        question: 'GSTR-1 filed?',
        options: [
          { label: 'Yes — got ARN', next: 'done' },
          { label: 'Portal rejected the JSON', next: 'fix-portal' },
        ],
      },
    },
    {
      id: 'fix-portal',
      title: 'Portal rejected upload',
      body: 'Portal error message tells you exactly what\'s wrong:\n\n- **"Invalid GSTIN"** — fix the customer in Zoho → re-export\n- **"Duplicate invoice number"** — find duplicates in the month → fix → re-export\n- **"POS mismatch"** — POS state ≠ recipient GSTIN state → fix → re-export\n\nNever paste different data into the portal. Always fix in Zoho.',
      check: {
        question: 'Filed now?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'Still rejected', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr2b-fetch',
      label: 'Fetch 2B',
      title: 'Fetch GSTR-2B',
      body: '**Reports → GST Filing → GSTR-2B**.\n\nIf portal is connected: click **Fetch from GSTN** — Zoho pulls 2B JSON automatically.\n\nIf not connected: download JSON manually from gst.gov.in → upload to Zoho via **Import GSTR-2B**.',
      next: 'gstr2b-reconcile',
    },
    {
      id: 'gstr2b-reconcile',
      label: 'Reconcile 2B',
      title: 'Reconcile against your bills',
      body: "Zoho compares 2B against your booked Bills. You'll see four buckets:\n\n- **Matched** — Zoho ↔ 2B agree → claim ITC\n- **Mismatched** — amounts/numbers differ → investigate\n- **Available only in 2B** — supplier filed but you didn't book → ask supplier or book it\n- **Available only in Zoho** — you booked but supplier hasn't filed → don't claim ITC yet\n\nOnly **Matched** is safe to claim in GSTR-3B.",
      callout: {
        kind: 'warning',
        text: "Claiming ITC that isn't in 2B = §16(2)(aa) violation = interest 24% p.a. + penalty. Match strictly.",
      },
      check: {
        question: 'Reconciled?',
        options: [
          { label: 'Yes', next: 'gstr3b-prep' },
          { label: 'Many mismatches', next: 'fix-2b' },
        ],
      },
    },
    {
      id: 'fix-2b',
      title: '2B mismatches — investigate',
      body: "**Available only in 2B:** supplier filed, you didn't book\n→ if you didn't make the purchase: contact supplier (they filed wrong invoice)\n→ if you did: book the bill in Zoho\n\n**Available only in Zoho:** you booked, supplier hasn't filed\n→ wait one cycle. Don't claim ITC.\n\n**Mismatched:** invoice number or amount differs\n→ compare side-by-side in Zoho's reconciliation screen → fix whichever side is wrong.",
      check: {
        question: 'Mismatches resolved?',
        options: [
          { label: 'Yes', next: 'gstr3b-prep' },
          { label: 'More help needed', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr3b-prep',
      label: 'GSTR-3B prep',
      title: 'Prepare GSTR-3B',
      body: '**Reports → GST Filing → GSTR-3B**.\n\nZoho auto-pulls:\n- **3.1 Outward supplies** from your filed/draft GSTR-1\n- **4 Eligible ITC** from matched portion of 2B\n- **3.1(d) RCM** from RCM-tagged bills\n- **5 Exempt + Nil + Non-GST**\n- **6 Net liability** (auto-calculated)\n\nReview every row. Adjust if needed.',
      check: {
        question: 'Numbers look right?',
        options: [
          { label: 'Yes', next: 'gstr3b-file' },
          { label: 'Some figures off', next: 'fix-3b' },
        ],
      },
    },
    {
      id: 'fix-3b',
      title: 'GSTR-3B figures off',
      body: "1. **GSTR-1 should be filed first** — 3.1 outward should match GSTR-1\n2. **2B reconciliation done?** — Section 4 ITC should match the matched portion of 2B, not your full Zoho purchases\n3. **RCM split correctly?** — RCM liability and matching ITC must both show\n\nFix the source data in Zoho — don't manually override the 3B figures (they'll regenerate next refresh).",
      check: {
        question: 'Right now?',
        options: [
          { label: 'Yes', next: 'gstr3b-file' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'gstr3b-file',
      label: 'File 3B',
      title: 'File GSTR-3B',
      body: "1. **gst.gov.in** → Returns Dashboard → pick month → GSTR-3B → manually enter figures from Zoho's preview (3B doesn't support JSON upload — confirm current rules)\n2. **Save → Preview Draft**\n3. **Pay tax** if liability > ITC — via cash ledger or net banking from the portal\n4. **File with DSC/EVC**\n\nZoho stores the ARN — return is closed.",
      callout: {
        kind: 'warning',
        text: 'Filing GSTR-3B closes ITC for the month. After filing, ITC corrections only via DRC-03.',
      },
      check: {
        question: '3B filed?',
        options: [
          { label: 'Yes — got ARN', next: 'done' },
          { label: 'Payment failed', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Bring it to your instructor',
      body: "GST filing has many edge cases. Don't proceed if anything looks off — your instructor or AI tutor can spot the cause faster than trial-and-error on the portal.",
      terminal: true,
    },
    {
      id: 'done',
      title: 'Filed!',
      body: "You've now filed GST returns straight from Zoho — faster, cleaner, fewer errors than spreadsheets. Make this your monthly routine:\n\n- **By 11th:** GSTR-1\n- **By 13th:** Reconcile GSTR-2B\n- **By 20th:** GSTR-3B\n\nFiling on time month after month is what makes you reliable as an accountant. Set calendar reminders and never miss a deadline.",
      terminal: true,
    },
  ],
}
