import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { resolveTemplate } from './templates'
import type { CertificateData, CertificateTemplate } from './templates/types'

/**
 * Certificate render orchestrator.
 *
 * Thin facade: looks up the requested design in the template registry
 * (`./templates/index.ts`) and renders it to a Node Buffer. Adding new
 * designs never touches this file — only `./templates/`.
 *
 * Backwards-compat: callers that pass a `CertificateTemplate` without a
 * `templateId` get the original `classic-navy` design, which is the
 * verbatim port of the previous single-template layout.
 */
void React

// Public re-exports preserved so existing imports keep working.
export type { CertificateData, CertificateTemplate } from './templates/types'
export type { TemplateId, TemplateInfo } from './templates/types'
export { TEMPLATE_REGISTRY, ALL_TEMPLATES, DEFAULT_TEMPLATE_ID } from './templates'

/** Render a single certificate to a Node Buffer. Server-side only. */
export async function renderCertificateBuffer(
  template: CertificateTemplate,
  data: CertificateData,
): Promise<Buffer> {
  const { Component } = resolveTemplate(template.templateId)
  const doc = <Component template={template} data={data} />
  const stream = await pdf(doc).toBuffer()
  return await streamToBuffer(stream as unknown as NodeJS.ReadableStream)
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolveP, rejectP) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolveP(Buffer.concat(chunks)))
    stream.on('error', rejectP)
  })
}
