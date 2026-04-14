#!/usr/bin/env bash
# Upload all lesson video.{en,ar}.mp4 files to Supabase Storage
# and update the CurriculumLesson.videoUrl in the DB.
#
# Usage: bash scripts/upload-videos.sh

set -euo pipefail

SUPA_URL="https://hksvuuuikecntossgkhp.supabase.co"
SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrc3Z1dXVpa2VjbnRvc3Nna2hwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU0MzkxMSwiZXhwIjoyMDkxMTE5OTExfQ.-c78csV6QXrYro4b4qPTplvHk167D_B9iEaeVIVpkLY"
BUCKET="lesson-videos"
BASE_DIR="contexts/curriculum/seed"
PUBLIC_BASE="$SUPA_URL/storage/v1/object/public/$BUCKET"

uploaded=0
failed=0

for mp4 in $(find "$BASE_DIR" -name "video.en.mp4" -o -name "video.ar.mp4" 2>/dev/null); do
  # e.g. contexts/curriculum/seed/india/generated/in-intro-what-is-accounting/video.en.mp4
  # → storage path: india/in-intro-what-is-accounting/en.mp4
  market=$(echo "$mp4" | sed -E 's|.*/seed/([^/]+)/.*|\1|')
  slug=$(echo "$mp4" | sed -E 's|.*/generated/([^/]+)/.*|\1|')
  lang=$(echo "$mp4" | sed -E 's|.*video\.(en|ar)\.mp4|\1|')
  storage_path="$market/$slug/$lang.mp4"

  # Upload via Supabase Storage REST API
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$SUPA_URL/storage/v1/object/$BUCKET/$storage_path" \
    -H "Authorization: Bearer $SUPA_KEY" \
    -H "Content-Type: video/mp4" \
    -H "x-upsert: true" \
    --data-binary "@$mp4" 2>&1)

  if [[ "$status" == "200" || "$status" == "201" ]]; then
    echo "✓ $storage_path"
    ((uploaded++)) || true
  else
    echo "✗ $storage_path (HTTP $status)"
    ((failed++)) || true
  fi
done

echo ""
echo "Uploaded: $uploaded  Failed: $failed"
echo ""
echo "Public base URL: $PUBLIC_BASE/<market>/<slug>/<lang>.mp4"
