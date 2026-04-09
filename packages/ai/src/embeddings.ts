import { AzureOpenAI } from 'openai'
import { loadEnv } from '@sa/config'

let embedClient: AzureOpenAI | null = null

function getEmbedClient(): AzureOpenAI {
  if (embedClient) return embedClient
  const env = loadEnv()
  embedClient = new AzureOpenAI({
    endpoint: env.AZURE_OPENAI_ENDPOINT,
    apiKey: env.AZURE_OPENAI_API_KEY,
    apiVersion: env.AZURE_OPENAI_API_VERSION,
    deployment: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
  })
  return embedClient
}

/**
 * Embed one or many strings via Azure `text-embedding-3-small-2`.
 * Returns vectors of length 1536 (default for small-3).
 */
export async function embed(input: string | string[]): Promise<number[][]> {
  const env = loadEnv()
  const client = getEmbedClient()
  const res = await client.embeddings.create({
    model: env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    input: Array.isArray(input) ? input : [input],
  })
  return res.data.map((d) => d.embedding)
}
