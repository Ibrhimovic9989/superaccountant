/**
 * Generic Tool interface — modelled directly on Claude Code's `src/Tool.ts`.
 *
 * Every capability the agent can invoke is a Tool. Per CLAUDE.md §4.2:
 *  - one folder per tool
 *  - strict Zod input schema
 *  - declarative permissions
 *  - injectable extra system prompt
 *  - lifecycle: checkPermissions -> call -> render result
 */

import type { z } from 'zod'

export type ToolContext = {
  /** Unique id for the current agent run; used for caching, tracing, logs. */
  runId: string
  /** Caller-provided arbitrary context (student id, session id, locale, etc.). */
  meta: Record<string, unknown>
  /** Append a structured progress event the UI / CLI can render. */
  onProgress?: (event: { tool: string; message: string; data?: unknown }) => void
  /** Abort signal — every long-running tool must check this. */
  signal?: AbortSignal
}

export type PermissionResult =
  | { behavior: 'allow' }
  | { behavior: 'deny'; reason: string }
  | { behavior: 'ask'; prompt: string }

export type ToolResult<Output> =
  | {
      ok: true
      output: Output
      usage?: { tokensIn?: number; tokensOut?: number; costUsd?: number }
    }
  | { ok: false; error: string; retryable: boolean }

export interface Tool<TInput, TOutput> {
  /** Stable identifier exposed to the model. snake_case. */
  readonly name: string
  /** Description shown to the model. Drives tool selection. */
  description(): string
  /** Strict Zod schema. No unknown keys.
   *  Loosened to ZodType<any,any,any> so tools may use .default() / .preprocess()
   *  without forcing TInput to match the *input* side of the schema. */
  // biome-ignore lint/suspicious/noExplicitAny: schema variance, see comment above
  readonly inputSchema: z.ZodType<TInput, any, any>
  /** Optional extra system-prompt fragment injected when this tool is enabled. */
  prompt?(): string
  /** Permission gate — runs BEFORE call(). */
  checkPermissions?(input: TInput, ctx: ToolContext): Promise<PermissionResult>
  /** Whether multiple invocations of this tool may run concurrently for the same run. */
  isConcurrencySafe?(input: TInput): boolean
  /** Whether this tool mutates external state. Used by plan mode. */
  isReadOnly?(input: TInput): boolean
  /** The actual work. */
  call(input: TInput, ctx: ToolContext): Promise<ToolResult<TOutput>>
}
