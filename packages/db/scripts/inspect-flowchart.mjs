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

const lessons = await p.curriculumLesson.findMany({
  select: { slug: true, flowchartMermaid: true },
  where: { flowchartMermaid: { not: null } },
})

let bad = 0
for (const l of lessons) {
  const src = l.flowchartMermaid ?? ''
  // Check for things that break mermaid: <br/>, |Pipe| labels, etc.
  const issues = []
  if (src.includes('<br/>')) issues.push('<br/>')
  if (src.includes('<br>')) issues.push('<br>')
  if (src.match(/-->\s*\|/)) issues.push('arrow-pipe label')
  if (src.includes('—>')) issues.push('em-dash arrow')
  if (issues.length) {
    bad++
    console.log(`${l.slug} : ${issues.join(', ')}`)
  }
}
console.log(`\n${bad} of ${lessons.length} flowcharts have issues.`)
await p.$disconnect()
