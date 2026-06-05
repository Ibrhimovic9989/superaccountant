// Idempotent admin role assignment. Run after the DB is re-seeded or
// when promoting new platform owners. Safe to re-run — only flips the
// `role` column for users who already exist.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __d = dirname(fileURLToPath(import.meta.url))
for (const line of readFileSync(resolve(__d, '../.env'), 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const { PrismaClient } = await import('@prisma/client')
const p = new PrismaClient()

const ADMIN_EMAILS = ['ibrahimshaheer75@gmail.com']

for (const email of ADMIN_EMAILS) {
  const user = await p.identityUser.findUnique({
    where: { email },
    select: { id: true, role: true, name: true },
  })
  if (!user) {
    console.log(`· ${email} not in DB yet — skipping (sign in once, then re-run)`)
    continue
  }
  if (user.role === 'admin') {
    console.log(`= ${email} already admin (${user.name ?? '(no name)'})`)
    continue
  }
  await p.identityUser.update({ where: { id: user.id }, data: { role: 'admin' } })
  console.log(`✓ ${email} promoted ${user.role} → admin (${user.name ?? '(no name)'})`)
}

await p.$disconnect()
