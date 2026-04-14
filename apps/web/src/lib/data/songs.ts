/**
 * Accounting Shanties — song-based memorization aids.
 *
 * Each song is written to match the meter and structure of "The Wellerman"
 * (sea shanty, 2021 viral version by Nathan Evans). Students sing our lyrics
 * to the Wellerman tune — the catchy melody glues otherwise-dry tax rates,
 * section numbers, and accounting rules into muscle memory.
 *
 * Structure matches Wellerman exactly:
 *   - Each verse is 4 lines (~8-9 syllables each, iambic/anapestic tetrameter)
 *   - Last line of every verse is a 6-syllable shanty refrain
 *   - Chorus of 4 lines, sung after every 2 verses
 *
 * To add a song: append to the SONGS array. Any new slug is auto-listed on
 * /[locale]/songs and auto-routed to /[locale]/songs/[slug].
 */

export type SongVerse = {
  /** Short label shown before the verse in the karaoke display (e.g. "194C"). */
  label?: string
  /** The 4 lines of the verse. */
  lines: string[]
}

export type Song = {
  slug: string
  title: string
  subtitle: string
  topic: string
  /** One-sentence pitch shown on cards and above the lyrics. */
  hook: string
  /** Market filter — 'india' | 'ksa' | 'both'. Hidden from students outside scope. */
  market: 'india' | 'ksa' | 'both'
  /** Tune + source for the "play the tune" button. */
  tune: {
    name: string
    /** YouTube video ID for the karaoke/instrumental version. */
    youtubeId: string
  }
  /** Emoji shown on the card. */
  emoji: string
  /** Accent tint on the card. */
  color: 'accent' | 'success' | 'warning' | 'danger'
  intro?: string
  chorus: string[]
  verses: SongVerse[]
  outro?: string
  /** Optional cheat-sheet shown below the lyrics. */
  cheatSheet?: string[]
}

