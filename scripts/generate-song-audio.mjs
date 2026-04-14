#!/usr/bin/env node
/**
 * Generate sung-style audio for each accounting shanty and upload to
 * Supabase Storage bucket 'song-audio'. Prints the public URLs so they
 * can be pasted back into apps/web/src/lib/data/songs.ts as `audioUrl`.
 *
 * Azure TTS doesn't sing, but with SSML prosody (slower rate, pitch
 * contours, line breaks matching the Wellerman meter) the result is a
 * rhythmic chant the student sings along to. It's the closest we get
 * without a music-AI model in the loop.
 *
 * Usage:
 *   node scripts/generate-song-audio.mjs                # all songs, EN only (AR pending)
 *   node scripts/generate-song-audio.mjs --slug=<slug>  # one song
 *   node scripts/generate-song-audio.mjs --force        # re-upload over existing
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const AZURE_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus'
const VOICE_EN = process.env.AZURE_SPEECH_VOICE_EN ?? 'en-IN-NeerjaNeural'

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'song-audio'
const PUBLIC_BASE = `${SUPA_URL}/storage/v1/object/public/${BUCKET}`

const args = process.argv.slice(2)
const filterSlug = args.find((a) => a.startsWith('--slug='))?.split('=')[1]

// ── Song lyrics — duplicated from apps/web/src/lib/data/songs.ts ──
//
// We inline lyrics here (not import from songs.ts) so this script has zero
// build-time dependency on the web app. Update both files when you add a
// song. (3 songs is fine; if we ever exceed ~10, extract to JSON.)

const SONGS = [
  {
    slug: 'tds-sea-shanty',
    intro:
      'To be sung to the tune of Soon May the Wellerman Come. Each verse drills one TDS section. Sing the chorus between every two verses.',
    chorus: [
      'Soon may the challan come,',
      'To bring the deposit before it is due.',
      'The seventh of the following month,',
      'We will file our 26Q!',
    ],
    verses: [
      [
        'The taxman came a-knocking on the door,',
        'Said pay your TDS, or you will pay more.',
        'He gave us a book of sections galore —',
        'O learn them, my bookkeepers!',
      ],
      [
        'One-nine-two is for salary paid,',
        'Average rate on the yearly grade,',
        'Form 16 by fifteenth June must be made —',
        'Pay the slab, my bookkeepers!',
      ],
      [
        'One-nine-four-A is for interest paid,',
        'Ten percent is the cut that is made,',
        'Forty thousand is the yearly gate —',
        'Bank deposits, beware!',
      ],
      [
        'One-nine-four-C is the contractor due,',
        'One percent if they are individuals too,',
        'Two percent for firms that come into view —',
        'Thirty thousand per bill!',
      ],
      [
        'One-nine-four-I is the rent you disburse,',
        'Ten on the building, two on machines,',
        'Two lakh forty is the yearly purse —',
        'Deduct before you pay!',
      ],
      [
        'One-nine-four-J is professional pay,',
        'Ten for the doctor, lawyer, CA,',
        'Two for the technical work they say —',
        'Thirty thousand kicks in!',
      ],
      [
        'If they do not give a valid PAN,',
        'Twenty percent — that is the plan,',
        'Section two-oh-six-A-A demands —',
        'Always collect the PAN!',
      ],
    ],
    outro:
      'Now you know the sections cold. Form 26Q is filed quarterly. Late filing costs two hundred rupees per day under section two-three-four-E.',
  },

  {
    slug: 'golden-rules',
    intro:
      'Three rules cover every journal entry ever written. Memorize the song and you will never stare at a journal blank-eyed again.',
    chorus: [
      'Soon may the balance come,',
      'When debits and credits equal one,',
      'If the two sides do not match — we are not done,',
      'We will check our books again!',
    ],
    verses: [
      [
        'There once was an accountant keeping books,',
        'Every entry needed two sides right,',
        'Debit and credit, left and right —',
        'O balance them, my bookkeeper!',
      ],
      [
        'When the account has a person name,',
        'Debit the one who receives the gain,',
        'Credit the one who gives the same —',
        'Personal is the rule!',
      ],
      [
        'When the account is an asset real,',
        'Debit what comes into the hall,',
        'Credit what leaves the place at all —',
        'Real accounts we call!',
      ],
      [
        'When the account is expense or gain,',
        'Debit the losses and all expense,',
        'Credit the income and gains you sensed —',
        'Nominal is the name!',
      ],
      [
        'Or the modern rule for the ones who care,',
        'Asset up is a debit affair,',
        'Liability up — credit with flair —',
        'Either works, you will be right!',
      ],
    ],
    outro:
      'Both the traditional and modern rules give the same answer on every transaction — pick whichever your brain clicks with.',
  },

  {
    slug: 'ifrs-numbers',
    intro:
      'Four standards cover eighty percent of what you need in an accounting interview. One verse each, same tune as the rest of the shanty.',
    chorus: [
      'Soon may the audit come,',
      'When the financial statements show the sum,',
      'We will close the books when the year is done,',
      'We will report and retire, oh!',
    ],
    verses: [
      [
        'There once was a book of standards we knew,',
        'The IFRS numbers, we will see them through,',
        'From the high to the low I will sing them to you —',
        'O learn, my accountants!',
      ],
      [
        'One-five for revenue contracts made,',
        'Five steps to recognize the trade,',
        'When control transfers, revenue is paid —',
        'Fifteen is the rule!',
      ],
      [
        'One-six for leases, on the sheet they go,',
        'Right-of-use asset, liability too,',
        'Short and low-value we may let go —',
        'Sixteen put leases on!',
      ],
      [
        'Nine for the instruments held for the year,',
        'Amortised cost, FVOCI clear,',
        'Expected credit loss in three stages here —',
        'Nine replaced thirty-nine!',
      ],
      [
        'Two for the stock in the warehouse aisle,',
        'Lower of cost or realisable net,',
        'FIFO and weighted — no LIFO yet —',
        'Two is the inventory!',
      ],
    ],
    outro:
      'These four standards are on every CA, CPA, and SOCPA syllabus. Add IFRS 7, IAS 16, and IFRS 10 when you are ready.',
  },
]

// ── SSML composition ──────────────────────────────────────────
//
// Sea-shanty pacing:
//  - rate: -10% (slower, chant-like)
//  - pitch contours: rise on lines 1+3, fall on lines 2+4 (call-and-response)
//  - 350ms break between lines, 700ms between stanzas
//  - chorus is sung after every two verses (verse 0 = prologue, chorus after 2,4,6...)

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Render one verse/chorus stanza as SSML — alternating pitch on lines for shanty feel. */
function stanzaSsml(lines, { highPitch = '+8%', lowPitch = '-4%' } = {}) {
  return lines
    .map((line, i) => {
      const pitch = i % 2 === 0 ? highPitch : lowPitch
      return `<prosody pitch="${pitch}">${escapeXml(line)}</prosody><break time="350ms"/>`
    })
    .join('')
}

