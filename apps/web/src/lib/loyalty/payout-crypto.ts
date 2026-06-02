import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { loadEnv } from '@sa/config'

/**
 * AES-256-GCM at-rest encryption for bank-account details on
 * LoyaltyPayoutRequest rows.
 *
 * Key derivation: SHA-256(NEXTAUTH_SECRET) → 32 bytes. Reusing the auth
 * secret here is intentional — it's already at the maximum trust tier
 * in the env (rotating it would invalidate sessions, so it's treated
 * with the same care as a database key). When NEXTAUTH_SECRET rotates
 * we'd need a re-encryption pass; for the MVP that's a known tradeoff.
 *
 * Wire format (JSON, base64-armored):
 *   {"v":1,"iv":"<base64>","tag":"<base64>","ct":"<base64>"}
 * A version field future-proofs us against algorithm changes.
 */

export type BankDetails = {
  accountHolderName: string
  ifsc: string
  accountNumber: string
  bankName: string
  /** UPI fallback — optional. Useful when the bank rail fails. */
  upiId?: string
}

const VERSION = 1
const IV_BYTES = 12 // GCM standard nonce length

function getKey(): Buffer {
  const env = loadEnv()
  return createHash('sha256').update(env.NEXTAUTH_SECRET).digest()
}

export function encryptBankDetails(details: BankDetails): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const plaintext = Buffer.from(JSON.stringify(details), 'utf8')
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return JSON.stringify({
    v: VERSION,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ct.toString('base64'),
  })
}

export function decryptBankDetails(packed: string): BankDetails {
  const parsed = JSON.parse(packed) as {
    v?: number
    iv?: string
    tag?: string
    ct?: string
  }
  if (parsed.v !== VERSION || !parsed.iv || !parsed.tag || !parsed.ct) {
    throw new Error('[payout-crypto] malformed ciphertext envelope')
  }
  const key = getKey()
  const iv = Buffer.from(parsed.iv, 'base64')
  const tag = Buffer.from(parsed.tag, 'base64')
  const ct = Buffer.from(parsed.ct, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(pt.toString('utf8')) as BankDetails
}

/** Last-4 hint for admin queue rendering without decrypting. Safe to log. */
export function maskAccount(accountNumber: string): string {
  const tail = accountNumber.slice(-4)
  return `••••${tail}`
}
