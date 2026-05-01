/**
 * Streaming agent loop — modelled on Claude Code's QueryEngine.
 *
 * Why this file is small: per CLAUDE.md §3.4, the loop orchestrates Tools,
 * which carry the real logic. The loop must stay focused on:
 *   1. Compose system prompt
 *   2. Call Azure OpenAI with tool schemas
 *   3. Stream events
 *   4. On tool_call → permission gate → execute → feed result back
 *   5. Retry / abort / token tracking
 *
 * Bound to Azure OpenAI Chat Completions tool calling. Migrating to Anthropic
 * later means swapping this file only — Tools are framework-agnostic.
 */

import { type AzureChatMessage, azureOpenAI } from '@sa/ai'
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { Tool, ToolContext, ToolResult } from './tool'
import type { ToolRegistry } from './tool-registry'

export type AgentEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; result: ToolResult<unknown> }
  | { type: 'usage'; tokensIn: number; tokensOut: number }
  | { type: 'done'; reason: 'end_turn' | 'max_turns' | 'aborted' }
  | { type: 'error'; error: string }

export type AgentRunOptions = {
  systemPrompt: string
  initialUserMessage: string
  tools: ToolRegistry
  ctx: ToolContext
  maxTurns?: number
  temperature?: number
}

const DEFAULT_MAX_TURNS = 25

/**
 * Run the agent until completion. Yields a stream of events the caller can
 * pipe to a UI, CLI, or SSE endpoint.
 */
export async function* runAgent(opts: AgentRunOptions): AsyncGenerator<AgentEvent> {
  const { systemPrompt, initialUserMessage, tools, ctx } = opts
  const maxTurns = opts.maxTurns ?? DEFAULT_MAX_TURNS

  const messages: AzureChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: initialUserMessage },
  ]

  // Compile tool schemas once.
  const toolDefs = tools.all().map(toAzureToolDef)
  const client = azureOpenAI()

  let turn = 0
  let totalIn = 0
  let totalOut = 0

  while (turn < maxTurns) {
    if (ctx.signal?.aborted) {
      yield { type: 'done', reason: 'aborted' }
      return
    }
    turn++

    let response: Awaited<ReturnType<typeof client.chat.completions.create>>
    try {
      response = await client.chat.completions.create({
        // deployment is set on the client; the `model` arg is ignored by Azure SDK
        // but the SDK type still requires it.
        model: 'placeholder',
        messages: messages as Parameters<typeof client.chat.completions.create>[0]['messages'],
        tools: toolDefs.length ? toolDefs : undefined,
        tool_choice: toolDefs.length ? 'auto' : undefined,
      })
    } catch (err) {
      yield { type: 'error', error: (err as Error).message }
      return
    }

    const choice = response.choices[0]
    if (!choice) {
      yield { type: 'error', error: 'no choice returned from model' }
      return
    }

    if (response.usage) {
      totalIn += response.usage.prompt_tokens ?? 0
      totalOut += response.usage.completion_tokens ?? 0
      yield {
        type: 'usage',
        tokensIn: response.usage.prompt_tokens ?? 0,
        tokensOut: response.usage.completion_tokens ?? 0,
      }
    }

    const msg = choice.message
    if (msg.content) yield { type: 'text_delta', text: msg.content }

    // Push the assistant message back into history (with tool_calls intact).
    messages.push({
      role: 'assistant',
      content: msg.content ?? '',
      // biome-ignore lint/suspicious/noExplicitAny: openai SDK message shape
      ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
    } as AzureChatMessage)

    const toolCalls = msg.tool_calls ?? []
    if (toolCalls.length === 0) {
      yield { type: 'done', reason: 'end_turn' }
      return
    }

    // Execute each tool call sequentially. Concurrency-safe tools could be
    // batched, but per CLAUDE.md §4.2 we keep ordering deterministic for now.
    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue
      const toolName = tc.function.name
      const tool = tools.get(toolName)
      if (!tool) {
        const errResult: ToolResult<unknown> = {
          ok: false,
          error: `unknown tool: ${toolName}`,
          retryable: false,
        }
        yield { type: 'tool_result', tool: toolName, result: errResult }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(errResult),
        } as AzureChatMessage)
        continue
      }

      let parsed: unknown
      try {
        parsed = tool.inputSchema.parse(JSON.parse(tc.function.arguments))
      } catch (err) {
        const errResult: ToolResult<unknown> = {
          ok: false,
          error: `invalid input: ${(err as Error).message}`,
          retryable: false,
        }
        yield { type: 'tool_result', tool: toolName, result: errResult }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(errResult),
        } as AzureChatMessage)
        continue
      }

      yield { type: 'tool_call', tool: toolName, input: parsed }

      // Permission gate
      if (tool.checkPermissions) {
        const perm = await tool.checkPermissions(parsed, ctx)
        if (perm.behavior === 'deny') {
          const errResult: ToolResult<unknown> = {
            ok: false,
            error: `permission denied: ${perm.reason}`,
            retryable: false,
          }
          yield { type: 'tool_result', tool: toolName, result: errResult }
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(errResult),
          } as AzureChatMessage)
          continue
        }
        // 'ask' is for interactive sessions; in batch generation we treat
        // it as allow with a logged warning. The CLI / UI overrides this.
        if (perm.behavior === 'ask') {
          ctx.onProgress?.({
            tool: toolName,
            message: `permission ask (auto-allowed in batch): ${perm.prompt}`,
          })
        }
      }

      // Execute
      let result: ToolResult<unknown>
      try {
        result = await tool.call(parsed, ctx)
      } catch (err) {
        result = {
          ok: false,
          error: (err as Error).message,
          retryable: true,
        }
      }
      yield { type: 'tool_result', tool: toolName, result }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      } as AzureChatMessage)
    }
  }

  yield { type: 'done', reason: 'max_turns' }
}

// ─── Tool schema serialisation ──────────────────────────────────────────────

function toAzureToolDef(tool: Tool<unknown, unknown>) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description(),
      // biome-ignore lint/suspicious/noExplicitAny: zod-to-json-schema's recursive
      // generic blows up tsc when given the loosened ZodType<any,any,any> shape.
      parameters: zodToJsonSchema(tool.inputSchema as any, {
        target: 'openApi3',
        $refStrategy: 'none',
      }) as Record<string, unknown>,
    },
  }
}
