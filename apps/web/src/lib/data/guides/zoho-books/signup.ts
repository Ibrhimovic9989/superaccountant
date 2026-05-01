import type { Guide } from '../types'

export const ZOHO_SIGNUP: Guide = {
  slug: 'zoho-books-signup',
  title: 'Sign up + set up your Zoho Books organization',
  subtitle: 'From zero to a working organization with GST in 15 minutes',
  hook: 'Zoho Books is the cloud-native alternative to Tally — runs in the browser, mobile-friendly, automatic backups, and India-ready. This guide gets your organization live.',
  market: 'both',
  family: 'zoho-books',
  estimatedMinutes: 15,
  emoji: '🌐',
  color: 'accent',
  prerequisites: [
    'A working email address',
    'Your firm\'s GSTIN (or you can mark "not registered" for now)',
    'Browser: Chrome, Edge, or Safari (latest)',
  ],
  outcomes: [
    'Zoho account created with email verified',
    'Organization configured with name, address, GSTIN',
    'Fiscal year, currency, and reporting basis set',
    'First user role assigned',
  ],
  startStepId: 'signup',
  steps: [
    {
      id: 'signup',
      label: 'Sign up',
      title: 'Create your Zoho account',
      body: 'Open **zoho.com/in/books** → **Sign Up** (top-right) → **Free Trial**.\n\nFill:\n- Email\n- Password (8+ chars, mixed case, number)\n- Country: **India**\n\nClick **Sign up**. Zoho sends a verification email — click the link inside.',
      check: {
        question: 'Account created and email verified?',
        options: [
          { label: 'Yes', next: 'org-name' },
          { label: 'Verification email not arriving', next: 'fix-email' },
        ],
      },
    },
    {
      id: 'fix-email',
      title: 'Verification email not arriving',
      body: '1. Check **Spam / Promotions** folder\n2. Wait 5 minutes — sometimes delayed\n3. Click **Resend verification email** on the Zoho login screen\n4. If using a corporate email, your IT may be blocking — try a personal Gmail / Yahoo for the trial',
      check: {
        question: 'Verified now?',
        options: [
          { label: 'Yes', next: 'org-name' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'org-name',
      label: 'Organization',
      title: 'Set up your organization',
      body: 'After verification, Zoho prompts you to set up your organization.\n\n- **Organization name:** *Your Practice Co Pvt Ltd*\n- **Industry:** Trading / Services / Manufacturing / Professional\n- **Country:** India\n- **State:** your state — controls GST behaviour\n- **Time zone:** Asia/Kolkata (IST)\n- **Language:** English',
      next: 'fiscal-year',
    },
    {
      id: 'fiscal-year',
      label: 'Fiscal year',
      title: 'Fiscal year + reporting basis',
      body: '- **Fiscal year:** April – March (Indian standard)\n- **Currency:** INR\n- **Reporting basis:** Accrual (record on invoice date) or Cash (record on payment date)\n- **Conversion type:** if you import data from another tool later\n\nFor most Indian SMEs: **April–March + Accrual**. Click **Save**.',
      callout: {
        kind: 'tip',
        text: 'Once you save fiscal year and accrual basis, changing them is hard — Zoho asks for a fresh start. Get it right now.',
      },
      next: 'gst-org',
    },
    {
      id: 'gst-org',
      label: 'GST',
      title: 'Add your GSTIN',
      body: '**Settings (gear icon)** → **Taxes** → **GST Settings**.\n\n- **Is your business registered for GST?** Yes (or No if not yet)\n- **GSTIN:** your 15-character GSTIN\n- **Business legal name** + **trade name** as on your registration certificate\n- **GST registered on:** date of GST registration\n- **Composition scheme:** Yes / No\n\nClick **Save**.',
      callout: {
        kind: 'warning',
        text: 'Wrong GSTIN here = every invoice you raise will show the wrong number. Customer may reject. Verify against your GST registration certificate.',
      },
      check: {
        question: 'GST configured?',
        options: [
          { label: 'Yes', next: 'address' },
          { label: 'GSTIN rejected', next: 'fix-gstin' },
        ],
      },
    },
    {
      id: 'fix-gstin',
      title: 'GSTIN rejected',
      body: 'GSTIN format = **15 chars**: `[State 2][PAN 10][Entity 1]Z[Check 1]`. No spaces, all uppercase.\n\nVerify yours at **services.gst.gov.in** → **Search Taxpayer**.',
      check: {
        question: 'Saved now?',
        options: [
          { label: 'Yes', next: 'address' },
          { label: 'Skip — not registered', next: 'address' },
        ],
      },
    },
    {
      id: 'address',
      label: 'Address',
      title: 'Add your business address',
      body: 'Settings → **Organization Profile** → **Address**.\n\nAdd your registered business address — this prints on every invoice.\n\n- Address line 1 + 2\n- City, State (must match GSTIN state code)\n- PIN code\n- Phone, email\n\nClick **Save**.',
      next: 'logo',
    },
    {
      id: 'logo',
      label: 'Logo',
      title: 'Upload your logo (optional)',
      body: 'Settings → **Organization Profile** → **Logo**.\n\nUpload a PNG / JPG, ideally 240×240 px or larger. Appears on every printed/emailed invoice — makes you look legit.',
      next: 'invite-user',
    },
    {
      id: 'invite-user',
      label: 'Invite team',
      title: 'Invite a team member (optional)',
      body: "Settings → **Users & Roles** → **Invite User**.\n\n- **Email** of the team member\n- **Role**: Admin / Staff / Timesheet Staff / Custom\n- They get an invite email and join with their own login\n\nSkip if you're a one-person setup.",
      check: {
        question: 'Done with setup?',
        options: [
          { label: 'Yes', next: 'tour' },
          { label: 'Need help', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'tour',
      label: 'Tour',
      title: 'Quick tour of the dashboard',
      body: "Click **Books** in the top bar to open your dashboard. Key sections:\n\n- **Items** — products + services (Zoho's equivalent of Tally stock items)\n- **Sales** — Estimates → Invoices → Payments → Credit Notes\n- **Purchases** — Bills (Zoho's word for purchase invoice) → Payments\n- **Banking** — connect your bank for auto-feed\n- **Accountant** — chart of accounts, journals, reports\n- **Reports** — P&L, BS, GST reports\n\nFamiliar workflows from Tally, just cloud-native.",
      next: 'done',
    },
    {
      id: 'flag-instructor',
      title: 'Ask your instructor',
      body: 'Account / GSTIN issues are often org-specific. Bring your GST certificate + login screen to your next class.',
      terminal: true,
    },
    {
      id: 'done',
      title: 'Organization live!',
      body: 'Your Zoho Books org is now ready. Pick your next guide:\n\n- **GST setup** (if you skipped it / want depth on tax slabs and HSN)\n- **First invoice** (the most common workflow)\n- **Connect bank** (turn on auto-bank-feed)\n\nThe **Tally Sales Voucher** guide concepts (cash vs credit, B2B vs B2C, IGST vs CGST/SGST) all map 1:1 here — workflows differ but accounting logic is identical.',
      terminal: true,
    },
  ],
}
