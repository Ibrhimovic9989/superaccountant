/**
 * CertificationService — issues bilingual PDF certificates with HMAC-signed
 * verification hashes.
 *
 * Per CLAUDE.md §5.3 — issuance is permission-gated. The grand-test endpoint
 * calls into this service only after server-side grading confirms a pass.
 *
 * The PDF is rendered server-side using @react-pdf/renderer and written to
 * Supabase Storage in production. For local dev we write to disk under
 * `contexts/curriculum/seed/<market>/generated/__certificates/`.
 *
 * Verification: the hash is HMAC-SHA256(secret, `${userId}|${trackId}|${score}|${issuedAt}`).
 * The public verification page recomputes the hash from the row and compares.
 */

import { Injectable } from '@nestjs/common'
import { createHmac } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { prisma } from '@sa/db'

export type IssueArgs = {
  userId: string
  attemptId: string
  market: 'india' | 'ksa'
  score: number
}

export type IssueResult = {
  certificateId: string
  hash: string
  pdfPath: string
  publicVerifyPath: string
}

@Injectable()
export class CertificationService {
  async issue(args: IssueArgs): Promise<IssueResult> {
    const user = await prisma.identityUser.findUnique({
      where: { id: args.userId },
      select: { id: true, name: true, email: true, locale: true },
    })
    if (!user) throw new Error('user not found')

    const issuedAt = new Date()
    const hash = signHash({
      userId: user.id,
      trackId: args.market,
      score: args.score,
      issuedAt: issuedAt.toISOString(),
    })

    // Render PDF to disk under repo seed dir for v1.
    const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
    const dir = resolve(repoRoot, 'contexts/curriculum/seed', args.market, 'generated', '__certificates')
    await mkdir(dir, { recursive: true })
    const filename = `${hash.slice(0, 16)}.pdf`
    const fullPath = resolve(dir, filename)

    const pdfBuffer = await renderCertificatePdf({
      name: user.name ?? user.email,
      market: args.market,
      score: args.score,
      issuedAt,
      hash,
      verifyUrl: `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/verify/${hash}`,
    })
    await writeFile(fullPath, pdfBuffer)

    const cert = await prisma.certificationCertificate.create({
      data: {
        userId: user.id,
        trackId: args.market,
        attemptId: args.attemptId,
        score: args.score,
        issuedAt,
        hash,
        pdfUrl: `/__certificates/${args.market}/${filename}`,
      },
    })

    return {
      certificateId: cert.id,
      hash,
      pdfPath: fullPath,
      publicVerifyPath: `/verify/${hash}`,
    }
  }

  /** Public — used by the verification page. */
  async verify(hash: string): Promise<{
    valid: boolean
    studentName?: string
    market?: string
    score?: number
    issuedAt?: string
  }> {
    const cert = await prisma.certificationCertificate.findUnique({
      where: { hash },
      include: { user: { select: { name: true, email: true } } },
    })
    if (!cert) return { valid: false }
    const recomputed = signHash({
      userId: cert.userId,
      trackId: cert.trackId,
      score: cert.score,
      issuedAt: cert.issuedAt.toISOString(),
    })
    return {
      valid: recomputed === cert.hash,
      studentName: cert.user.name ?? cert.user.email,
      market: cert.trackId,
      score: cert.score,
      issuedAt: cert.issuedAt.toISOString(),
    }
  }
}

