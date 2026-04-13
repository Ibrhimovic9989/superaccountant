import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Response } from 'express'

/**
 * Text-to-speech endpoint using Azure Cognitive Services Speech.
 * Returns an MP3 audio stream for the given text + locale.
 *
 * GET /curriculum/speak?text=...&locale=en
 *
 * Used by the accounting visualizer to narrate transaction explanations.
 * Skips the global throttler — speech requests are lightweight and
 * the visualizer fires one per step (not abusable at scale).
 */
@Controller('curriculum')
export class SpeechController {
  @SkipThrottle()
  @Get('speak')
  async speak(
    @Query('text') text: string | undefined,
    @Query('locale') locale: string | undefined,
    @Res() res: Response,
  ) {
    if (!text || text.trim().length < 2) {
      throw new BadRequestException('text required')
    }
    if (text.length > 2000) {
      throw new BadRequestException('text too long (max 2000 chars)')
    }

    const key = process.env.AZURE_SPEECH_KEY
    const region = process.env.AZURE_SPEECH_REGION ?? 'eastus'
    const voiceEn = process.env.AZURE_SPEECH_VOICE_EN ?? 'en-IN-NeerjaNeural'
    const voiceAr = process.env.AZURE_SPEECH_VOICE_AR ?? 'ar-SA-ZariyahNeural'

    if (!key) {
      throw new BadRequestException('Azure Speech not configured')
    }

    const voice = locale === 'ar' ? voiceAr : voiceEn
    const lang = locale === 'ar' ? 'ar-SA' : 'en-IN'

    // Build SSML for natural-sounding speech
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
  <voice name="${voice}">
    <prosody rate="-10%" pitch="0%">${escapeXml(text.trim())}</prosody>
  </voice>
</speak>`

    try {
      const audioRes = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
          },
          body: ssml,
        },
      )

      if (!audioRes.ok) {
        const err = await audioRes.text().catch(() => '')
        throw new Error(`Azure Speech ${audioRes.status}: ${err}`)
      }

      const buffer = Buffer.from(await audioRes.arrayBuffer())

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h — same text = same audio
      res.end(buffer)
    } catch (err) {
      throw new BadRequestException((err as Error).message)
    }
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
