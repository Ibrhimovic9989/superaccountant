# Azure deployment — `@sa/api`

The NestJS API runs on a single Ubuntu 24.04 VM behind nginx, with a free
Let's Encrypt certificate. systemd keeps the process up across crashes and
reboots. Cost: ~$30/month for a `Standard_B2s` (2 vCPU / 4 GB).

The web + marketing apps deploy to **Vercel** — see the root README for
that side. The API does not run on Vercel because Vercel functions cap
streaming at 5 minutes (the tutor SSE stream needs more) and don't run
long-lived processes.

```
infra/azure/
├── provision.sh                 ← creates Azure resources (one-time)
├── bootstrap-vm.sh              ← installs the runtime on the VM (one-time)
├── update.sh                    ← re-deploys after a code change
├── nginx-site.conf              ← reverse proxy config
├── superaccountant-api.service  ← systemd unit
└── README.md                    ← this file
```

---

## First-time deploy (run once)

### 0. Prerequisites

```bash
# Azure CLI on Windows
winget install Microsoft.AzureCLI

# Add to PATH for the current shell (if winget doesn't do it for you)
export PATH="$PATH:/c/Program Files/Microsoft SDKs/Azure/CLI2/wbin"

# Login (device-code flow — paste the code into your browser)
az login --use-device-code

# Confirm the right subscription is selected
az account show
```

### 1. Provision the Azure resources

```bash
chmod +x infra/azure/provision.sh
./infra/azure/provision.sh
```

This creates:
- Resource group `superaccountant-rg`
- VM `superaccountant-api` (`Standard_B2s`, Ubuntu 24.04)
- Public IP with DNS label → `superaccountant-api.eastus.cloudapp.azure.com`
- Network security rules for ports 22 / 80 / 443
- An SSH keypair in `~/.ssh/id_rsa` if you don't have one

The script prints the public IP at the end. Copy it.

### 2. Bootstrap the VM

```bash
chmod +x infra/azure/bootstrap-vm.sh
./infra/azure/bootstrap-vm.sh <PUBLIC_IP_FROM_STEP_1>
```

This SSHes onto the VM and:
- Installs Node 20 LTS, pnpm 9, nginx, certbot
- Clones https://github.com/Ibrhimovic9989/superaccountant.git
- Runs `pnpm install` and `pnpm --filter @sa/api build`
- Installs the systemd unit (`superaccountant-api.service`)
- Installs the nginx reverse proxy
- Requests a Let's Encrypt cert for the FQDN
- Starts the API

The API will return 503 / 502 until step 3 (no .env yet — that's expected).

### 3. Upload the production `.env`

```bash
scp .env azureuser@<PUBLIC_IP>:/home/azureuser/superaccountant/.env
ssh azureuser@<PUBLIC_IP> sudo systemctl restart superaccountant-api
```

The API loads its env from the repo-root `.env` via `apps/api/src/main.ts`,
so this single file is all you need to copy. **Make sure the `NEXTAUTH_URL`
and `ALLOWED_ORIGINS` values point at your real Vercel domains** —
otherwise CORS will reject the web app.

`ALLOWED_ORIGINS` is a comma-separated list, e.g.:

```
ALLOWED_ORIGINS=https://app.superaccountant.in,https://www.superaccountant.in
```

Vercel preview deployments (`*.vercel.app`) are auto-allowed by the CORS
helper in `main.ts` so you don't need to list them.

### 4. Verify

```bash
curl https://superaccountant-api.eastus.cloudapp.azure.com/health
# → {"ok":true,"ts":"2026-04-08T...","service":"@sa/api"}
```

You should also be able to hit `/tutor/ask` from the web app once you set
`NEXT_PUBLIC_API_URL=https://superaccountant-api.eastus.cloudapp.azure.com`
in the Vercel project settings.

---

## Subsequent deploys

For every code change after the initial bootstrap:

```bash
git push origin main             # push your changes
./infra/azure/update.sh <PUBLIC_IP_OR_FQDN>
```

`update.sh` SSHes in, pulls the latest commit, runs `pnpm install`, builds
the API, and restarts the systemd service. Total time: ~30 seconds.

If you change shared workspace packages (`@sa/db`, `@sa/email`, etc.) the
update script handles it automatically since it runs `pnpm install` from
the repo root.

---

## Operations

### Watch logs

```bash
ssh azureuser@<PUBLIC_IP> sudo journalctl -u superaccountant-api -f
```

### Restart the service

```bash
ssh azureuser@<PUBLIC_IP> sudo systemctl restart superaccountant-api
```

### Service status

```bash
ssh azureuser@<PUBLIC_IP> sudo systemctl status superaccountant-api --no-pager -l
```

### Renew the SSL cert manually
Certbot installs a systemd timer that renews automatically every 60 days.
To force a renewal:

```bash
ssh azureuser@<PUBLIC_IP> sudo certbot renew --force-renewal
```

---

## Scaling up later

### More CPU / RAM
```bash
az vm deallocate -g superaccountant-rg -n superaccountant-api
az vm resize     -g superaccountant-rg -n superaccountant-api --size Standard_B4ms  # 4 vCPU / 16 GB
az vm start      -g superaccountant-rg -n superaccountant-api
```

### More disk
```bash
az vm deallocate -g superaccountant-rg -n superaccountant-api
DISK=$(az vm show -g superaccountant-rg -n superaccountant-api --query storageProfile.osDisk.name -o tsv)
az disk update   -g superaccountant-rg -n "$DISK" --size-gb 64
az vm start      -g superaccountant-rg -n superaccountant-api
ssh azureuser@<PUBLIC_IP> 'sudo growpart /dev/sda 1 && sudo resize2fs /dev/sda1'
```

### Custom domain (e.g. `api.superaccountant.in`)
1. In your DNS provider, create a CNAME from `api.superaccountant.in` to
   `superaccountant-api.eastus.cloudapp.azure.com`.
2. Re-run certbot with the new domain:
   ```bash
   sudo certbot --nginx -d api.superaccountant.in --non-interactive --agree-tos -m ibrahimshaheer75@gmail.com --redirect
   ```
3. Update `ALLOWED_ORIGINS` and `NEXT_PUBLIC_API_URL` to use the custom
   domain.

---

## Tearing it down

```bash
az group delete --name superaccountant-rg --yes --no-wait
```

This deletes the VM, IP, disk, NIC, NSG, and the resource group itself.
Nothing else in your subscription is touched.
