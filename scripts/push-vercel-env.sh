#!/usr/bin/env bash
# One-shot env push to Vercel for the web app.
# Usage:
#   VERCEL_TOKEN=vcp_... bash scripts/push-vercel-env.sh
#
# Reads apps/web/.env, picks out the keys the web app actually needs, and
# pushes each one to the linked Vercel project for production scope.
#
# Idempotent — removes any existing value before re-adding so reruns work.

set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "✗ VERCEL_TOKEN not set" >&2
  exit 1
fi

ENV_FILE="apps/web/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ $ENV_FILE not found (run from repo root)" >&2
  exit 1
fi

# The keys the web app needs at runtime. Everything else (Azure OpenAI etc.)
# stays on the API VM only.
KEYS=(
  DATABASE_URL
  DIRECT_URL
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  NEXTAUTH_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  RESEND_API_KEY
  EMAIL_FROM
)

push_var() {
  local key="$1"
  local value="$2"
  vercel --token "$VERCEL_TOKEN" env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel --token "$VERCEL_TOKEN" env add "$key" production >/dev/null 2>&1
  echo "  ✓ $key"
}

echo "Pushing env vars to Vercel..."
for key in "${KEYS[@]}"; do
  value=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | sed -E "s/^${key}=//; s/^\"//; s/\"$//")
  if [[ -z "$value" ]]; then
    echo "  ⚠ $key not found in $ENV_FILE — skipping"
    continue
  fi
  push_var "$key" "$value"
done

echo ""
echo "Done."
