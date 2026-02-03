# Moltworker Complete Setup Guide

This guide walks you through setting up moltworker (OpenClaw on Cloudflare Workers) from scratch. Follow each section in order.

---

## Prerequisites

- [ ] A Cloudflare account (free to create)
- [ ] A credit card (for Workers Paid plan - $5/month)
- [ ] An Anthropic account (for Claude API access)
- [ ] Node.js 22+ installed on your machine
- [ ] Git installed on your machine

---

## Part 1: Cloudflare Account Setup

> **Where:** Cloudflare website (browser)
> **Time:** ~10 minutes

### Step 1.1: Create Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Sign Up**
3. Enter your email and password
4. Verify your email

### Step 1.2: Enable Workers Paid Plan

Cloudflare Sandbox (containers) requires the Workers Paid plan ($5/month).

1. Go to [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. In the left sidebar, click **Plans**
3. Under "Workers Paid", click **Purchase**
4. Enter payment details and confirm

### Step 1.3: Enable Cloudflare Containers

1. Go to [Containers Dashboard](https://dash.cloudflare.com/?to=/:account/workers/containers)
2. Click **Enable Containers** (or similar button)
3. Accept any terms if prompted

### Step 1.4: Note Your Account ID

You'll need this later for R2 storage.

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click the **three dots menu (⋮)** next to your account name (top left)
3. Click **Copy Account ID**
4. Save this somewhere - you'll need it later

---

## Part 2: Anthropic API Setup

> **Where:** Anthropic website (browser)
> **Time:** ~5 minutes

### Step 2.1: Create Anthropic Account

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Add payment method if you haven't already

### Step 2.2: Create API Key

1. Go to [API Keys](https://console.anthropic.com/settings/keys)
2. Click **Create Key**
3. Name it: `moltworker`
4. Click **Create**
5. **Copy the key immediately** - you won't see it again!
6. Save it securely (password manager, etc.)

> **Note:** API usage is billed separately by Anthropic based on tokens used.

---

## Part 3: Clone and Deploy

> **Where:** Terminal (command line)
> **Time:** ~10 minutes

### Step 3.1: Clone the Repository

```bash
# Clone the repo
git clone https://github.com/cloudflare/moltworker.git
cd moltworker

# Install dependencies
npm install
```

### Step 3.2: Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser window. Log in and authorize Wrangler.

### Step 3.3: Set Required Secrets

```bash
# Set your Anthropic API key
npx wrangler secret put ANTHROPIC_API_KEY
# Paste your API key from Step 2.2 and press Enter

# Generate and set a gateway token (this protects access to your bot)
# On Mac/Linux:
export MOLTBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "Your gateway token: $MOLTBOT_GATEWAY_TOKEN"
echo "$MOLTBOT_GATEWAY_TOKEN" | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN

# On Windows (PowerShell):
# $token = -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
# Write-Host "Your gateway token: $token"
# $token | npx wrangler secret put MOLTBOT_GATEWAY_TOKEN
```

**⚠️ IMPORTANT:** Save your gateway token somewhere! You need it to access the Control UI.

### Step 3.4: Deploy

```bash
npm run deploy
```

Wait for deployment to complete. You'll see output like:

```
Published moltbot-sandbox (x.xx sec)
  https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev
```

**Save this URL** - this is your worker URL.

### Step 3.5: First Test (Will Fail - That's OK!)

Visit your worker URL with the token:

```
https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev/?token=YOUR_GATEWAY_TOKEN
```

You'll likely see an error about missing configuration. That's expected - we need to set up Cloudflare Access next.

---

## Part 4: Cloudflare Access Setup

> **Where:** Cloudflare Dashboard (browser) + Terminal
> **Time:** ~15 minutes

Cloudflare Access protects your admin UI so only you can approve devices.

### Step 4.1: Enable Access on Your Worker

1. Go to [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. Click on your worker (`moltbot-sandbox`)
3. Click **Settings** tab
4. Scroll to **Domains & Routes**
5. In the `workers.dev` row, click the **three dots menu (⋯)**
6. Click **Enable Cloudflare Access**

### Step 4.2: Configure Access Policy

1. After enabling, click **Manage Cloudflare Access**
2. You'll be taken to Zero Trust dashboard
3. Find your application and click to edit it
4. Go to **Policies** tab
5. Edit the existing policy or create one:

   | Field | Value |
   |-------|-------|
   | Policy name | `Allow Me` |
   | Action | **Allow** |
   | Session duration | `24 hours` |

6. Under **Configure rules**, add:
   - **Include** → **Emails** → Enter your email address

7. Click **Save**

### Step 4.3: Get Access Credentials

1. Still in the Access application settings
2. Go to **Overview** tab
3. Find and copy the **Application Audience (AUD)** tag
4. Save it - you'll need it in the next step

### Step 4.4: Find Your Team Domain

1. Go to [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Left sidebar: **Settings** → **Custom Pages**
3. Find your **Team domain** (e.g., `myteam.cloudflareaccess.com`)
4. The part before `.cloudflareaccess.com` is what you need (e.g., `myteam`)

### Step 4.5: Set Access Secrets (Terminal)

```bash
# Your team domain (e.g., "myteam.cloudflareaccess.com")
npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
# Enter the full domain: myteam.cloudflareaccess.com

# The Application Audience (AUD) tag you copied
npx wrangler secret put CF_ACCESS_AUD
# Paste the AUD tag and press Enter
```

### Step 4.6: Redeploy

```bash
npm run deploy
```

### Step 4.7: Test Access

1. Visit `https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev/_admin/`
2. You should see a Cloudflare Access login page
3. Enter your email
4. Check your email for a code
5. Enter the code
6. You should now see the Admin UI!

---

## Part 5: Device Pairing

> **Where:** Browser
> **Time:** ~5 minutes

### Step 5.1: Open Control UI

1. Open a new browser tab
2. Go to: `https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev/?token=YOUR_GATEWAY_TOKEN`
3. You'll see a loading screen, then a "pairing required" message

### Step 5.2: Approve Your Device

1. In another tab, go to: `https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev/_admin/`
2. Log in via Cloudflare Access if prompted
3. You should see **Pending Devices**
4. Click **Approve All** (or approve individually)

### Step 5.3: Verify Connection

1. Go back to your Control UI tab
2. Refresh the page
3. You should now see the OpenClaw chat interface!
4. Try sending a message: `Hello, who are you?`

🎉 **Basic setup complete!** But your data won't persist if the container restarts. Continue to Part 6 for persistence.

---

## Part 6: R2 Storage (Recommended)

> **Where:** Cloudflare Dashboard (browser) + Terminal
> **Time:** ~10 minutes

R2 storage saves your conversations, paired devices, and settings across container restarts.

### Step 6.1: Create R2 Bucket (Usually Automatic)

The bucket `moltbot-data` is created automatically on first deploy. Verify it exists:

1. Go to [R2 Dashboard](https://dash.cloudflare.com/?to=/:account/r2)
2. You should see `moltbot-data` bucket
3. If not, click **Create bucket** and name it `moltbot-data`

### Step 6.2: Create R2 API Token

1. In R2 Dashboard, click **Manage R2 API Tokens** (top right)
2. Click **Create API Token**
3. Configure:

   | Field | Value |
   |-------|-------|
   | Token name | `moltworker-storage` |
   | Permissions | **Object Read & Write** |
   | Specify bucket(s) | Select `moltbot-data` |
   | TTL | Optional (leave blank for no expiry) |

4. Click **Create API Token**
5. **Copy both values immediately:**
   - Access Key ID
   - Secret Access Key

   You won't see the Secret again!

### Step 6.3: Set R2 Secrets (Terminal)

```bash
# R2 Access Key ID
npx wrangler secret put R2_ACCESS_KEY_ID
# Paste the Access Key ID

# R2 Secret Access Key
npx wrangler secret put R2_SECRET_ACCESS_KEY
# Paste the Secret Access Key

# Your Cloudflare Account ID (from Step 1.4)
npx wrangler secret put CF_ACCOUNT_ID
# Paste your Account ID
```

### Step 6.4: Redeploy

```bash
npm run deploy
```

### Step 6.5: Verify R2 is Working

1. Go to Admin UI: `/_admin/`
2. You should see **R2 Storage: Connected** (or similar)
3. You can click **Backup Now** to trigger a manual sync

> **Note:** R2 syncs automatically every 5 minutes via cron job.

---

## Part 7: AI Gateway (Optional)

> **Where:** Cloudflare Dashboard (browser) + Terminal
> **Time:** ~10 minutes

AI Gateway provides caching, analytics, rate limiting, and cost tracking for your API calls. It's optional but useful.

### Step 7.1: Create AI Gateway

1. Go to [AI Gateway](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway)
2. Click **Create Gateway**
3. Enter a name: `moltworker-gateway`
4. Click **Create**

### Step 7.2: Configure Provider

1. In your new gateway, you'll see the gateway ID in the URL
2. Scroll down to **Native API/SDK Examples**
3. Expand the section
4. Select **Anthropic**
5. Copy the **Base URL** shown (looks like):
   ```
   https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/anthropic
   ```

### Step 7.3: Set AI Gateway Secrets (Terminal)

```bash
# Your Anthropic API key (same one from Part 2)
npx wrangler secret put AI_GATEWAY_API_KEY
# Paste your Anthropic API key

# The AI Gateway URL you copied
npx wrangler secret put AI_GATEWAY_BASE_URL
# Paste the full URL
```

> **Note:** When AI Gateway is configured, it takes precedence over direct `ANTHROPIC_API_KEY`.

### Step 7.4: Redeploy

```bash
npm run deploy
```

### Step 7.5: Verify AI Gateway

1. Send a message in the Control UI
2. Go to [AI Gateway Dashboard](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway)
3. Click on your gateway
4. You should see the request logged under **Logs**

---

## Part 8: Chat Channels (Optional)

> **Where:** Various platforms + Terminal
> **Time:** Varies by platform

### Telegram

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the **bot token** provided
5. Set the secret:
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npm run deploy
   ```
6. Message your bot on Telegram - it should respond!

### Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name it and create
4. Go to **Bot** tab → **Add Bot**
5. Click **Reset Token** and copy it
6. Enable **Message Content Intent** under Privileged Gateway Intents
7. Set the secret:
   ```bash
   npx wrangler secret put DISCORD_BOT_TOKEN
   npm run deploy
   ```
8. Invite bot to your server using OAuth2 URL Generator (Bot scope + Send Messages permission)

### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name it and select workspace
4. Go to **OAuth & Permissions**:
   - Add Bot Token Scopes: `chat:write`, `app_mentions:read`, `im:history`, `im:read`, `im:write`
5. Install to workspace and copy **Bot User OAuth Token**
6. Go to **Socket Mode** → Enable it
7. Generate an **App-Level Token** with `connections:write` scope
8. Set secrets:
   ```bash
   npx wrangler secret put SLACK_BOT_TOKEN    # Bot User OAuth Token
   npx wrangler secret put SLACK_APP_TOKEN    # App-Level Token
   npm run deploy
   ```

### WhatsApp (Cloud API)

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for detailed instructions.

---

## Part 9: Browser Automation (Optional)

> **Where:** Terminal
> **Time:** ~5 minutes

Enable OpenClaw to take screenshots and control a browser.

### Step 9.1: Set CDP Secrets

```bash
# Generate a random secret for CDP authentication
npx wrangler secret put CDP_SECRET
# Enter any random string (e.g., output of: openssl rand -hex 32)

# Your worker's public URL
npx wrangler secret put WORKER_URL
# Enter: https://moltbot-sandbox.YOUR-SUBDOMAIN.workers.dev
```

### Step 9.2: Redeploy

```bash
npm run deploy
```

### Step 9.3: Test Browser Automation

In the Control UI, try asking:
- "Take a screenshot of https://example.com"
- "What does the homepage of cloudflare.com look like?"

---

## Quick Reference: All Secrets

| Secret | Required | Where to get it |
|--------|----------|-----------------|
| `ANTHROPIC_API_KEY` | Yes* | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `MOLTBOT_GATEWAY_TOKEN` | Yes | Generate: `openssl rand -hex 32` |
| `CF_ACCESS_TEAM_DOMAIN` | Yes | Zero Trust Dashboard → Settings |
| `CF_ACCESS_AUD` | Yes | Access Application → Overview |
| `R2_ACCESS_KEY_ID` | Recommended | R2 → Manage API Tokens |
| `R2_SECRET_ACCESS_KEY` | Recommended | R2 → Manage API Tokens |
| `CF_ACCOUNT_ID` | Recommended | Dashboard → Account menu → Copy ID |
| `AI_GATEWAY_API_KEY` | Optional | Same as Anthropic key |
| `AI_GATEWAY_BASE_URL` | Optional | AI Gateway → Anthropic example |
| `TELEGRAM_BOT_TOKEN` | Optional | @BotFather on Telegram |
| `DISCORD_BOT_TOKEN` | Optional | Discord Developer Portal |
| `SLACK_BOT_TOKEN` | Optional | Slack API → OAuth |
| `SLACK_APP_TOKEN` | Optional | Slack API → Socket Mode |
| `CDP_SECRET` | Optional | Generate yourself |
| `WORKER_URL` | Optional | Your deployed worker URL |
| `WHATSAPP_*` | Optional | See WHATSAPP_SETUP.md |

*Or use `AI_GATEWAY_API_KEY` + `AI_GATEWAY_BASE_URL` instead

---

## Verify Everything Works

### Checklist

- [ ] Can access Control UI with gateway token
- [ ] Can log into Admin UI via Cloudflare Access
- [ ] Device is paired and approved
- [ ] Bot responds to messages
- [ ] R2 shows "Connected" in Admin UI (if configured)
- [ ] Requests appear in AI Gateway logs (if configured)

### Test Commands

```bash
# Check deployment status
npx wrangler deployments list

# View live logs
npx wrangler tail

# List all secrets (names only, not values)
npx wrangler secret list
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Unauthorized" on deploy | Run `npx wrangler login` again |
| Slow first load | Normal - cold start takes 1-2 minutes |
| "Missing configuration" | Check all required secrets are set |
| Access login loop | Clear cookies, check AUD matches |
| R2 not syncing | Verify all 3 R2 secrets are set |
| Bot not responding | Check `npx wrangler tail` for errors |
| "Container sleeping" | Send a request to wake it up |

---

## Cost Summary

| Service | Cost |
|---------|------|
| Workers Paid | $5/month |
| R2 Storage | Free tier: 10GB storage, 10M requests |
| AI Gateway | Free |
| Cloudflare Access | Free for up to 50 users |
| Anthropic API | Pay per token (~$3/M input, $15/M output for Claude 3.5) |

**Typical personal use:** ~$5-15/month depending on API usage.

---

## Next Steps

- 📱 Set up [WhatsApp integration](./WHATSAPP_SETUP.md)
- 🔧 Explore [OpenClaw Skills](https://clawhub.com)
- 📚 Read [OpenClaw Documentation](https://docs.openclaw.ai/)
- 💬 Join the community on Discord
