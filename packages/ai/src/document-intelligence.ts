import { loadEnv } from '@sa/config'

/**
 * Azure Document Intelligence — OCR for scanned PDFs / images.
 * Used by the curriculum pipeline (ingest scanned regs) and by
 * student tools (parse uploaded worksheets / invoices).
 *
 * Uses the prebuilt-layout model by default.
 */
export const documentIntelligence = {
  async analyzeUrl(url: string, modelId = 'prebuilt-layout'): Promise<unknown> {
    const env = loadEnv()
    const apiVersion = '2024-11-30'
    const endpoint = `${env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}/documentintelligence/documentModels/${modelId}:analyze?api-version=${apiVersion}`

    const start = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urlSource: url }),
    })
    if (!start.ok) throw new Error(`[doc-intel] start ${start.status}: ${await start.text()}`)

    const operationLocation = start.headers.get('operation-location')
    if (!operationLocation) throw new Error('[doc-intel] missing operation-location header')

    // Poll
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const poll = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_DOCUMENT_INTELLIGENCE_KEY },
      })
      const data = (await poll.json()) as { status: string; analyzeResult?: unknown }
      if (data.status === 'succeeded') return data.analyzeResult
      if (data.status === 'failed') throw new Error('[doc-intel] analyze failed')
    }
    throw new Error('[doc-intel] poll timeout')
  },
}
