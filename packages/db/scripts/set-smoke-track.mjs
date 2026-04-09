import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()
const u = await p.identityUser.update({
  where: { email: 'smoke@example.com' },
  data: { preferredTrack: 'india', emailVerified: new Date(), emailVerifiedAt: new Date() },
})
console.log('updated', u.id, u.preferredTrack)
await p.$disconnect()
