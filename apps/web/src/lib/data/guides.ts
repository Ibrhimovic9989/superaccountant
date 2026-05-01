/**
 * Interactive smart-setup guides — chat/wizard style walkthroughs that
 * branch on user answers, embed videos, and track progress.
 *
 * Unlike static documentation (e.g. tally.so/help), each step asks
 * "did this work?" and routes to either the next step or a
 * troubleshooting branch. Progress is persisted in localStorage so
 * students can resume mid-class.
 *
 * Adding a guide: append to GUIDES. Any new slug is auto-listed on
 * /[locale]/guides and auto-routed to /[locale]/guides/[slug].
 *
 * Step routing model:
 *   - Each step has a unique `id` (string).
 *   - A step's `next` is either the id of the step to jump to next,
 *     or null to end the guide.
 *   - A step with a `check` becomes a fork: each option's `next` wins.
 *   - Otherwise, "Continue" advances to step.next.
 *   - Steps with no check and no next are TERMINAL (success screens).
 */

export type GuideStep = {
  id: string
  /** Optional short label for the step list (e.g. "Install Tally"). */
  label?: string
  /** Headline shown at the top of the step. */
  title: string
  /** Markdown body. Multi-paragraph supported. */
  body: string
  /** Optional inline screenshot (public path or full URL). */
  image?: string
  /** Optional embedded video (YouTube ID). Falls back to a link. */
  video?: { youtubeId: string; caption?: string }
  /** Optional callout above the action area: 'tip' | 'warning' | 'success'. */
  callout?: { kind: 'tip' | 'warning' | 'success'; text: string }
  /**
   * Branching question. If present, replaces the default Continue button.
   * Each option routes to a different next step.
   */
  check?: {
    question: string
    options: { label: string; next: string | null }[]
  }
  /** Default next step id when there's no check. null = end of guide. */
  next?: string | null
  /** Mark this step as a terminal success screen. */
  terminal?: boolean
}

export type Guide = {
  slug: string
  title: string
  subtitle: string
  /** One-line pitch on the index card. */
  hook: string
  /** Filter by market — 'india' | 'ksa' | 'both'. */
  market: 'india' | 'ksa' | 'both'
  /** Total steps the *happy-path* takes (for the time estimate). */
  estimatedMinutes: number
  /** Card emoji + tint. */
  emoji: string
  color: 'accent' | 'success' | 'warning' | 'danger'
  /** Soft prerequisite list shown on the intro screen. */
  prerequisites?: string[]
  /** What the student will be able to do at the end. */
  outcomes: string[]
  /** First step id — where the player starts. */
  startStepId: string
  steps: GuideStep[]
}

// ── Guide 1: Tally Prime — Getting Started ────────────────────

