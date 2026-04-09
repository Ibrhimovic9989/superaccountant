import { loadEnv } from '@sa/config'

export type PerplexityCitation = { title?: string; url: string }

export type PerplexityResult = {
  text: string
  citations: PerplexityCitation[]
}

/**
 * Thin Perplexity client. Used by the curriculum-generation pipeline
 * (ResearchTopicTool) to source up-to-date regulation text for India + KSA.
 */
export const perplexity = {
  async ask(prompt: string, model = 'sonar-pro'): Promise<PerplexityResult> {
    const env = loadEnv()
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      throw new Error(`[perplexity] ${res.status}: ${await res.text()}`)
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[]
      citations?: string[]
    }
    return {
      text: data.choices[0]?.message.content ?? '',
      citations: (data.citations ?? []).map((url) => ({ url })),
    }
  },
}
