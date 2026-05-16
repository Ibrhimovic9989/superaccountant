import { AppNav } from '@/components/app-nav'
import {
  CertificateBuilder,
  type GenerateRequest,
  type GenerateResult,
  type SendBatchRequest,
  type SendBatchResultPayload,
} from '@/components/certificates/cert-builder'
import { BlurFade } from '@/components/magicui/blur-fade'
import { auth } from '@/lib/auth'
import { generateBatch } from '@/lib/certificates/generate'
import { sendCertificateBatchEmails } from '@/lib/certificates/send'
import type { SupportedLocale } from '@sa/i18n'
import { Award } from 'lucide-react'
import { redirect } from 'next/navigation'

/**
 * Bulk e-certificate generator.
 *
 * Auth-gated (any signed-in user). User defines the certificate template
 * (title, body with {{name}}, issuer, date, accent colour), pastes or
 * uploads a list of recipient names (one per line, or Name,Email), and
 * we generate one PDF per recipient — stored in Supabase Storage with
 * a hash-signed verification URL.
 */
export default async function NewCertificateBatchPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/sign-in`)
  const userId = session.user.id

  async function generate(req: GenerateRequest): Promise<GenerateResult> {
    'use server'
    const appBaseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const result = await generateBatch({
      ownerUserId: userId,
      template: req.template,
      recipients: req.recipients,
      appBaseUrl,
    })
    return {
      batchId: result.batchId,
      issued: result.issued,
      failures: result.failures,
    }
  }

  async function sendBatch(req: SendBatchRequest): Promise<SendBatchResultPayload> {
    'use server'
    try {
      const res = await sendCertificateBatchEmails({
        batchId: req.batchId,
        ownerUserId: userId,
        subject: req.subject,
        body: req.body,
        replyTo: req.replyTo ?? null,
      })
      return res
    } catch (err) {
      // Surface as a single 'failed' row rather than throwing — the
      // builder UI is set up to render the failed array but explodes
      // into React's generic error overlay on an unhandled action throw.
      console.error('[sendBatch] failed', { batchId: req.batchId, err })
      const msg = err instanceof Error ? err.message : 'send_failed'
      return {
        sent: [],
        skipped: [],
        failed: [
          {
            recordId: 'batch',
            recipientName: 'batch',
            recipientEmail: '',
            error: msg,
          },
        ],
      }
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <AppNav
        locale={locale}
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ''}
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <BlurFade delay={0.05}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-elev px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            <Award className="h-3 w-3 text-accent" />
            Bulk certificate generator
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Generate e-certificates
          </h1>
        </BlurFade>
        <BlurFade delay={0.15}>
          <p className="mt-3 max-w-2xl text-sm text-fg-muted sm:text-base">
            Design once, generate hundreds. Each recipient gets a personalised PDF stored on our
            servers, plus a public verification link.
          </p>
        </BlurFade>

        <BlurFade delay={0.22}>
          <div className="mt-10">
            <CertificateBuilder generate={generate} sendBatch={sendBatch} />
          </div>
        </BlurFade>
      </main>
    </div>
  )
}
