/**
 * Single source of truth for the Superaccountant brand assets.
 *
 * The logo is hosted on Supabase Storage so we can swap it without a
 * redeploy. Reference `LOGO_URL` everywhere the mark is rendered — web
 * nav, auth shell, search hero, certificate PDFs, etc. — so any future
 * brand refresh is a one-line change.
 */

export const LOGO_URL =
  'https://nmiiqyfwvbcvtwumtwil.supabase.co/storage/v1/object/public/logo/WhatsApp_Image_2026-05-09_at_11.23.21-removebg-preview.png'

export const BRAND_NAME = 'Superaccountant'
