import { createHmac, timingSafeEqual } from 'node:crypto'
import Razorpay from 'razorpay'

/**
 * Razorpay payment helpers — order creation + signature verification.
 *
 * Razorpay's API uses minor units (paise / halalas). Our DB columns
 * already store minor units, so amounts pass through unchanged.
 *
 * Signature verification follows the documented HMAC-SHA256 scheme:
 *   expected = HMAC_SHA256(orderId + '|' + paymentId, KEY_SECRET)
 *   constant-time compare against razorpay_signature
 */

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    throw new Error(
      'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — add them to .env from your Razorpay dashboard.',
    )
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

export type CreateOrderInput = {
  amountMinor: number
  currency: 'INR' | 'SAR'
  receipt: string
  notes?: Record<string, string>
}

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
}

export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  const client = getRazorpayClient()
  const order = await client.orders.create({
    amount: input.amountMinor,
    currency: input.currency,
    receipt: input.receipt.slice(0, 40), // Razorpay limit
    notes: input.notes ?? {},
  })
  return {
    id: order.id,
    amount: Number(order.amount),
    currency: String(order.currency),
    receipt: String(order.receipt ?? ''),
    status: String(order.status),
  }
}

/**
 * Verify Razorpay's HMAC signature on the (orderId, paymentId) pair.
 * Returns true if the signature is genuine — i.e. the payment really
 * succeeded for this order. Constant-time comparison.
 */
export function verifyPaymentSignature(args: {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET not set')
  }
  const payload = `${args.razorpayOrderId}|${args.razorpayPaymentId}`
  const expected = createHmac('sha256', keySecret).update(payload).digest('hex')
  const got = args.razorpaySignature
  if (expected.length !== got.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(got, 'utf8'))
  } catch {
    return false
  }
}

/** Public key id for the browser Checkout — never the secret. */
export function getPublicRazorpayKeyId(): string {
  // NEXT_PUBLIC_* is the only env Next.js ships down to the client.
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''
}
