/**
 * Azure Speech Services TTS client.
 *
 * REST endpoint: https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
 * Auth: subscription key in `Ocp-Apim-Subscription-Key` header.
 *
 * Returns audio as a Buffer (mp3, 24kHz mono). Caller writes to disk.
 *
 * If AZURE_SPEECH_KEY / AZURE_SPEECH_REGION are missing, isConfigured() returns
 * false so the curriculum video pipeline can gracefully fall back to placeholder
 * URLs without hard-failing.
 */

import { loadEnv } from '@sa/config'

export const azureSpeech = {
  isConfigured(): boolean {
    const env = loadEnv()
    return Boolean(env.AZURE_SPEECH_KEY && env.AZURE_SPEECH_REGION)
  },

  async synthesize(args: { text: string; locale: 'en' | 'ar' }): Promise<Buffer> {
    const env = loadEnv()
    if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) {
      throw new Error('Azure Speech is not configured (set AZURE_SPEECH_KEY + AZURE_SPEECH_REGION)')
    }
    const voice = args.locale === 'ar' ? env.AZURE_SPEECH_VOICE_AR : env.AZURE_SPEECH_VOICE_EN
    const lang = args.locale === 'ar' ? 'ar-SA' : 'en-IN'
    const ssml = `<speak version="1.0" xml:lang="${lang}">
  <voice name="${voice}">${escapeXml(args.text)}</voice>
</speak>`

    const res = await fetch(
      `https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'superaccountant',
        },
        body: ssml,
      },
    )
    if (!res.ok) {
      throw new Error(`[azure-speech] ${res.status}: ${await res.text()}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    return buf
  },
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
