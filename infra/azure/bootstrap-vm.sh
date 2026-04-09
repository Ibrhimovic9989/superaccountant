#!/usr/bin/env bash
#
# Bootstraps a freshly-provisioned Azure VM:
#   - Installs Node 20 LTS, pnpm, nginx, certbot
#   - Clones the repo
#   - Builds the API + workspace deps
#   - Installs the systemd service
#   - Configures nginx + Let's Encrypt SSL
#   - Starts the API
#
# Usage:
#   ./infra/azure/bootstrap-vm.sh <PUBLIC_IP>
#
# Then SCP your .env file:
#   scp .env azureuser@<PUBLIC_IP>:/home/azureuser/superaccountant/.env
#   ssh azureuser@<PUBLIC_IP> sudo systemctl restart superaccountant-api

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────
REPO_URL="https://github.com/Ibrhimovic9989/superaccountant.git"
REPO_DIR="superaccountant"
DOMAIN="superaccountant-api.eastus.cloudapp.azure.com"
LE_EMAIL="ibrahimshaheer75@gmail.com"
ADMIN_USER="azureuser"

# ─── Helpers ─────────────────────────────────────────────────────────
log()  { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

[[ $# -ge 1 ]] || fail "Usage: $0 <PUBLIC_IP>"
HOST="$1"

# ─── Sanity ──────────────────────────────────────────────────────────
log "SSH-ing into $HOST as $ADMIN_USER…"
ssh -o StrictHostKeyChecking=accept-new "${ADMIN_USER}@${HOST}" "echo connected" || fail "SSH failed"

# ─── Run the actual bootstrap on the VM ──────────────────────────────
log "Streaming bootstrap script to the VM…"
ssh "${ADMIN_USER}@${HOST}" "REPO_URL='${REPO_URL}' REPO_DIR='${REPO_DIR}' DOMAIN='${DOMAIN}' LE_EMAIL='${LE_EMAIL}' bash -s" <<'REMOTE'
set -euo pipefail

log() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }

# 1. System packages
log "Installing system packages…"
sudo apt-get update -qq
sudo apt-get install -y -qq curl ca-certificates git nginx certbot python3-certbot-nginx ufw

# 2. Node 20 via NodeSource
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2-3)" -lt 20 ]]; then
  log "Installing Node 20 LTS…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
node -v
npm -v

# 3. pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  log "Installing pnpm…"
  sudo npm install -g pnpm@9
fi
pnpm -v

# 4. Clone (or pull) the repo
if [[ -d "$REPO_DIR/.git" ]]; then
  log "Repo exists — pulling latest…"
  cd "$REPO_DIR"
  git pull --ff-only
  cd ~
else
  log "Cloning repo…"
  git clone "$REPO_URL" "$REPO_DIR"
fi

# 5. Install + generate Prisma client. We do NOT pre-build the API because
#    workspace packages (@sa/db etc.) are consumed as TS source — the API
#    runs via tsx in production (see superaccountant-api.service).
log "Installing dependencies…"
cd "$REPO_DIR"
pnpm install --frozen-lockfile=false
log "Generating Prisma client…"
pnpm --filter @sa/db generate || true
cd ~

# 6. systemd service
log "Installing systemd service…"
sudo cp "$REPO_DIR/infra/azure/superaccountant-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable superaccountant-api

# 7. nginx site
log "Installing nginx config…"
sudo cp "$REPO_DIR/infra/azure/nginx-site.conf" /etc/nginx/sites-available/superaccountant-api
sudo sed -i "s|__DOMAIN__|${DOMAIN}|g" /etc/nginx/sites-available/superaccountant-api
sudo ln -sf /etc/nginx/sites-available/superaccountant-api /etc/nginx/sites-enabled/superaccountant-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 8. Let's Encrypt — only if .env is already on the VM (otherwise the first
#    boot will 502 and certbot's auth probe will pass anyway).
log "Requesting Let's Encrypt cert for ${DOMAIN}…"
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${LE_EMAIL}" --redirect || true

# 9. Final start (will 503 until .env is uploaded — that's expected)
log "Starting API service…"
sudo systemctl restart superaccountant-api || true
sudo systemctl status superaccountant-api --no-pager -l || true

echo
echo "✓ VM bootstrap complete"
echo
echo "Next:"
echo "  1. Upload .env from your laptop:"
echo "       scp .env azureuser@${HOSTNAME}:/home/azureuser/$REPO_DIR/.env"
echo "  2. Restart the service:"
echo "       sudo systemctl restart superaccountant-api"
echo "  3. Tail the logs:"
echo "       sudo journalctl -u superaccountant-api -f"
echo "  4. Open https://${DOMAIN}/health"
REMOTE

cat <<EOF

✓ Bootstrap finished

Now upload your .env file:
  scp .env ${ADMIN_USER}@${HOST}:/home/${ADMIN_USER}/superaccountant/.env
  ssh ${ADMIN_USER}@${HOST} sudo systemctl restart superaccountant-api

Verify:
  curl https://${DOMAIN}/health

EOF
