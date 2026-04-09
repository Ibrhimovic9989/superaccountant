/**
 * GenerateLessonAgent — the orchestrator sub-agent that produces one lesson.
 *
 * Per CLAUDE.md §4.5 sub-agents have isolated system prompts and permission scopes.
 * This agent uses the generic agent loop in tutoring/agent/agent-loop.ts and a
 * dedicated tool registry containing only the curriculum-generation tools.
 */

import type { AgentEvent } from '../../../tutoring/agent/agent-loop'
import { runAgent } from '../../../tutoring/agent/agent-loop'
import { ToolRegistry } from '../../../tutoring/agent/tool-registry'
import { ArtifactCache } from './artifact-cache'
import { buildSystemPrompt } from './system-prompt'
import type { LessonSeedT } from './topics-loader'
import { buildResearchTopicTool } from './tools/research-topic'
import { buildDraftLessonTool } from './tools/draft-lesson'
import { buildTranslateLessonTool } from './tools/translate-lesson'
import { buildGenerateFlowchartTool } from './tools/generate-flowchart'
import { buildGenerateMindmapTool } from './tools/generate-mindmap'
import { buildGenerateAssessmentTool } from './tools/generate-assessment'
import { buildEmbedLessonTool } from './tools/embed-lesson'
import { buildWriteVideoScriptTool } from './tools/write-video-script'
import { buildSynthesizeVoiceTool } from './tools/synthesize-voice'
import { buildRenderSlidesTool } from './tools/render-slides'
import { buildAssembleVideoTool } from './tools/assemble-video'
import { buildPublishLessonTool } from './tools/publish-lesson'

export type GenerateLessonInput = {
  market: 'india' | 'ksa'
  phase: number
  module: string
  trackCode?: string
  lesson: LessonSeedT
  autoApprove?: boolean
  signal?: AbortSignal
  onProgress?: (e: { tool: string; message: string; data?: unknown }) => void
}

export async function* generateLesson(input: GenerateLessonInput): AsyncGenerator<AgentEvent> {
  const cache = new ArtifactCache(input.market, input.lesson.slug)

  const bound = { market: input.market, slug: input.lesson.slug }

  const tools = new ToolRegistry()
    .register(buildResearchTopicTool(cache))
    .register(buildDraftLessonTool(cache))
    .register(buildTranslateLessonTool(cache))
    .register(buildGenerateFlowchartTool(cache))
    .register(buildGenerateMindmapTool(cache))
    .register(buildWriteVideoScriptTool(cache))
    .register(buildSynthesizeVoiceTool(cache, bound))
    .register(buildRenderSlidesTool(cache, bound))
    .register(buildAssembleVideoTool(cache, bound))
    .register(buildGenerateAssessmentTool(cache))
    .register(buildEmbedLessonTool(cache))
    .register(buildPublishLessonTool(cache))

  const systemPrompt = buildSystemPrompt({
    market: input.market,
    phase: input.phase,
    module: input.module,
    trackCode: input.trackCode,
    lesson: input.lesson,
  })

  const initialUserMessage = `Generate the lesson "${input.lesson.slug}". Phase: ${input.phase}. Module: ${input.module}. Follow the pipeline. Start with research_topic. When you call publish_lesson, pass phase=${input.phase} and trackCode=${input.trackCode ?? '(none)'}.`

  yield* runAgent({
    systemPrompt,
    initialUserMessage,
    tools,
    ctx: {
      runId: `${input.market}-${input.lesson.slug}-${Date.now()}`,
      meta: { autoApprove: input.autoApprove ?? false },
      onProgress: input.onProgress,
      signal: input.signal,
    },
    maxTurns: 30,
  })
}
