/**
 * @sa/ai — AI clients used across web + api.
 *
 * - Azure OpenAI for chat (gpt-5.2-chat) and embeddings (text-embedding-3-small-2)
 * - Perplexity for research (curriculum sourcing)
 * - Azure Document Intelligence for OCR
 *
 * Per CLAUDE.md §10, the agent loop and tools live in apps/api/src/contexts/tutoring/.
 * This package only exposes thin, typed clients.
 */

export { azureOpenAI, type AzureChatMessage } from './azure-openai'
export { azureSpeech } from './azure-speech'
export { embed } from './embeddings'
export { perplexity, type PerplexityCitation } from './perplexity'
export { documentIntelligence } from './document-intelligence'
