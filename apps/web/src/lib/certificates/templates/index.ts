import { ClassicNavyTemplate } from './classic-navy'
import { OrnateCreamTemplate } from './ornate-cream'
import { TechCertAwsTemplate } from './tech-cert-aws'
import { TechCertAzureTemplate } from './tech-cert-azure'
import { TechCertGcpTemplate } from './tech-cert-gcp'
import type { TemplateId, TemplateInfo } from './types'

/**
 * Certificate template catalogue.
 *
 * OCP: adding a new template id requires one new file + one entry in
 * `TEMPLATE_REGISTRY`. The orchestrator in `../pdf-template.tsx` never
 * touches dispatch logic again — it just looks up by id and falls back
 * to `classic-navy` on unknown ids.
 */
export const TEMPLATE_REGISTRY: Record<TemplateId, TemplateInfo> = {
  'classic-navy': {
    id: 'classic-navy',
    name: 'Classic Navy',
    description: 'The original SuperAccountant design — clean navy on white.',
    Component: ClassicNavyTemplate,
  },
  'ornate-cream': {
    id: 'ornate-cream',
    name: 'Ornate Cream',
    description: 'Warm cream with double navy frame, gold corner ornaments and ribbon medallion.',
    recommended: 'Program completions',
    Component: OrnateCreamTemplate,
  },
  'tech-cert-aws': {
    id: 'tech-cert-aws',
    name: 'Tech Cert · AWS-style',
    description: 'Minimal white page with orange top stripe and hex badge.',
    Component: TechCertAwsTemplate,
  },
  'tech-cert-azure': {
    id: 'tech-cert-azure',
    name: 'Tech Cert · Azure-style',
    description: 'Microsoft-blue side strip with clinical centred content and check badge.',
    Component: TechCertAzureTemplate,
  },
  'tech-cert-gcp': {
    id: 'tech-cert-gcp',
    name: 'Tech Cert · GCP-style',
    description: 'Google brand-coloured diagonal corner decor with minimal geometry.',
    Component: TechCertGcpTemplate,
  },
}

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic-navy'

/** Defensive lookup: returns the requested template, or `classic-navy`
 *  for an unknown id (e.g. a legacy row in the DB referencing a deleted
 *  design). Never returns null. */
export function resolveTemplate(id: TemplateId | string | undefined | null): TemplateInfo {
  if (id && id in TEMPLATE_REGISTRY) {
    return TEMPLATE_REGISTRY[id as TemplateId]
  }
  return TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID]
}

export const ALL_TEMPLATES: TemplateInfo[] = Object.values(TEMPLATE_REGISTRY)
