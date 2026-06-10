/**
 * @sa/ai — provider-agnostic AI clients.
 *
 * After the 2026-06 budget swap:
 *   - Chat → OpenRouter (Qwen3-Coder primary + DeepSeek / Llama / Gemini
 *     fallbacks). All free-tier.
 *   - Embeddings → Jina v3 at 1024-d (was Azure 1536-d). pgvector
 *     columns have been migrated; old embeddings dropped.
 *   - OCR → Azure Document Intelligence (kept; sponsorship-disabled
 *     but the OCR endpoint is on a different sub that's still live).
 *   - TTS (azure-speech) → kept stub-callable; the calls now degrade
 *     gracefully when the Azure key is absent.
 *   - Perplexity → kept ONLY for the SEO writer's web research. Not
 *     used as an embedding fallback (Perplexity has no embed endpoint).
 *
 * Surface: `chat()` and `embed()` are the canonical interface. The
 * `azureOpenAI()` export is a back-compat shim that routes through
 * the new providers without callsite changes — slated for deletion
 * once the 15 callsites migrate to the canonical interface.
 */

export { chat, type ChatMessage, type ChatRequest, type ChatResponse } from './chat'
export { embed, EMBEDDING_DIMS, type EmbedKind } from './embed'
export { azureOpenAI, type AzureChatMessage, type AzureOpenAILike } from './azure-openai'
export { azureSpeech } from './azure-speech'
export { perplexity, type PerplexityCitation } from './perplexity'
export { documentIntelligence } from './document-intelligence'
