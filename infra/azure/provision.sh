#!/usr/bin/env bash
#
# Provisions Azure infrastructure for the SuperAccountant API.
#
# What this creates:
#   - Resource group
#   - Ubuntu 24.04 VM (Standard_B2s by default — cheap, plenty for the API)
#   - Public IP with a DNS name (so we get a free *.cloudapp.azure.com hostname)
#   - Network rules for ports 22, 80, 443
#
# After this script finishes, run ./bootstrap-vm.sh to install the runtime
# on the VM and start the API.
#
# Usage:
#   chmod +x infra/azure/provision.sh
#   ./infra/azure/provision.sh
#
# Requires: az CLI logged in (az login --use-device-code)

set -euo pipefail

# ─── Config (edit these once if you want different names) ────────────
RG="superaccountant-rg"
LOCATION="eastus"
VM_NAME="superaccountant-api"
VM_SIZE="Standard_B2s"          # 2 vCPU / 4 GB / ~$30/mo
ADMIN_USER="azureuser"
DNS_LABEL="superaccountant-api"  # → superaccountant-api.eastus.cloudapp.azure.com
IMAGE="Canonical:ubuntu-24_04-lts:server:latest"

# ─── Helpers ─────────────────────────────────────────────────────────
log()  { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

command -v az >/dev/null 2>&1 || fail "Azure CLI not installed. winget install Microsoft.AzureCLI"
az account show >/dev/null 2>&1 || fail "Not logged in. Run: az login --use-device-code"

SUB=$(az account show --query name -o tsv)
log "Using subscription: $SUB"

# ─── 1. Resource group ───────────────────────────────────────────────
log "Creating resource group $RG in $LOCATION…"
az group create --name "$RG" --location "$LOCATION" -o none
ok "Resource group ready"

# ─── 2. VM ───────────────────────────────────────────────────────────
if az vm show -g "$RG" -n "$VM_NAME" >/dev/null 2>&1; then
  ok "VM $VM_NAME already exists — skipping creation"
else
  log "Creating VM $VM_NAME ($VM_SIZE)…"
  az vm create \
    --resource-group "$RG" \
    --name "$VM_NAME" \
    --image "$IMAGE" \
    --size "$VM_SIZE" \
    --admin-username "$ADMIN_USER" \
    --generate-ssh-keys \
    --public-ip-sku Standard \
    -o none
  ok "VM created"
fi

# ─── 3. Open ports 22, 80, 443 ───────────────────────────────────────
log "Opening ports 22, 80, 443…"
az vm open-port -g "$RG" -n "$VM_NAME" --port 22  --priority 100 -o none || true
az vm open-port -g "$RG" -n "$VM_NAME" --port 80  --priority 200 -o none || true
az vm open-port -g "$RG" -n "$VM_NAME" --port 443 --priority 300 -o none || true
ok "Ports open"

# ─── 4. DNS label on the public IP ──────────────────────────────────
log "Assigning DNS label $DNS_LABEL…"
PIP_NAME=$(az network public-ip list -g "$RG" --query "[?contains(name, '$VM_NAME')].name" -o tsv | head -n1)
if [[ -z "$PIP_NAME" ]]; then
  fail "Could not find public IP for $VM_NAME"
fi
az network public-ip update -g "$RG" -n "$PIP_NAME" --dns-name "$DNS_LABEL" -o none
ok "DNS label set"

# ─── 5. Print connection info ────────────────────────────────────────
PUBLIC_IP=$(az vm show -d -g "$RG" -n "$VM_NAME" --query publicIps -o tsv)
FQDN="${DNS_LABEL}.${LOCATION}.cloudapp.azure.com"

cat <<EOF

✓ Provisioning complete

  Resource group : $RG
  VM             : $VM_NAME ($VM_SIZE)
  Public IP      : $PUBLIC_IP
  Public FQDN    : $FQDN

  SSH:           ssh ${ADMIN_USER}@${PUBLIC_IP}
  HTTPS (after bootstrap): https://${FQDN}

Next:
  1. Edit infra/azure/bootstrap-vm.sh — fill in your domain + email if you
     want a Let's Encrypt cert with a different domain.
  2. Run: ./infra/azure/bootstrap-vm.sh ${PUBLIC_IP}

EOF
