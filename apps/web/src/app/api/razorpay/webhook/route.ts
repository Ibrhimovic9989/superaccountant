import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  markApplicationFailed,
  markApplicationPaidByWebhook,
  markApplicationRefundedByPaymentId,
} from '@/lib/cohort/store'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Razorpay webhook receiver. Razorpay POSTs every selected event here
 * with an HMAC-SHA256 signature over the raw request body, keyed by
 * the webhook secret you set in the dashboard (RAZORPAY_WEBHOOK_SECRET
 * — distinct from RAZORPAY_KEY_SECRET).
 *
 * We return 2xx fast on every authenticated delivery so Razorpay does
 * not retry. Side effects are idempotent: a paid row stays paid.
 *
 * Events we act on:
 *   payment.captured  → mark application paid  (primary path)
 *   payment.failed    → mark pending application failed
 *   refund.processed  → mark application refunded
 *   refund.created    → mark application refunded
 *
 * Everything else is acknowledged (logged) but not acted on.
 *
 * Important: read the body as raw text BEFORE parsing JSON, because
 * the signature is computed over the bytes Razorpay sent.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'webhook_misconfigured' }, { status: 500 })
  }

  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const rawBody = await request.text()

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.warn('[razorpay-webhook] bad signature')
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 })
  }

  let payload: RazorpayWebhookPayload
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const event = payload.event
  try {
    switch (event) {
      case 'payment.captured': {
        const p = payload.payload?.payment?.entity
        if (p?.order_id && p.id) {
          await markApplicationPaidByWebhook({
            razorpayOrderId: p.order_id,
            razorpayPaymentId: p.id,
          })
        }
        break
      }
      case 'payment.failed': {
        const p = payload.payload?.payment?.entity
        if (p?.order_id) {
          await markApplicationFailed(p.order_id)
        }
        break
      }
      case 'refund.created':
      case 'refund.processed': {
        const r = payload.payload?.refund?.entity
        if (r?.payment_id) {
          await markApplicationRefundedByPaymentId(r.payment_id)
        }
        break
      }
      default:
        // Acknowledge unknown / unhandled events so Razorpay doesn't retry.
        break
    }
  } catch (err) {
    // Log but still 200 — Razorpay will retry up to 24h on non-2xx, and
    // a transient DB blip shouldn't cause a stampede. Re-issue via the
    // dashboard if needed.
    console.error('[razorpay-webhook] handler error', { event, err })
  }

  return NextResponse.json({ ok: true })
}

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (expected.length !== signature.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
  } catch {
    return false
  }
}

type RazorpayWebhookPayload = {
  event: string
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
        status?: string
      }
    }
    refund?: {
      entity?: {
        id?: string
        payment_id?: string
        status?: string
      }
    }
  }
}
