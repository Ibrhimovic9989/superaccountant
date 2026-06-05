'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin-gate'
import {
  archivePost,
  createPost,
  publishPost,
  updatePost,
} from '@/lib/blog/store'
import {
  createPostSchema,
  parseKeywords,
  updatePostSchema,
} from '@/lib/blog/validation'

/**
 * Server actions for the admin post forms. All gated through
 * requireAdmin() at the top so a leaked action URL can't be hit by
 * an unauthenticated client.
 */

function readForm(formData: FormData) {
  return {
    slug: String(formData.get('slug') ?? '').trim(),
    titleEn: String(formData.get('titleEn') ?? '').trim(),
    subtitleEn: (String(formData.get('subtitleEn') ?? '').trim() || null) as string | null,
    metaDescriptionEn: String(formData.get('metaDescriptionEn') ?? '').trim(),
    contentEnMdx: String(formData.get('contentEnMdx') ?? ''),
    heroImageUrl: (String(formData.get('heroImageUrl') ?? '').trim() || null) as string | null,
    market: String(formData.get('market') ?? 'global') as 'india' | 'ksa' | 'global',
    targetKeywords: parseKeywords(String(formData.get('targetKeywords') ?? '')),
  }
}

export async function createDraftAction(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin()
  const parsed = createPostSchema.parse(readForm(formData))
  const created = await createPost({ ...parsed, authorHumanUserId: userId, status: 'draft' })
  revalidatePath('/admin')
  revalidatePath('/admin/posts')
  redirect(`/admin/posts/${created.id}/edit`)
}

export async function createAndPublishAction(formData: FormData): Promise<void> {
  const { userId } = await requireAdmin()
  const parsed = createPostSchema.parse(readForm(formData))
  const created = await createPost({
    ...parsed,
    authorHumanUserId: userId,
    status: 'published',
  })
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/posts')
  revalidatePath(`/${created.slug}`)
  redirect(`/admin/posts/${created.id}`)
}

export async function updateDraftAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()
  const parsed = updatePostSchema.parse(readForm(formData))
  await updatePost(id, parsed)
  revalidatePath('/admin/posts')
  revalidatePath(`/admin/posts/${id}/edit`)
  revalidatePath(`/${parsed.slug}`)
}

export async function publishAction(id: string, formData: FormData): Promise<void> {
  await requireAdmin()
  // Save form contents first, then flip status — so "Publish" doesn't
  // require a separate Save click.
  const parsed = updatePostSchema.parse(readForm(formData))
  await updatePost(id, parsed)
  const published = await publishPost(id)
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/posts')
  if (published) revalidatePath(`/${published.slug}`)
  redirect(`/admin/posts/${id}`)
}

export async function archiveAction(id: string): Promise<void> {
  await requireAdmin()
  const archived = await archivePost(id)
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/posts')
  if (archived) revalidatePath(`/${archived.slug}`)
  redirect('/admin/posts')
}