const TALLY_PRIME_GETTING_STARTED: Guide = {
  slug: 'tally-prime-getting-started',
  title: 'Get started with Tally Prime',
  subtitle: 'Install, activate, and book your first voucher in under 30 minutes',
  hook: "From a fresh Windows laptop to recording your first sale — every click guided, every error answered. By the end you'll have a working company file with GST configured.",
  market: 'india',
  estimatedMinutes: 30,
  emoji: '📒',
  color: 'accent',
  prerequisites: [
    'A Windows 10 or 11 PC with at least 4 GB RAM',
    'Stable internet connection (only needed for the first activation)',
    "Your firm's GSTIN handy (optional — you can add it later)",
  ],
  outcomes: [
    'Tally Prime installed and activated on your computer',
    'A company created with GST and TDS turned on',
    'Your first ledger group set up (cash, sales, purchases)',
    'Your first sales voucher recorded and visible in the books',
  ],
  startStepId: 'welcome',
  steps: [
    {
      id: 'welcome',
      label: 'Welcome',
      title: 'Before we start',
      body: "We'll walk you through Tally Prime end-to-end. Each step asks if it worked — answer honestly and we'll route you to a fix if something breaks.\n\nThis takes about **30 minutes** if everything goes smoothly. If you get stuck, we have a fix screen for almost every common issue.",
      callout: {
        kind: 'tip',
        text: "If you're in a classroom session, your instructor can help with anything this guide can't fix. Don't skip ahead — each step builds on the last.",
      },
      next: 'download',
    },
    {
      id: 'download',
      label: 'Download',
      title: 'Download Tally Prime',
      body: "Open your browser and go to **tallysolutions.com/download**. Click **Download Tally Prime** — it's a free download. The installer is around 250 MB so it should finish in a minute or two on a normal connection.",
      video: {
        youtubeId: '7g7-zN1Z0Wc',
        caption: 'Tally Prime — official installation walkthrough',
      },
      check: {
        question: 'Did the installer download successfully?',
        options: [
          { label: 'Yes, I have the .exe file', next: 'install' },
          { label: 'Download link not working', next: 'fix-download' },
          { label: 'Browser blocked the download', next: 'fix-blocked' },
        ],
      },
    },
    {
      id: 'fix-download',
      title: "Download link isn't working",
      body: "The official download is sometimes mirrored. Try these in order:\n\n1. **Direct link:** tallysolutions.com/download/setup.exe\n2. **Alternate URL:** tallysolutions.com/products/tally-prime/download\n3. **From Tally's CRM:** if your firm bought Tally, you can sign in to **my.tallysolutions.com** and download from there\n\nIf none of these work, you may have a network firewall blocking it — try on mobile hotspot.",
      callout: {
        kind: 'warning',
        text: 'Only download Tally from tallysolutions.com. There are fake downloads with malware on third-party sites.',
      },
      check: {
        question: 'Got the installer now?',
        options: [
          { label: 'Yes', next: 'install' },
          { label: 'Still stuck — flag for instructor', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-blocked',
      title: 'Browser blocked the download',
      body: 'This happens because Windows SmartScreen flags new installers. To allow the download:\n\n**In Chrome / Edge:**\n1. Click the small download icon at the bottom of the browser\n2. Click the three-dot menu → **Keep**\n3. Confirm **Keep anyway**\n\nThis is safe — Tally is a trusted Indian software company.',
      check: {
        question: 'Download finished?',
        options: [
          { label: 'Yes', next: 'install' },
          { label: 'Different error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'install',
      label: 'Install',
      title: 'Run the installer',
      body: "Double-click the **setup.exe** you just downloaded. You'll see a Windows security prompt — click **Yes**.\n\nIn the installer:\n1. Accept the licence agreement\n2. Leave the install path as the default (**C:\\Program Files\\TallyPrime**) unless you have a strong reason\n3. Click **Install**\n4. Wait 1–2 minutes\n5. Click **Finish** when done\n\nTally Prime should now appear on your desktop.",
      check: {
        question: 'Did Tally Prime install and open?',
        options: [
          { label: 'Yes, I see the Tally Prime startup screen', next: 'activate' },
          { label: 'Got an error during install', next: 'fix-install-error' },
          { label: "Installed, but doesn't open", next: 'fix-wont-open' },
        ],
      },
    },
    {
      id: 'fix-install-error',
      title: 'Install error',
      body: 'Common causes:\n\n- **Antivirus blocking it** — temporarily disable Windows Defender / your antivirus, install, then re-enable.\n- **Not enough disk space** — Tally needs 1 GB free. Empty the Recycle Bin and try again.\n- **Old Tally version still installed** — uninstall the old one first via **Settings → Apps → Tally**.\n- **Permission denied** — right-click the installer → **Run as administrator**.',
      check: {
        question: 'Fixed it?',
        options: [
          { label: 'Yes, installed now', next: 'activate' },
          { label: 'Still failing', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-wont-open',
      title: "Tally won't open",
      body: 'Try these in order:\n\n1. **Restart your PC** — fixes 80% of "won\'t open" issues\n2. **Run as administrator** — right-click the desktop icon → **Run as administrator**\n3. **Re-install** — uninstall, restart, install again\n4. **Check Windows version** — Tally Prime needs Windows 10 or 11 (32-bit or 64-bit)',
      check: {
        question: 'Opens now?',
        options: [
          { label: 'Yes', next: 'activate' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'activate',
      label: 'Activate',
      title: 'Activate your licence',
      body: "On the Tally Prime startup screen you have three choices:\n\n- **Educational mode** — free, but voucher dates are restricted. Perfect for this course.\n- **Activate New Licence** — if your firm has a serial number, choose this.\n- **Reactivate** — if you've moved Tally between PCs.\n\nFor this course, choose **Educational mode**. Click it, then click **Continue**.",
      callout: {
        kind: 'tip',
        text: "Educational mode is the right choice for learning. You'll never need to enter a credit card or licence key. When you start your job, your employer's IT will activate the proper licence.",
      },
      check: {
        question: "You're now in Tally Prime's main screen?",
        options: [
          { label: 'Yes — I see the Gateway of Tally', next: 'create-company' },
          { label: 'Activation screen looks different', next: 'fix-activation' },
        ],
      },
    },
    {
      id: 'fix-activation',
      title: 'Activation looks different',
      body: "The activation flow changed slightly between Tally Prime releases. The screens you might see:\n\n**On Tally Prime 4.x:** the 3-button choice (Educational / Activate / Reactivate) on the startup screen.\n\n**On Tally Prime 5.x and later:** a single **Continue with Educational** option, plus a smaller **I have a licence** link below.\n\nEither way: pick the **Educational** option. You'll land on the Gateway of Tally.",
      check: {
        question: 'Made it to the Gateway of Tally?',
        options: [
          { label: 'Yes', next: 'create-company' },
          { label: 'No, asks for serial number', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-company',
      label: 'Create company',
      title: 'Create your first company',
      body: "From the Gateway of Tally, press **Alt + K** (Company menu) → **Create**.\n\nFill in:\n- **Name:** *Your Practice Co Pvt Ltd* (any name — this is just for practice)\n- **State:** your state — this controls GST behaviour\n- **Country:** India\n- **Financial year:** **1-Apr-2025** (current FY)\n- **Books beginning from:** same as financial year\n- **GSTIN:** leave blank for now — we'll add it later\n\nLeave everything else as default. Press **Enter** repeatedly to accept defaults, then **Y** to confirm.",
      check: {
        question: 'Company created?',
        options: [
          { label: 'Yes — it shows the company name at the top', next: 'enable-gst' },
          { label: 'Got an error', next: 'fix-create-company' },
        ],
      },
    },
    {
      id: 'fix-create-company',
      title: "Couldn't create the company",
      body: '**"Invalid date format"** — Tally uses **DD-MMM-YYYY** (e.g. *1-Apr-2025*). Don\'t use slashes.\n\n**"Path not found"** — Tally is trying to write to a folder it can\'t access. Create the company in **C:\\Users\\Public\\Tally Data** instead.\n\n**"Duplicate company name"** — that name is already taken. Add a number suffix.',
      check: {
        question: 'Created it now?',
        options: [
          { label: 'Yes', next: 'enable-gst' },
          { label: 'Still stuck', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'enable-gst',
      label: 'Enable GST',
      title: 'Turn on GST',
      body: 'From the Gateway of Tally, press **F11** (Features) → **Statutory & Taxation**.\n\nSet:\n- **Enable Goods and Services Tax (GST):** Yes\n- **Set/Alter GST details:** Yes\n\nA new screen opens. Fill:\n- **State:** auto-filled\n- **Registration type:** Regular (or Composition if your firm chose that)\n- **GSTIN/UIN:** for now, leave blank or enter a dummy 15-character GSTIN like `27AAAAA0000A1Z5`\n- **Applicable from:** **1-Apr-2025**\n\nPress **Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: "If you mess up the GSTIN format, Tally won't accept it. The format is: 2-digit state code + 10-digit PAN + 1-digit entity code + Z + 1 check digit.",
      },
      check: {
        question: 'GST enabled?',
        options: [
          { label: 'Yes — F11 now shows GST as Yes', next: 'first-ledger' },
          { label: 'GSTIN format error', next: 'fix-gstin' },
        ],
      },
    },
    {
      id: 'fix-gstin',
      title: 'GSTIN format issue',
      body: "GSTINs are exactly **15 characters** in this format:\n\n`[State Code (2)][PAN (10)][Entity Code (1)]Z[Checksum (1)]`\n\nFor practice, use this dummy: `27AAAAA0000A1Z5` (Maharashtra). Other state codes:\n- Delhi: 07\n- Karnataka: 29\n- Tamil Nadu: 33\n- Gujarat: 24\n\nDon't use spaces or hyphens.",
      check: {
        question: 'GST is on now?',
        options: [
          { label: 'Yes', next: 'first-ledger' },
          { label: 'Still erroring', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'first-ledger',
      label: 'First ledger',
      title: 'Create your first ledger',
      body: 'Ledgers are accounts where you record transactions. Tally creates **Cash** and **Profit & Loss** automatically. Let\'s add a **Sales** ledger.\n\nGateway of Tally → **Create** → **Ledger**.\n\nFill:\n- **Name:** *Sales — Goods*\n- **Under:** Sales Accounts (start typing "Sales" — it auto-suggests)\n- **GST Applicable:** Yes\n- **GST rate:** 18% (or whatever applies to your goods)\n\nPress **Ctrl + A** to save.',
      check: {
        question: 'Ledger saved?',
        options: [
          { label: 'Yes — it appears in the ledger list', next: 'first-voucher' },
          { label: "Can't find the right group", next: 'fix-ledger-group' },
        ],
      },
    },
    {
      id: 'fix-ledger-group',
      title: 'Picking the right ledger group',
      body: "Tally has 28 pre-defined ledger groups. The most common ones for a small business:\n\n- **Sales Accounts** — your sales / revenue\n- **Purchase Accounts** — what you buy for resale\n- **Direct Expenses** — costs directly tied to sales (raw materials, freight in)\n- **Indirect Expenses** — overheads (rent, salaries, office)\n- **Sundry Debtors** — customers who owe you money\n- **Sundry Creditors** — suppliers you owe money to\n- **Cash-in-Hand** — cash and petty cash\n- **Bank Accounts** — current/savings accounts\n\nStart typing the group name and Tally auto-completes. If you can't find one, your ledger probably belongs to a different group.",
      check: {
        question: 'Created the ledger?',
        options: [
          { label: 'Yes', next: 'first-voucher' },
          { label: 'Still confused', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'first-voucher',
      label: 'First voucher',
      title: 'Record your first sales voucher',
      body: "Time for the real thing — let's record a sale of ₹10,000.\n\nGateway of Tally → **Vouchers** → press **F8** (Sales).\n\nFill:\n- **Date:** today\n- **Party A/c name:** *Cash* (we're recording a cash sale)\n- **Sales ledger:** *Sales — Goods*\n- **Item / amount:** type *Goods*, then press **Enter**\n- **Amount:** **10000**\n- Tally auto-calculates **CGST 9%** and **SGST 9%** if your party state matches your firm state (intra-state).\n\nTotal should be **₹11,800** (10,000 + 900 + 900).\n\nPress **Ctrl + A** to save.",
      callout: {
        kind: 'tip',
        text: "If your party is in a different state, Tally calculates IGST 18% instead of CGST + SGST. That's correct GST behaviour — inter-state sales attract IGST.",
      },
      check: {
        question: 'Voucher saved successfully?',
        options: [
          { label: 'Yes — it shows in the voucher list', next: 'verify-pl' },
          { label: 'GST not calculating', next: 'fix-gst-calc' },
          { label: 'Other error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-gst-calc',
      title: "GST isn't calculating",
      body: 'Three things to check:\n\n1. **Sales ledger has GST rate set?** — Go back to the Sales ledger and set GST rate to 18% under "GST Details".\n2. **Item / stock item has GST applicable?** — If you used a stock item, check it has GST configured.\n3. **Place of supply set?** — In the voucher, press **F12** to open configuration, ensure "Use common ledger account for item allocation" is set correctly.\n\nThe quickest fix: re-do the voucher after setting the Sales ledger\'s GST rate to 18%.',
      check: {
        question: 'GST showing now?',
        options: [
          { label: 'Yes', next: 'verify-pl' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'verify-pl',
      label: 'Verify',
      title: 'Check your Profit & Loss',
      body: "Last step — let's see your sale show up in the books.\n\nGateway of Tally → **Display More Reports** → **Profit & Loss A/c** (or just press **D** then **P** on the keyboard).\n\nYou should see:\n- **Sales — Goods: ₹10,000** on the right side\n- **Net Profit: ₹10,000** at the bottom\n\nThat's your first complete accounting entry — captured, classified, and reported. Welcome to Tally.",
      callout: {
        kind: 'success',
        text: "If you see ₹10,000 in Sales, you've just done end-to-end Tally — install, configure, ledger, voucher, report. This is exactly what an accountant does every day.",
      },
      check: {
        question: 'Can you see the ₹10,000 in your P&L?',
        options: [
          { label: 'Yes!', next: 'done' },
          { label: 'Not showing', next: 'fix-pl' },
        ],
      },
    },
    {
      id: 'fix-pl',
      title: 'P&L not showing the entry',
      body: "Two common reasons:\n\n1. **Wrong date in the voucher** — your voucher might be dated outside your viewing period. Press **F2** in the P&L screen and set period to **1-Apr-2025 to 31-Mar-2026**.\n2. **Voucher saved as a different type** — go to *Display* → *Day Book* and check if your voucher is there. If it's a Receipt instead of Sales, you'll need to re-do it.",
      check: {
        question: 'Showing now?',
        options: [
          { label: 'Yes', next: 'done' },
          { label: 'No', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'flag-instructor',
      title: 'Time to ask your instructor',
      body: "Some issues are environment-specific (your antivirus, your network, your Windows version) and faster to fix in person than over a guide.\n\n**In your next classroom session:** show your instructor exactly which step you got stuck on. They'll fix it in 2 minutes.\n\n**Between sessions:** ask your AI tutor on the SuperAccountant app — paste the exact error message you saw and it can usually pinpoint the cause.\n\nDon't worry — every accountant has hit Tally errors. It's part of the job.",
      terminal: true,
    },
    {
      id: 'done',
      title: "You've done it!",
      body: "You just installed, configured, and used Tally Prime end-to-end:\n\n- ✅ Tally Prime installed on your laptop\n- ✅ Company created with GST enabled\n- ✅ Sales ledger set up with the right GST rate\n- ✅ First sales voucher recorded\n- ✅ P&L verified — your sale is in the books\n\n**What's next?** Try the *Purchase voucher* guide (coming soon), or jump into the *GST Returns* guide to learn how to file GSTR-1 from your Tally data.",
      callout: {
        kind: 'success',
        text: 'Practice makes muscle memory. Try recording 5 more sales vouchers — different amounts, different party states — to lock the workflow into your head.',
      },
      terminal: true,
    },
  ],
}

// ── Future guides will go here. Each one auto-lists on /guides. ──

export const GUIDES: Guide[] = [TALLY_PRIME_GETTING_STARTED]

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidesForMarket(market: 'india' | 'ksa'): Guide[] {
  return GUIDES.filter((g) => g.market === market || g.market === 'both')
}

export function getStep(guide: Guide, stepId: string): GuideStep | undefined {
  return guide.steps.find((s) => s.id === stepId)
}

/** Count happy-path steps (those with `label`) for the progress indicator. */
export function happyPathSteps(guide: Guide): GuideStep[] {
  return guide.steps.filter((s) => s.label)
}