/** Compose the full SSML body for one song (intro → chorus → verse, chorus → verse,verse... → outro). */
function buildSsml(song, voice, lang) {
  const parts = []

  if (song.intro) {
    parts.push(`<prosody rate="-5%">${escapeXml(song.intro)}</prosody>`)
    parts.push(`<break time="900ms"/>`)
  }

  // Opening chorus to set the tune in the listener's head
  parts.push(stanzaSsml(song.chorus, { highPitch: '+10%', lowPitch: '-2%' }))
  parts.push(`<break time="700ms"/>`)

  // Verses, with chorus repeated after every two verses
  song.verses.forEach((verse, i) => {
    parts.push(stanzaSsml(verse))
    parts.push(`<break time="600ms"/>`)
    // After verses 2, 4, 6... drop the chorus
    if ((i + 1) % 2 === 0 && i < song.verses.length - 1) {
      parts.push(stanzaSsml(song.chorus, { highPitch: '+10%', lowPitch: '-2%' }))
      parts.push(`<break time="700ms"/>`)
    }
  })

  // Final chorus
  parts.push(stanzaSsml(song.chorus, { highPitch: '+10%', lowPitch: '-2%' }))
  parts.push(`<break time="900ms"/>`)

  if (song.outro) {
    parts.push(`<prosody rate="-5%">${escapeXml(song.outro)}</prosody>`)
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="-10%">${parts.join('')}</prosody></voice></speak>`
}

// ── Azure TTS + Supabase upload ───────────────────────────────

async function synthesize(ssml) {
  const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

async function ensureBucket() {
  // Create bucket if missing — idempotent (ignore "already exists" errors)
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (res.ok) {
    console.log(`✓ Created bucket ${BUCKET}`)
  } else {
    const text = await res.text().catch(() => '')
    if (text.includes('already exists') || text.includes('Duplicate')) {
      // already there — fine
    } else if (res.status >= 400) {
      console.warn(`! bucket create returned ${res.status}: ${text} (continuing)`)
    }
  }
}

async function upload(slug, locale, audio) {
  const storagePath = `${slug}/${locale}.mp3`
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: audio,
  })
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${await res.text().catch(() => '')}`)
  return `${PUBLIC_BASE}/${storagePath}`
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  if (!AZURE_KEY) throw new Error('AZURE_SPEECH_KEY missing')
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')

  await ensureBucket()

  const songs = filterSlug ? SONGS.filter((s) => s.slug === filterSlug) : SONGS
  if (songs.length === 0) {
    console.error(`No songs match --slug=${filterSlug}`)
    process.exit(1)
  }

  console.log(`Generating audio for ${songs.length} song(s)\n`)

  const results = []
  for (const song of songs) {
    const ssml = buildSsml(song, VOICE_EN, 'en-IN')
    const startedAt = Date.now()
    try {
      const audio = await synthesize(ssml)
      const url = await upload(song.slug, 'en', audio)
      const ms = Date.now() - startedAt
      const kb = (audio.length / 1024).toFixed(0)
      console.log(`✓ ${song.slug}: ${kb}KB in ${ms}ms`)
      console.log(`   → ${url}`)
      results.push({ slug: song.slug, url })
    } catch (err) {
      console.log(`✗ ${song.slug}: ${err.message}`)
    }
  }

  console.log('\n── Paste these into apps/web/src/lib/data/songs.ts ──')
  for (const { slug, url } of results) {
    console.log(`${slug}: audioUrl = '${url}'`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
