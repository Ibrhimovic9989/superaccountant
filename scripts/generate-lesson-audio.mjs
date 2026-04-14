#!/usr/bin/env node
/**
 * Generate narrated audio for every lesson's content in both EN and AR,
 * upload to Supabase Storage bucket 'lesson-audio', update DB with URL.
 *
 * Azure TTS has a ~5000 char limit per SSML request, so longer lessons
 * get chunked, synthesized in parallel, then concatenated via MP3 frame
 * append (valid because MP3 is framed and Azure returns constant-bitrate).
 *
 * Usage:
 *   node scripts/generate-lesson-audio.mjs                 # all lessons, both locales
 *   node scripts/generate-lesson-audio.mjs --slug=<slug>   # one lesson
 *   node scripts/generate-lesson-audio.mjs --force         # regenerate even if URL exists
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__d, '..')

for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}

const AZURE_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_REGION = process.env.AZURE_SPEECH_REGION ?? 'eastus'
const VOICE_EN = process.env.AZURE_SPEECH_VOICE_EN ?? 'en-IN-NeerjaNeural'
const VOICE_AR = process.env.AZURE_SPEECH_VOICE_AR ?? 'ar-SA-ZariyahNeural'

const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'lesson-audio'
const PUBLIC_BASE = `${SUPA_URL}/storage/v1/object/public/${BUCKET}`

const args = process.argv.slice(2)
const filterSlug = args.find((a) => a.startsWith('--slug='))?.split('=')[1]
const force = args.includes('--force')

// Resolve @prisma/client from packages/db where it's actually installed
const prismaClientUrl = pathToFileURL(
  resolve(ROOT, 'packages/db/node_modules/@prisma/client/index.js'),
).href
const { PrismaClient } = await import(prismaClientUrl)
const prisma = new PrismaClient()

// ── Helpers ─────────────────────────────────────────────────

/** Strip markdown to plain prose the TTS engine can read cleanly. */
function mdxToText(mdx) {
  return mdx
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → text
    .replace(/^#+\s+/gm, '') // heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/^[-*+]\s+/gm, '') // list markers
    .replace(/^\d+\.\s+/gm, '') // numbered list markers
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^---+$/gm, '') // horizontal rules
    .replace(/\|/g, ' ') // table pipes → spaces
    .replace(/\n{3,}/g, '\n\n') // collapse excess newlines
    .trim()
}

/** Split into chunks ≤ maxChars, breaking on paragraph/sentence boundaries. */
function chunk(text, maxChars = 4000) {
  if (text.length <= maxChars) return [text]
  const chunks = []
  let remaining = text
  while (remaining.length > maxChars) {
    // Try to break on paragraph, then sentence, then word
    let breakAt = remaining.lastIndexOf('\n\n', maxChars)
    if (breakAt < maxChars / 2) breakAt = remaining.lastIndexOf('. ', maxChars)
    if (breakAt < maxChars / 2) breakAt = remaining.lastIndexOf(' ', maxChars)
    if (breakAt <= 0) breakAt = maxChars
    chunks.push(remaining.slice(0, breakAt).trim())
    remaining = remaining.slice(breakAt).trim()
  }
  if (remaining) chunks.push(remaining)
  return chunks
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function synthesize(text, locale) {
  const voice = locale === 'ar' ? VOICE_AR : VOICE_EN
  const lang = locale === 'ar' ? 'ar-SA' : 'en-IN'
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="-5%">${escapeXml(text)}</prosody></voice></speak>`
  const res = await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
    },
    body: ssml,
  })
  if (!res.ok) throw new Error(`Azure TTS ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

async function synthesizeFull(text, locale) {
  const chunks = chunk(text)
  if (chunks.length === 1) return synthesize(chunks[0], locale)
  // Process sequentially to avoid rate limits
  const buffers = []
  for (const c of chunks) {
    buffers.push(await synthesize(c, locale))
  }
  // MP3 streams can be concatenated — the decoder handles the frame headers
  return Buffer.concat(buffers)
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

// ── Main ────────────────────────────────────────────────────

async function main() {
  const where = filterSlug ? { slug: filterSlug } : {}
  const lessons = await prisma.curriculumLesson.findMany({
    where,
    select: {
      id: true,
      slug: true,
      contentEnMdx: true,
      contentArMdx: true,
    },
  })

  console.log(`Found ${lessons.length} lessons`)
  let done = 0
  let skipped = 0
  let failed = 0

  for (const lesson of lessons) {
    const row = await prisma.$queryRaw`
      SELECT "audioUrlEn", "audioUrlAr" FROM "CurriculumLesson" WHERE id = ${lesson.id} LIMIT 1
    `
    const existing = row[0] ?? {}

    for (const locale of ['en', 'ar']) {
      const existingUrl = locale === 'en' ? existing.audioUrlEn : existing.audioUrlAr
      if (existingUrl && !force) {
        skipped++
        continue
      }
      const mdx = locale === 'en' ? lesson.contentEnMdx : lesson.contentArMdx
      if (!mdx || mdx.trim().length < 50) {
        console.log(`⊘ ${lesson.slug} [${locale}]: no content`)
        continue
      }
      const text = mdxToText(mdx)
      const startedAt = Date.now()
      try {
        const audio = await synthesizeFull(text, locale)
        const url = await upload(lesson.slug, locale, audio)
        await prisma.$executeRawUnsafe(
          `UPDATE "CurriculumLesson" SET "audioUrl${locale === 'en' ? 'En' : 'Ar'}" = $1 WHERE id = $2`,
          url,
          lesson.id,
        )
        const ms = Date.now() - startedAt
        const kb = (audio.length / 1024).toFixed(0)
        console.log(`✓ ${lesson.slug} [${locale}]: ${kb}KB in ${ms}ms`)
        done++
      } catch (err) {
        console.log(`✗ ${lesson.slug} [${locale}]: ${err.message}`)
        failed++
      }
    }
  }

  console.log(`\nDone: ${done}, Skipped: ${skipped}, Failed: ${failed}`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
