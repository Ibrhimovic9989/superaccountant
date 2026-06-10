/**
 * Back-compat shim. The name is historical — Azure OpenAI is gone, the
 * funding situation forced a swap to OpenRouter (chat) + Jina (embed).
 * Keeping the `azureOpenAI()` export so the 15 call-sites scattered
 * through apps/api and apps/web don't need to change in lockstep.
 *
 * The returned object mimics just enough of the OpenAI SDK surface
 * those call-sites use:
 *   - .chat.completions.create({ messages, response_format, ... })
 *   - .embeddings.create({ input })
 *
 * Anything else (streaming, file uploads, runs) will surface as a
 * runtime TypeError. None of our call-sites use those paths today.
 *
 * Future cleanup: switch each call-site to `chat()` / `embed()`
 * directly and delete this shim.
 */

import {
  chat,
  type ChatRequest,
  type ChatMessage,
  type ChatResponse,
  type ToolDef,
} from './chat'
import { embed } from './embed'

export type AzureChatMessage = ChatMessage

type ChatCompletionsCreateArgs = {
  // Legacy callers pass 'placeholder' / 'gpt-5.2-chat' here; we
  // ignore it and let chat.ts pick the active OpenRouter model.
  model?: string
  messages: ChatMessage[]
  response_format?: { type: 'text' | 'json_object' }
  max_tokens?: number
  temperature?: number
  stop?: string[] | string
  tools?: ToolDef[]
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

type EmbeddingsCreateArgs = {
  // Legacy callers pass the Azure deployment name; ignored.
  model?: string
  input: string | string[]
}

export type AzureOpenAILike = {
  chat: {
    completions: {
      create: (args: ChatCompletionsCreateArgs) => Promise<ChatResponse>
    }
  }
  embeddings: {
    create: (args: EmbeddingsCreateArgs) => Promise<{ data: Array<{ embedding: number[] }> }>
  }
}

let cached: AzureOpenAILike | null = null

export function azureOpenAI(): AzureOpenAILike {
  if (cached) return cached
  cached = {
    chat: {
      completions: {
        create: async (args) => {
          const req: ChatRequest = { messages: args.messages }
          if (args.response_format) req.response_format = args.response_format
          if (args.max_tokens != null) req.max_tokens = args.max_tokens
          if (args.temperature != null) req.temperature = args.temperature
          if (args.stop != null) req.stop = args.stop
          if (args.tools?.length) req.tools = args.tools
          if (args.tool_choice != null) req.tool_choice = args.tool_choice
          return chat(req)
        },
      },
    },
    embeddings: {
      create: async (args) => {
        const vectors = await embed(args.input)
        return { data: vectors.map((embedding) => ({ embedding })) }
      },
    },
  }
  return cached
}
