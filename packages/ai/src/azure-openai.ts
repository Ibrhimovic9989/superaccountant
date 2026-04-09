import { AzureOpenAI } from 'openai'
import { loadEnv } from '@sa/config'

export type AzureChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

let client: AzureOpenAI | null = null

export function azureOpenAI(): AzureOpenAI {
  if (client) return client
  const env = loadEnv()
  client = new AzureOpenAI({
    endpoint: env.AZURE_OPENAI_ENDPOINT,
    apiKey: env.AZURE_OPENAI_API_KEY,
    apiVersion: env.AZURE_OPENAI_API_VERSION,
    deployment: env.AZURE_OPENAI_DEPLOYMENT,
  })
  return client
}
