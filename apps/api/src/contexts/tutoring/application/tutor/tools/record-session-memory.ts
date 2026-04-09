import { z } from 'zod'
import type { Tool } from '../../../agent/tool'
import type { SessionMemoryPort } from '../../../domain/session'

const Input = z.object({
  kind: z.enum(['student', 'course', 'scratch']).describe(
    'student = stable facts about the learner (strengths, weaknesses, accommodations). course = notes about the lesson/module they\'re working through. scratch = ephemeral working notes.',
  ),
  bodyMd: z.string().min(1).describe('The full memory body in markdown. Overwrites any existing memory of the same kind for this session.'),
})

export type RecordMemoryOutput = { id: string; kind: string }

/**
 * Records a memory note. Mirrors Claude Code's `memdir/` pattern (CLAUDE.md §4.4):
 * memory is files-first, one body per (sessionId, kind), overwritten on update.
 *
 * The agent should call this when it learns something durable about the student
 * that future turns will need (e.g. "Confused about the difference between SLM
 * and WDV depreciation"). System prompt loads these on every turn.
 */
export const buildRecordSessionMemoryTool = (
  memory: SessionMemoryPort,
  ctxFixed: { sessionId: string },
): Tool<z.infer<typeof Input>, RecordMemoryOutput> => ({
  name: 'record_session_memory',
  description() {
    return 'Record a durable memory about the student or course. Use sparingly — only for facts that will matter in future turns. Overwrites the existing memory of the same kind.'
  },
  inputSchema: Input,
  isReadOnly: () => false,
  async call(input) {
    try {
      const row = await memory.upsert({
        sessionId: ctxFixed.sessionId,
        kind: input.kind,
        bodyMd: input.bodyMd,
      })
      return { ok: true, output: { id: row.id, kind: row.kind } }
    } catch (err) {
      return { ok: false, error: (err as Error).message, retryable: true }
    }
  },
})