export const SONGS: Song[] = [
  // ── Song 1: TDS Sea Shanty ────────────────────────────────
  {
    slug: 'tds-sea-shanty',
    title: 'The TDS Sea Shanty',
    subtitle: 'Every Indian TDS section, set to sea',
    topic: 'TDS rates under the Income Tax Act, 1961',
    hook: 'Memorize every TDS rate — 194A through 206AA — in three minutes flat. Sing once, remember forever.',
    market: 'india',
    tune: { name: 'The Wellerman (Nathan Evans, 2021)', youtubeId: '1IReY4IUKlw' },
    emoji: '⚓',
    color: 'accent',
    intro:
      'To be sung to the tune of "Soon May the Wellerman Come". Each verse drills one TDS section. Sing the chorus between every two verses. By verse 6, you will never forget 194J again.',
    chorus: [
      'Soon may the challan come,',
      'To bring the deposit before it’s due.',
      'The seventh of the following month,',
      'We’ll file our 26Q!',
    ],
    verses: [
      {
        label: 'Prologue',
        lines: [
          'The taxman came a-knocking on the door,',
          'Said "pay your TDS, or you’ll pay more".',
          'He gave us a book of sections galore —',
          'O learn them, my bookkeepers!',
        ],
      },
      {
        label: '§192',
        lines: [
          'One-nine-two is for salary paid,',
          'Average rate on the yearly grade,',
          'Form 16 by fifteenth June must be made —',
          'Pay the slab, my bookkeepers!',
        ],
      },
      {
        label: '§194A',
        lines: [
          'One-nine-four-A is for interest paid,',
          'Ten percent is the cut that’s made,',
          'Forty thousand’s the yearly gate —',
          'Bank deposits, beware!',
        ],
      },
      {
        label: '§194C',
        lines: [
          'One-nine-four-C is the contractor’s due,',
          'One percent if they’re individuals too,',
          'Two percent for firms that come into view —',
          'Thirty thousand per bill!',
        ],
      },
      {
        label: '§194I',
        lines: [
          'One-nine-four-I is the rent you disburse,',
          'Ten on the building, two on machines,',
          'Two lakh forty is the yearly purse —',
          'Deduct before you pay!',
        ],
      },
      {
        label: '§194J',
        lines: [
          'One-nine-four-J is professional pay,',
          'Ten for the doctor, lawyer, CA,',
          'Two for the technical work they say —',
          'Thirty thousand kicks in!',
        ],
      },
      {
        label: '§206AA',
        lines: [
          'If they don’t give a valid PAN,',
          'Twenty percent — that’s the plan,',
          'Section two-oh-six-A-A demands —',
          'Always collect the PAN!',
        ],
      },
    ],
    outro:
      'Now you know the sections cold. Form 26Q is filed quarterly — 31 Jul, 31 Oct, 31 Jan, 31 May (for Q4). Late filing: ₹200/day under §234E.',
    cheatSheet: [
      '192 · Salary · slab rate · monthly',
      '194A · Interest · 10% · ₹40,000 p.a. (₹50,000 senior)',
      '194C · Contractor · 1% / 2% · ₹30,000 single / ₹1L aggregate',
      '194H · Commission · 2% · ₹20,000 p.a.',
      '194I · Rent · 10% (bldg) / 2% (machinery) · ₹2,40,000 p.a.',
      '194J · Professional · 10% / 2% technical · ₹30,000 p.a.',
      '194Q · Purchase of goods · 0.1% · > ₹50L from single seller',
      '206AA · No PAN → higher of 20% or prescribed rate',
    ],
  },

  // ── Song 2: Golden Rules of Accounting ────────────────────
  {
    slug: 'golden-rules',
    title: 'The Golden Rules Shanty',
    subtitle: 'Debit and credit, drilled in four verses',
    topic: 'The Golden Rules of Accounting (traditional British system)',
    hook: 'The three Golden Rules — Personal, Real, Nominal — set to the Wellerman. Debit and credit confusion ends here.',
    market: 'both',
    tune: { name: 'The Wellerman (Nathan Evans, 2021)', youtubeId: '1IReY4IUKlw' },
    emoji: '⚖️',
    color: 'warning',
    intro:
      'Three rules cover every journal entry ever written. Memorize the song and you will never stare at a journal blank-eyed again.',
    chorus: [
      'Soon may the balance come,',
      'When debits and credits equal one,',
      'If the two sides don’t match — we’re not done,',
      'We’ll check our books again!',
    ],
    verses: [
      {
        label: 'Prologue',
        lines: [
          'There once was an accountant keeping books,',
          'Every entry needed two sides right,',
          'Debit and credit, left and right —',
          'O balance them, my bookkeeper!',
        ],
      },
      {
        label: 'Personal A/c',
        lines: [
          'When the account has a person’s name,',
          'Debit the one who receives the gain,',
          'Credit the one who gives the same —',
          'Personal is the rule!',
        ],
      },
      {
        label: 'Real A/c',
        lines: [
          'When the account is an asset real,',
          'Debit what comes into the hall,',
          'Credit what leaves the place at all —',
          'Real accounts we call!',
        ],
      },
      {
        label: 'Nominal A/c',
        lines: [
          'When the account is expense or gain,',
          'Debit the losses and all expense,',
          'Credit the income and gains you sensed —',
          'Nominal is the name!',
        ],
      },
      {
        label: 'Modern',
        lines: [
          'Or the modern rule for the ones who care,',
          'Asset up is a debit affair,',
          'Liability up — credit with flair —',
          'Either works, you’ll be right!',
        ],
      },
    ],
    outro:
      'Both the traditional and modern rules give the same answer on every transaction — pick whichever your brain clicks with.',
    cheatSheet: [
      'Personal A/c: Debit the receiver, Credit the giver',
      'Real A/c: Debit what comes in, Credit what goes out',
      'Nominal A/c: Debit all expenses/losses, Credit all incomes/gains',
      '— or —',
      'Modern: Dr. assets + expenses; Cr. liabilities + equity + income',
    ],
  },

  // ── Song 3: IFRS / Ind AS Numbers Shanty ──────────────────
  {
    slug: 'ifrs-numbers',
    title: 'The IFRS Numbers Shanty',
    subtitle: 'Four standards, four verses, learned for life',
    topic: 'Key IFRS / Ind AS standards by number',
    hook: 'IFRS 15, 16, 9, and IAS 2 — what each one covers and the one rule you must remember. Set to the Wellerman.',
    market: 'both',
    tune: { name: 'The Wellerman (Nathan Evans, 2021)', youtubeId: '1IReY4IUKlw' },
    emoji: '📘',
    color: 'success',
    intro:
      'Four standards cover 80% of what you need in an accounting interview. One verse each, same tune as the rest of the shanty.',
    chorus: [
      'Soon may the audit come,',
      'When the financial statements show the sum,',
      'We’ll close the books when the year is done,',
      'We’ll report and retire, oh!',
    ],
    verses: [
      {
        label: 'Prologue',
        lines: [
          'There once was a book of standards we knew,',
          'The IFRS numbers, we’ll see them through,',
          'From the high to the low I’ll sing them to you —',
          'O learn, my accountants!',
        ],
      },
      {
        label: 'IFRS 15',
        lines: [
          'One-five for revenue contracts made,',
          'Five steps to recognize the trade,',
          'When control transfers, revenue’s paid —',
          'Fifteen is the rule!',
        ],
      },
      {
        label: 'IFRS 16',
        lines: [
          'One-six for leases, on the sheet they go,',
          'Right-of-use asset, liability too,',
          'Short and low-value we may let go —',
          'Sixteen put leases on!',
        ],
      },
      {
        label: 'IFRS 9',
        lines: [
          'Nine for the instruments held for the year,',
          'Amortised cost, FVOCI clear,',
          'Expected credit loss in three stages here —',
          'Nine replaced thirty-nine!',
        ],
      },
      {
        label: 'IAS 2',
        lines: [
          'Two for the stock in the warehouse aisle,',
          'Lower of cost or realisable net,',
          'FIFO and weighted — no LIFO yet —',
          'Two is the inventory!',
        ],
      },
    ],
    outro:
      'These four standards are on every CA / CPA / SOCPA syllabus. Add IFRS 7 (disclosure), IAS 16 (PP&E), and IFRS 10 (consolidation) when you are ready.',
    cheatSheet: [
      'IFRS 15 · Revenue · 5-step model, recognize when control transfers',
      'IFRS 16 · Leases · ROU asset + lease liability, low-value exempt',
      'IFRS 9 · Financial Instruments · classification + ECL impairment',
      'IAS 2 · Inventories · lower of cost or NRV · no LIFO',
    ],
  },
]

/** Lookup a song by slug. Returns undefined if not found. */
export function getSongBySlug(slug: string): Song | undefined {
  return SONGS.find((s) => s.slug === slug)
}

/** Filter songs by market. 'both' songs are always included. */
export function getSongsForMarket(market: 'india' | 'ksa'): Song[] {
  return SONGS.filter((s) => s.market === market || s.market === 'both')
}
