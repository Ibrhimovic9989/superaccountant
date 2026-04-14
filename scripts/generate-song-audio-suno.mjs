#!/usr/bin/env node
/**
 * Generate ACTUALLY-SUNG versions of each shanty via Suno API, mirror the
 * resulting MP3 into our own Supabase Storage so we don't depend on
 * Suno's CDN long-term, and print the public URL to paste into songs.ts.
 *
 * Why mirror? Suno's audio URLs are CDN-hosted and may expire or rate-
 * limit. We download once, store under our control.
 *
 * Usage:
 *   node scripts/generate-song-audio-suno.mjs                # all songs
 *   node scripts/generate-song-audio-suno.mjs --slug=<slug>  # one song
 *   node scripts/generate-song-audio-suno.mjs --model=V5     # override model
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

const SUNO_KEY = process.env.SUNO_API_KEY
const SUNO_BASE = 'https://api.sunoapi.org'

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'song-audio'
const PUBLIC_BASE = `${SUPA_URL}/storage/v1/object/public/${BUCKET}`

const args = process.argv.slice(2)
const filterSlug = args.find((a) => a.startsWith('--slug='))?.split('=')[1]
const modelOverride = args.find((a) => a.startsWith('--model='))?.split('=')[1]
const MODEL = modelOverride ?? 'V5'

// ── Songs — title + style + lyrics formatted for Suno ────────
//
// Suno parses lyric-section markers like [Verse], [Chorus], [Bridge].
// Style is a comma-separated genre/instrumentation prompt — we lock all
// three songs to a sea-shanty timbre so they share an audible identity.

const SHANTY_STYLE =
  'sea shanty, folk, accordion, fiddle, male lead vocals with chorus, call-and-response, rhythmic, 4/4, mid-tempo, acoustic, no electronic instruments'

function shantyLyrics({ chorus, verses }) {
  // Suno format: section tag on its own line, lyrics below.
  // Pattern: opening chorus, then verses with chorus repeated every 2 verses.
  const lines = []
  lines.push('[Chorus]')
  for (const l of chorus) lines.push(l)
  lines.push('')

  verses.forEach((verse, i) => {
    lines.push(`[Verse ${i + 1}]`)
    for (const l of verse) lines.push(l)
    lines.push('')
    if ((i + 1) % 2 === 0 && i < verses.length - 1) {
      lines.push('[Chorus]')
      for (const l of chorus) lines.push(l)
      lines.push('')
    }
  })

  lines.push('[Chorus]')
  for (const l of chorus) lines.push(l)

  return lines.join('\n')
}

const SONGS = [
  {
    slug: 'tds-sea-shanty',
    title: 'The TDS Sea Shanty',
    style: SHANTY_STYLE,
    chorus: [
      'Soon may the challan come,',
      'To bring the deposit before it is due,',
      'The seventh of the following month,',
      'We will file our 26Q!',
    ],
    verses: [
      [
        'The taxman came a-knocking on the door,',
        'Said pay your TDS, or you will pay more,',
        'He gave us a book of sections galore,',
        'O learn them, my bookkeepers!',
      ],
      [
        'One ninety-two is for salary paid,',
        'Average rate on the yearly grade,',
        'Form 16 by fifteenth June must be made,',
        'Pay the slab, my bookkeepers!',
      ],
      [
        'One ninety-four-A is for interest paid,',
        'Ten percent is the cut that is made,',
        'Forty thousand is the yearly gate,',
        'Bank deposits, beware!',
      ],
      [
        'One ninety-four-C is the contractor due,',
        'One percent if they are individuals too,',
        'Two percent for firms that come into view,',
        'Thirty thousand per bill!',
      ],
      [
        'One ninety-four-J is professional pay,',
        'Ten for the doctor, lawyer, CA,',
        'Two for the technical work they say,',
        'Thirty thousand kicks in!',
      ],
      [
        'If they do not give a valid PAN,',
        'Twenty percent, that is the plan,',
        'Section two-oh-six A-A demands,',
        'Always collect the PAN!',
      ],
    ],
  },
  {
    slug: 'golden-rules',
    title: 'The Golden Rules Shanty',
    style: SHANTY_STYLE,
    chorus: [
      'Soon may the balance come,',
      'When debits and credits equal one,',
      'If the two sides do not match we are not done,',
      'We will check our books again!',
    ],
    verses: [
      [
        'There once was an accountant keeping books,',
        'Every entry needed two sides right,',
        'Debit and credit, left and right,',
        'O balance them, my bookkeeper!',
      ],
      [
        'When the account has a person name,',
        'Debit the one who receives the gain,',
        'Credit the one who gives the same,',
        'Personal is the rule!',
      ],
      [
        'When the account is an asset real,',
        'Debit what comes into the hall,',
        'Credit what leaves the place at all,',
        'Real accounts we call!',
      ],
      [
        'When the account is expense or gain,',
        'Debit the losses and all expense,',
        'Credit the income and gains you sensed,',
        'Nominal is the name!',
      ],
    ],
  },
  {
    slug: 'ifrs-numbers',
    title: 'The IFRS Numbers Shanty',
    style: SHANTY_STYLE,
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
        'From the high to the low I will sing them to you,',
        'O learn, my accountants!',
      ],
      [
        'One-five for revenue contracts made,',
        'Five steps to recognize the trade,',
        'When control transfers, revenue is paid,',
        'Fifteen is the rule!',
      ],
      [
        'One-six for leases, on the sheet they go,',
        'Right-of-use asset, liability too,',
        'Short and low-value we may let go,',
        'Sixteen put leases on!',
      ],
      [
        'Nine for the instruments held for the year,',
        'Amortised cost, FV-O-C-I clear,',
        'Expected credit loss in three stages here,',
        'Nine replaced thirty-nine!',
      ],
      [
        'Two for the stock in the warehouse aisle,',
        'Lower of cost or realisable net,',
        'FIFO and weighted, no LIFO yet,',
        'Two is the inventory!',
      ],
    ],
  },
]

// ── Suno API ──────────────────────────────────────────────────

async function submitGeneration(song) {
  const body = {
    customMode: true,
    instrumental: false,
    model: MODEL,
    style: song.style,
    title: song.title,
    prompt: shantyLyrics(song),
    // The API requires a callBackUrl — we don't run a webhook, we poll.
    // webhook.site provides a no-op endpoint that accepts any POST.
    callBackUrl: 'https://webhook.site/00000000-0000-0000-0000-000000000000',
  }
  const res = await fetch(`${SUNO_BASE}/api/v1/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUNO_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Suno generate ${res.status}: ${text}`)
  const json = JSON.parse(text)
  if (json.code !== 200) throw new Error(`Suno generate code ${json.code}: ${json.msg}`)
  return json.data.taskId
}

const TERMINAL_OK = new Set(['SUCCESS', 'FIRST_SUCCESS', 'TEXT_SUCCESS'])
const TERMINAL_FAIL = new Set([
  'CREATE_TASK_FAILED',
  'GENERATE_AUDIO_FAILED',
  'CALLBACK_EXCEPTION',
  'SENSITIVE_WORD_ERROR',
])

async function pollDetails(taskId, { maxMs = 15 * 60 * 1000, intervalMs = 8000 } = {}) {
  const start = Date.now()
  let lastStatus = ''
  while (Date.now() - start < maxMs) {
    const res = await fetch(
      `${SUNO_BASE}/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${SUNO_KEY}` } },
    )
    const text = await res.text()
    if (!res.ok) throw new Error(`Suno record-info ${res.status}: ${text}`)
    const json = JSON.parse(text)
    const status = json?.data?.status ?? 'UNKNOWN'
    if (status !== lastStatus) {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(0)
      console.log(`   …status=${status} (${elapsedSec}s)`)
      lastStatus = status
    }
    if (TERMINAL_FAIL.has(status)) {
      throw new Error(`Suno failed: ${status} — ${json?.data?.errorMessage ?? ''}`)
    }
    // Wait for the FULL 'SUCCESS' rather than FIRST_SUCCESS (the latter
    // means only one of two tracks is ready; we want both tracks done so
    // we have stable URLs).
    if (status === 'SUCCESS') {
      const tracks = json?.data?.response?.sunoData ?? []
      if (tracks.length > 0 && tracks[0].audioUrl) return tracks
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Polling timeout after ${maxMs}ms`)
}

// ── Supabase mirror ───────────────────────────────────────────

async function ensureBucket() {
  const res = await fetch(`${SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (!text.includes('already exists') && !text.includes('Duplicate')) {
      console.warn(`! bucket create returned ${res.status}: ${text}`)
    }
  }
}

async function downloadAndMirror(slug, locale, sourceUrl) {
  const dl = await fetch(sourceUrl)
  if (!dl.ok) throw new Error(`download ${dl.status} from ${sourceUrl}`)
  const audio = Buffer.from(await dl.arrayBuffer())

  const storagePath = `${slug}/${locale}.mp3`
  const up = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
    body: audio,
  })
  if (!up.ok) throw new Error(`upload ${up.status}: ${await up.text().catch(() => '')}`)
  return { url: `${PUBLIC_BASE}/${storagePath}`, bytes: audio.length }
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  if (!SUNO_KEY) throw new Error('SUNO_API_KEY missing')
  if (!SUPA_URL || !SUPA_KEY) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')

  await ensureBucket()

  const songs = filterSlug ? SONGS.filter((s) => s.slug === filterSlug) : SONGS
  if (songs.length === 0) {
    console.error(`No songs match --slug=${filterSlug}`)
    process.exit(1)
  }

  console.log(`Generating sung audio for ${songs.length} song(s) via Suno (model=${MODEL})\n`)

  const results = []
  for (const song of songs) {
    console.log(`▶ ${song.slug} — submitting to Suno…`)
    try {
      const taskId = await submitGeneration(song)
      console.log(`   taskId=${taskId} — polling for completion…`)
      const tracks = await pollDetails(taskId)
      const track = tracks[0]
      console.log(`   ✓ generated: "${track.title}" (${track.duration?.toFixed?.(1)}s)`)
      console.log('   ↓ mirroring to Supabase…')
      const { url, bytes } = await downloadAndMirror(song.slug, 'en', track.audioUrl)
      const kb = (bytes / 1024).toFixed(0)
      console.log(`   ✓ mirrored: ${kb}KB → ${url}\n`)
      results.push({ slug: song.slug, url, sourceUrl: track.audioUrl, taskId })
    } catch (err) {
      console.log(`   ✗ ${song.slug}: ${err.message}\n`)
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
