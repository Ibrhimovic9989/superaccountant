import type { Tool } from './tool'

/**
 * Registry of tools available to a single agent invocation.
 * Per CLAUDE.md §4.2 — tools are registered, not hard-coded into a dispatcher.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown, unknown>>()

  register<I, O>(tool: Tool<I, O>): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`[ToolRegistry] duplicate tool name: ${tool.name}`)
    }
    this.tools.set(tool.name, tool as Tool<unknown, unknown>)
    return this
  }

  get(name: string): Tool<unknown, unknown> | undefined {
    return this.tools.get(name)
  }

  all(): Tool<unknown, unknown>[] {
    return Array.from(this.tools.values())
  }
}
