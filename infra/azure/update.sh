#!/usr/bin/env bash
#
# Re-deploys the API to an existing VM.
# Pulls latest from main, rebuilds, restarts the service.
#
# Usage:
#   ./infra/azure/update.sh <PUBLIC_IP_OR_FQDN>
#
# This is what you'll run for every subsequent deploy after the initial bootstrap.

set -euo pipefail

[[ $# -ge 1 ]] || { echo "Usage: $0 <PUBLIC_IP_OR_FQDN>"; exit 1; }
HOST="$1"
ADMIN_USER="${ADMIN_USER:-azureuser}"

ssh "${ADMIN_USER}@${HOST}" 'bash -s' <<'REMOTE'
set -euo pipefail
cd ~/superaccountant
echo "▸ git pull"
git pull --ff-only
echo "▸ pnpm install"
pnpm install --frozen-lockfile=false
echo "▸ regenerate prisma client"
pnpm --filter @sa/db generate || true
echo "▸ build api"
pnpm --filter @sa/api build
echo "▸ restart service"
sudo systemctl restart superaccountant-api
sleep 1
sudo systemctl status superaccountant-api --no-pager -l | head -n 15
REMOTE

echo "✓ update complete"