function signHash(args: {
  userId: string
  trackId: string
  score: number
  issuedAt: string
}): string {
  const secret = process.env.NEXTAUTH_SECRET ?? 'dev-only-fallback-please-set-NEXTAUTH_SECRET'
  const payload = `${args.userId}|${args.trackId}|${args.score}|${args.issuedAt}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// ─── PDF rendering ──────────────────────────────────────────────────────────
let _fontsRegistered = false

async function ensureFonts() {
  if (_fontsRegistered) return
  const { Font } = await import('@react-pdf/renderer')
  const { resolve } = await import('node:path')
  const repoRoot = process.env.SA_REPO_ROOT ?? process.cwd()
  // Variable Noto fonts ship the full glyph range we need (Latin + Arabic).
  Font.register({
    family: 'Noto',
    src: resolve(repoRoot, 'apps/api/assets/fonts/NotoSans-Regular.ttf'),
  })
  Font.register({
    family: 'NotoArabic',
    src: resolve(repoRoot, 'apps/api/assets/fonts/NotoSansArabic-Regular.ttf'),
  })
  _fontsRegistered = true
}

async function renderCertificatePdf(args: {
  name: string
  market: 'india' | 'ksa'
  score: number
  issuedAt: Date
  hash: string
  verifyUrl: string
}): Promise<Buffer> {
  await ensureFonts()
  const { Document, Page, Text, View, StyleSheet, renderToBuffer } = await import(
    '@react-pdf/renderer'
  )
  const React = await import('react')

  const styles = StyleSheet.create({
    page: {
      padding: 50,
      fontFamily: 'Noto',
      backgroundColor: '#f8fafc',
    },
    border: {
      flex: 1,
      borderWidth: 4,
      borderColor: '#0f172a',
      padding: 40,
      backgroundColor: '#ffffff',
    },
    // ── EN block ──
    header: { fontSize: 11, color: '#64748b', textAlign: 'center', letterSpacing: 2 },
    brand: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
    subhead: { fontSize: 11, textAlign: 'center', color: '#64748b', marginTop: 4 },

    twoCol: {
      flexDirection: 'row',
      marginTop: 32,
      gap: 20,
    },
    col: {
      flex: 1,
      padding: 16,
    },
    colDivider: {
      width: 1,
      backgroundColor: '#e2e8f0',
    },

    label: { fontSize: 10, color: '#64748b', textAlign: 'center' },
    labelAr: {
      fontSize: 10,
      color: '#64748b',
      textAlign: 'center',
      fontFamily: 'NotoArabic',
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 12,
    },
    nameAr: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 12,
      fontFamily: 'NotoArabic',
    },
    track: { fontSize: 13, textAlign: 'center', marginTop: 4 },
    trackAr: { fontSize: 13, textAlign: 'center', marginTop: 4, fontFamily: 'NotoArabic' },

    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 'auto',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#e2e8f0',
    },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 8, color: '#64748b', letterSpacing: 1 },
    metaValue: { fontSize: 10, marginTop: 2 },
    hash: {
      fontSize: 7,
      color: '#94a3b8',
      textAlign: 'center',
      marginTop: 8,
      fontFamily: 'Courier',
    },
  })

  const trackEn = args.market === 'india' ? 'Chartered Path · India' : "Mu'tamad Path · Saudi Arabia"
  const trackAr =
    args.market === 'india' ? 'المسار المعتمد · الهند' : 'مسار مُعتمَد · المملكة العربية السعودية'

  const issuedDate = args.issuedAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const enColumn = React.createElement(
    View,
    { style: styles.col },
    React.createElement(Text, { style: styles.header }, 'CERTIFICATE OF COMPLETION'),
    React.createElement(Text, { style: styles.brand }, 'SuperAccountant'),
    React.createElement(
      Text,
      { style: styles.subhead },
      'AI tutor for accountants — India and KSA',
    ),
    React.createElement(View, { style: { marginTop: 36 } }),
    React.createElement(Text, { style: styles.label }, 'This is to certify that'),
    React.createElement(Text, { style: styles.name }, args.name),
    React.createElement(Text, { style: styles.label }, 'has successfully completed the'),
    React.createElement(Text, { style: styles.track }, trackEn),
  )

  const arColumn = React.createElement(
    View,
    { style: styles.col },
    React.createElement(Text, { style: styles.header }, 'شهادة إتمام'),
    React.createElement(Text, { style: styles.brand }, 'SuperAccountant'),
    React.createElement(
      Text,
      { style: styles.labelAr },
      'مدرس محاسبة بالذكاء الاصطناعي — الهند والمملكة العربية السعودية',
    ),
    React.createElement(View, { style: { marginTop: 36 } }),
    React.createElement(Text, { style: styles.labelAr }, 'تشهد هذه الوثيقة بأن'),
    React.createElement(Text, { style: styles.nameAr }, args.name),
    React.createElement(Text, { style: styles.labelAr }, 'قد أكمل بنجاح'),
    React.createElement(Text, { style: styles.trackAr }, trackAr),
  )

  const metaRow = React.createElement(
    View,
    { style: styles.metaRow },
    React.createElement(
      View,
      { style: styles.metaCol },
      React.createElement(Text, { style: styles.metaLabel }, 'SCORE · النتيجة'),
      React.createElement(Text, { style: styles.metaValue }, `${Math.round(args.score * 100)}%`),
    ),
    React.createElement(
      View,
      { style: styles.metaCol },
      React.createElement(Text, { style: styles.metaLabel }, 'ISSUED · التاريخ'),
      React.createElement(Text, { style: styles.metaValue }, issuedDate),
    ),
    React.createElement(
      View,
      { style: styles.metaCol },
      React.createElement(Text, { style: styles.metaLabel }, 'VERIFY · تحقق'),
      React.createElement(Text, { style: styles.metaValue }, args.verifyUrl),
    ),
  )

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },
      React.createElement(
        View,
        { style: styles.border },
        React.createElement(
          View,
          { style: styles.twoCol },
          enColumn,
          React.createElement(View, { style: styles.colDivider }),
          arColumn,
        ),
        metaRow,
        React.createElement(Text, { style: styles.hash }, args.hash),
      ),
    ),
  )

  return (await renderToBuffer(doc)) as Buffer
}
