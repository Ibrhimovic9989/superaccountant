/**
 * TutoringAgent — the student-facing sub-agent.
 *
 * Reuses the generic agent loop in tutoring/agent/agent-loop.ts and adds the
 * RAG-grounded tutor tool set. Per CLAUDE.md §4.5, sub-agents have isolated
 * system prompts and permission scopes — this one cannot publish lessons or
 * issue certificates; only read curriculum, grade answers, and write memory.
 */

import type { AgentEvent } from '../../agent/agent-loop'
import { runAgent } from '../../agent/agent-loop'
import { ToolRegistry } from '../../agent/tool-registry'
import type {
  CurriculumSearchPort,
  MasteryPort,
  SessionMemoryPort,
  TutoringSessionContext,
  UserProfilePort,
} from '../../domain/session'
import { buildTutorSystemPrompt } from './system-prompt'
import { buildAssessAnswerTool } from './tools/assess-answer'
import { buildGeneratePracticeQuestionTool } from './tools/generate-practice-question'
import { buildRecommendNextLessonTool } from './tools/recommend-next-lesson'
import { buildRecordSessionMemoryTool } from './tools/record-session-memory'
import { buildSearchCurriculumTool } from './tools/search-curriculum'
import { buildSearchStatutesTool } from './tools/search-statutes'

export type TutorRunInput = {
  session: TutoringSessionContext
  userMessage: string
  signal?: AbortSignal
  onProgress?: (e: { tool: string; message: string; data?: unknown }) => void
}

export type TutorPorts = {
  search: CurriculumSearchPort
  memory: SessionMemoryPort
  mastery: MasteryPort
  profile: UserProfilePort
}

export class TutoringAgent {
  constructor(private readonly ports: TutorPorts) {}

  async *run(input: TutorRunInput): AsyncGenerator<AgentEvent> {
    const { session } = input

    // Load memory + profile in parallel — both inline into the system prompt.
    // Mirrors Claude Code's per-turn memdir load.
    const [memories, profile] = await Promise.all([
      this.ports.memory.list(session.sessionId),
      this.ports.profile.getStudentProfile(session.userId),
    ])

    const tools = new ToolRegistry()
      .register(
        buildSearchCurriculumTool(this.ports.search, {
          market: session.market,
          locale: session.locale,
        }),
      )
      .register(buildSearchStatutesTool({ market: session.market }))
      .register(buildAssessAnswerTool({ locale: session.locale }))
      .register(buildGeneratePracticeQuestionTool({ locale: session.locale }))
      .register(buildRecordSessionMemoryTool(this.ports.memory, { sessionId: session.sessionId }))
      .register(
        buildRecommendNextLessonTool(this.ports.mastery, {
          userId: session.userId,
          market: session.market,
        }),
      )

    const systemPrompt = buildTutorSystemPrompt({
      market: session.market,
      locale: session.locale,
      sessionId: session.sessionId,
      userId: session.userId,
      currentLessonSlug: session.currentLessonSlug,
      goal: session.goal,
      memories,
      profile,
    })

    yield* runAgent({
      systemPrompt,
      initialUserMessage: input.userMessage,
      tools,
      ctx: {
        runId: `${session.sessionId}-${Date.now()}`,
        meta: {
          userId: session.userId,
          sessionId: session.sessionId,
          locale: session.locale,
          market: session.market,
        },
        onProgress: input.onProgress,
        signal: input.signal,
      },
      maxTurns: 20,
      temperature: 0.3,
    })
  }
}
