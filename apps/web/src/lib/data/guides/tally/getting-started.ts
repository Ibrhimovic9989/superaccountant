import type { Guide } from '../types'

export const TALLY_GETTING_STARTED: Guide = {
  slug: 'tally-prime-getting-started',
  title: 'Get started with Tally Prime',
  subtitle: 'Install, activate, and book your first voucher in under 30 minutes',
  hook: "From a fresh Windows laptop to recording your first sale — every click guided, every error answered. By the end you'll have a working company file with GST configured.",
  market: 'both',
  family: 'tally-prime',
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
      body: "Open your browser and go to **tallysolutions.com/download**. Click **Download Tally Prime** — it's a free download. The installer is around 250 MB.",
      video: {
        // Official TallyHelp channel — "How to Get Started with TallyPrime"
        youtubeId: 'st036Km_Lfk',
        caption: 'Tally Prime official installation walkthrough',
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
      body: '1. **Direct link:** tallysolutions.com/download/setup.exe\n2. **Alternate:** tallysolutions.com/products/tally-prime/download\n3. **From CRM:** my.tallysolutions.com (if your firm bought Tally)\n\nIf still stuck, your network may block it — try mobile hotspot.',
      callout: {
        kind: 'warning',
        text: 'Only download Tally from tallysolutions.com. Third-party sites carry malware.',
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
      body: 'Windows SmartScreen flags new installers. To allow:\n\n**Chrome / Edge:** click the download icon → three-dot menu → **Keep** → confirm **Keep anyway**.',
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
      body: 'Double-click **setup.exe**. Click **Yes** at the security prompt.\n\n1. Accept the licence agreement\n2. Leave the install path default (**C:\\Program Files\\TallyPrime**)\n3. Click **Install** — wait 1–2 minutes\n4. Click **Finish**\n\nTally Prime should now be on your desktop.',
      check: {
        question: 'Did Tally Prime install and open?',
        options: [
          { label: 'Yes, I see the startup screen', next: 'activate' },
          { label: 'Got an error during install', next: 'fix-install-error' },
          { label: "Installed, but doesn't open", next: 'fix-wont-open' },
        ],
      },
    },
    {
      id: 'fix-install-error',
      title: 'Install error',
      body: '- **Antivirus blocking it** — temporarily disable Defender, install, re-enable.\n- **Not enough disk space** — Tally needs 1 GB free.\n- **Old Tally still installed** — uninstall via Settings → Apps.\n- **Permission denied** — right-click installer → **Run as administrator**.',
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
      body: '1. **Restart your PC** — fixes 80% of these\n2. **Run as administrator**\n3. **Re-install** — uninstall, restart, reinstall\n4. **Windows version** — needs Windows 10 or 11',
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
      body: "Three choices on the startup screen:\n\n- **Educational mode** — free, dates restricted. Pick this for the course.\n- **Activate New Licence** — if your firm has a serial number.\n- **Reactivate** — if you've moved Tally between PCs.\n\nClick **Educational** → **Continue**.",
      callout: {
        kind: 'tip',
        text: 'Educational mode is right for learning — no card, no key. Your future employer will activate the proper licence.',
      },
      check: {
        question: "You're at the Gateway of Tally?",
        options: [
          { label: 'Yes', next: 'create-company' },
          { label: 'Activation looks different', next: 'fix-activation' },
        ],
      },
    },
    {
      id: 'fix-activation',
      title: 'Activation looks different',
      body: '**Tally Prime 4.x:** the 3-button choice on the startup screen.\n\n**Tally Prime 5.x+:** a single **Continue with Educational** option, plus a **I have a licence** link. Either way: pick Educational.',
      check: {
        question: 'Made it to Gateway of Tally?',
        options: [
          { label: 'Yes', next: 'create-company' },
          { label: 'Asks for serial number', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'create-company',
      label: 'Create company',
      title: 'Create your first company',
      body: 'Press **Alt + K** (Company) → **Create**.\n\n- **Name:** *Your Practice Co Pvt Ltd*\n- **State:** your state — controls GST behaviour\n- **Country:** India\n- **Financial year:** **1-Apr-2026**\n- **Books beginning from:** same\n- **GSTIN:** leave blank for now\n\nPress Enter through defaults, then **Y** to confirm.',
      check: {
        question: 'Company created?',
        options: [
          { label: 'Yes — name shows at the top', next: 'enable-gst' },
          { label: 'Got an error', next: 'fix-create-company' },
        ],
      },
    },
    {
      id: 'fix-create-company',
      title: "Couldn't create the company",
      body: '- **"Invalid date"** — use **DD-MMM-YYYY** (e.g. *1-Apr-2026*).\n- **"Path not found"** — try **C:\\Users\\Public\\Tally Data**.\n- **"Duplicate name"** — add a suffix.',
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
      body: 'Press **F11** (Features) → **Statutory & Taxation**.\n\n- **Enable GST:** Yes\n- **Set/Alter GST details:** Yes\n\nThen:\n- **Registration type:** Regular\n- **GSTIN/UIN:** dummy `27AAAAA0000A1Z5` for practice\n- **Applicable from:** **1-Apr-2026**\n\nPress **Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'GSTIN format: 2-digit state code + 10-digit PAN + 1-digit entity code + Z + 1 check digit (15 chars total).',
      },
      check: {
        question: 'GST enabled?',
        options: [
          { label: 'Yes — F11 shows GST as Yes', next: 'first-ledger' },
          { label: 'GSTIN format error', next: 'fix-gstin' },
        ],
      },
    },
    {
      id: 'fix-gstin',
      title: 'GSTIN format issue',
      body: 'Use this dummy: `27AAAAA0000A1Z5` (Maharashtra). State codes: Delhi 07, Karnataka 29, Tamil Nadu 33, Gujarat 24. No spaces or hyphens.',
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
      body: 'Gateway → **Create** → **Ledger**.\n\n- **Name:** *Sales — Goods*\n- **Under:** Sales Accounts\n- **GST Applicable:** Yes\n- **GST rate:** 18%\n\nPress **Ctrl + A** to save.',
      check: {
        question: 'Ledger saved?',
        options: [
          { label: 'Yes — appears in ledger list', next: 'first-voucher' },
          { label: "Can't find the right group", next: 'fix-ledger-group' },
        ],
      },
    },
    {
      id: 'fix-ledger-group',
      title: 'Picking the right ledger group',
      body: 'Most-used groups:\n- **Sales Accounts** — your sales / revenue\n- **Purchase Accounts** — what you buy for resale\n- **Direct Expenses** — costs tied to sales\n- **Indirect Expenses** — overheads (rent, salaries)\n- **Sundry Debtors** — customers who owe you\n- **Sundry Creditors** — suppliers you owe\n- **Cash-in-Hand**, **Bank Accounts**',
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
      body: 'Gateway → **Vouchers** → press **F8** (Sales).\n\n- **Date:** today\n- **Party A/c name:** *Cash*\n- **Sales ledger:** *Sales — Goods*\n- **Item:** *Goods*, **Amount:** **10000**\n- Tally auto-calculates **CGST 9% + SGST 9%** → total **₹11,800**\n\nPress **Ctrl + A** to save.',
      callout: {
        kind: 'tip',
        text: 'Inter-state sales attract IGST 18% instead. Tally picks the right one based on party state vs firm state.',
      },
      check: {
        question: 'Voucher saved successfully?',
        options: [
          { label: 'Yes — shows in voucher list', next: 'verify-pl' },
          { label: 'GST not calculating', next: 'fix-gst-calc' },
          { label: 'Other error', next: 'flag-instructor' },
        ],
      },
    },
    {
      id: 'fix-gst-calc',
      title: "GST isn't calculating",
      body: '1. **Sales ledger has GST rate?** — Set 18% under "GST Details"\n2. **Stock item has GST?** — If used\n3. **Place of supply set?** — Press F12 in voucher to configure\n\nQuickest fix: re-do the voucher after setting Sales ledger GST rate.',
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
      label: 'Verify P&L',
      title: 'Check your Profit & Loss',
      body: "Gateway → **Display More Reports** → **Profit & Loss A/c** (or press **D** then **P**).\n\nYou should see:\n- **Sales — Goods: ₹10,000** on the right\n- **Net Profit: ₹10,000** at the bottom\n\nThat's your first complete entry — captured, classified, reported.",
      callout: {
        kind: 'success',
        text: "If you see ₹10,000 in Sales, you've just done end-to-end Tally — install → configure → ledger → voucher → report.",
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
      body: '1. **Wrong date in voucher** — Press **F2** in P&L screen, set period to **1-Apr-2026 to 31-Mar-2027**\n2. **Voucher saved as wrong type** — Display → Day Book to check',
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
      body: "Some issues are environment-specific (antivirus, network, Windows version) and faster to fix in person.\n\n**Next class:** show your instructor exactly which step you got stuck on — they'll fix it in 2 minutes.\n\n**Between sessions:** ask the AI tutor on this app — paste the exact error and it can usually pinpoint the cause.",
      terminal: true,
    },
    {
      id: 'done',
      title: "You've done it!",
      body: 'You just did Tally end-to-end:\n\n- ✅ Installed and activated\n- ✅ Company with GST enabled\n- ✅ Sales ledger configured\n- ✅ First sales voucher recorded\n- ✅ P&L verified\n\n**Next up:** the **Create Tally Masters** guide (groups, ledgers, stock items in depth) and the **Sales Voucher** deep-dive guide.',
      callout: {
        kind: 'success',
        text: 'Practice = muscle memory. Try recording 5 more sales vouchers — different amounts, different states — to lock in the workflow.',
      },
      terminal: true,
    },
  ],
}
