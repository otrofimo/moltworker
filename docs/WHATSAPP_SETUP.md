# WhatsApp Cloud API Setup Guide

This guide walks you through setting up WhatsApp Cloud API integration with moltworker. Follow each section in order.

---

## Prerequisites

- [ ] moltworker already deployed and working (you can access the Control UI)
- [ ] A phone number you can use for testing (your personal phone)
- [ ] Partner's phone number (if setting up shared access)

---

## Part 1: Meta Business Setup

> **Where:** Meta websites (browser)
> **Time:** ~15 minutes

### Step 1.1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create Account**
3. Enter:
   - Business name: Can be personal (e.g., "Oleg's Assistant")
   - Your name
   - Business email
4. Click **Submit**
5. Check your email and verify the account

### Step 1.2: Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with your Facebook account
3. Click **My Apps** (top right) → **Create App**
4. Select app type: **Other** → **Next**
5. Select: **Business** → **Next**
6. Fill in:
   - App name: `Moltworker Bot` (or whatever you like)
   - App contact email: your email
   - Business Account: select the one you just created
7. Click **Create App**

### Step 1.3: Add WhatsApp Product

1. In your app dashboard, scroll down to **Add products to your app**
2. Find **WhatsApp** and click **Set up**
3. You'll be taken to WhatsApp → **Quickstart**
4. Select your Business Account if prompted

### Step 1.4: Get Your Credentials

1. In the left sidebar, click **WhatsApp** → **API Setup**
2. You'll see a **test phone number** provided by Meta
3. **Save these values** (you'll need them later):

   | Field | Where to find it | Example |
   |-------|------------------|---------|
   | **Phone Number ID** | Under "From" phone number, click dropdown → copy ID | `123456789012345` |
   | **WhatsApp Business Account ID** | Shown at top of page | `987654321098765` |
   | **Temporary Access Token** | Click "Generate" under access token | `EAAGm0PX4ZCps...` |

### Step 1.5: Create Permanent Access Token

The temporary token expires in 24 hours. Create a permanent one:

1. Go to [Business Settings](https://business.facebook.com/settings)
2. Left sidebar: **Users** → **System Users**
3. Click **Add** to create a new system user:
   - Name: `moltworker-bot`
   - Role: **Admin**
4. Click **Create System User**
5. Select the system user you just created
6. Click **Add Assets**:
   - Select **Apps** tab
   - Check your app (`Moltworker Bot`)
   - Enable **Full Control**
   - Click **Save Changes**
7. Click **Generate New Token**:
   - Select your app
   - Token expiration: **Never**
   - Select permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Click **Generate Token**
8. **Copy and save this token securely** - you won't see it again!

### Step 1.6: Get App Secret

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps/)
2. Select your app
3. Left sidebar: **App settings** → **Basic**
4. Find **App Secret** and click **Show**
5. Enter your Facebook password if prompted
6. **Copy and save this secret** - you'll need it for webhook verification

### Step 1.7: Add Test Phone Numbers

1. Go back to **WhatsApp** → **API Setup** in your app
2. Scroll to **To** field
3. Click **Manage phone number list**
4. Click **Add phone number**
5. Enter your phone number (with country code, e.g., `+1234567890`)
6. You'll receive a verification code via WhatsApp - enter it
7. Repeat for your partner's number

> **Note:** Test numbers are limited to 5 recipients. For more, you need to verify your business.

---

## Part 2: Cloudflare Configuration

> **Where:** Cloudflare Dashboard (browser) + Command Line
> **Time:** ~10 minutes

### Step 2.1: Set WhatsApp Secrets (Command Line)

Open your terminal and navigate to the moltworker directory:

```bash
cd /Users/oleg/workspace/moltworker
```

Set each secret (you'll be prompted to enter the value):

```bash
# Permanent access token from Step 1.5
npx wrangler secret put WHATSAPP_ACCESS_TOKEN
# Paste your token and press Enter

# Phone Number ID from Step 1.4
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
# Paste the ID and press Enter

# Make up any random string for webhook verification
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
# Type something like: my-secret-verify-token-12345

# App Secret from Step 1.6 (REQUIRED for security)
npx wrangler secret put WHATSAPP_APP_SECRET
# Paste the app secret and press Enter

# (Optional but recommended) Allowlist of phone numbers that can message the bot
# Comma-separated, with country code (e.g., "+1234567890,+0987654321")
npx wrangler secret put WHATSAPP_ALLOWED_NUMBERS
# Example: +14155551234,+14155555678
```

> **Security Note:** `WHATSAPP_APP_SECRET` is **required**. Without it, the webhook will reject all requests. The allowlist is optional but recommended to restrict access to only you and your partner.

### Step 2.2: Deploy the Worker (Command Line)

```bash
npm run deploy
```

Wait for deployment to complete. Note your worker URL (e.g., `https://moltbot-sandbox.your-subdomain.workers.dev`)

### Step 2.3: Create Cloudflare Access Bypass (Browser)

This allows Meta's servers to reach your webhook without authentication.

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Left sidebar: **Access** → **Applications**
3. Click **Add an application**
4. Select **Self-hosted**
5. Configure the application:

   **Application Configuration:**
   | Field | Value |
   |-------|-------|
   | Application name | `WhatsApp Webhook` |
   | Session Duration | `24 hours` (doesn't matter for bypass) |

   **Application domain:**
   | Subdomain | Domain | Path |
   |-----------|--------|------|
   | `moltbot-sandbox` (your worker name) | `your-subdomain.workers.dev` | `/whatsapp/webhook` |

6. Click **Next**

7. **Add a policy:**
   | Field | Value |
   |-------|-------|
   | Policy name | `Allow Meta Webhooks` |
   | Action | **Bypass** |
   | Session duration | - |

   **Configure rules:**
   - Include: **Everyone**

   > **Security note:** "Everyone" is safe here because we verify Meta's cryptographic signature in our code. Invalid signatures are rejected.

8. Click **Next**
9. Click **Add application**

---

## Part 3: Meta Webhook Configuration

> **Where:** Meta Developer Console (browser)
> **Time:** ~5 minutes

### Step 3.1: Configure Webhook URL

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps/)
2. Select your app
3. Left sidebar: **WhatsApp** → **Configuration**
4. Find the **Webhook** section
5. Click **Edit**
6. Fill in:

   | Field | Value |
   |-------|-------|
   | Callback URL | `https://YOUR-WORKER.workers.dev/whatsapp/webhook` |
   | Verify token | Same string you used for `WHATSAPP_VERIFY_TOKEN` |

   Replace `YOUR-WORKER.workers.dev` with your actual worker URL.

7. Click **Verify and save**

   If successful, you'll see a green checkmark. If it fails:
   - Check the callback URL is correct
   - Check the verify token matches exactly
   - Check your worker is deployed
   - Check Cloudflare Access bypass is configured

### Step 3.2: Subscribe to Messages

1. Still in **Configuration**, find **Webhook fields**
2. Click **Manage**
3. Find the **messages** row
4. Click **Subscribe**
5. You should see "Subscribed" status

---

## Part 4: Test the Integration

> **Where:** Your phone + Command Line
> **Time:** ~5 minutes

### Step 4.1: Find the Test Phone Number

1. In Meta Developer Console, go to **WhatsApp** → **API Setup**
2. Note the **test phone number** shown (e.g., `+1 555 123 4567`)

### Step 4.2: Send a Test Message

1. Open WhatsApp on your phone
2. Add the test phone number as a contact
3. Send a message: `Hello`
4. Wait for a response (may take 10-30 seconds on first message while container starts)

### Step 4.3: Check Logs (if no response)

```bash
npx wrangler tail
```

Look for `[WhatsApp]` log entries to debug issues.

---

## Part 5: Create Group Chat with Partner (Optional)

1. Create a new WhatsApp group
2. Add yourself and your partner
3. Add the Meta test phone number to the group
4. Now both of you can message the bot and see all responses

> **Note:** In groups, you may need to @mention the bot or use the test number as the group admin.

---

## Troubleshooting

### "Webhook verification failed"
- Verify token in Meta must **exactly match** `WHATSAPP_VERIFY_TOKEN` secret
- Check worker is deployed: `npm run deploy`
- Check Access bypass exists for `/whatsapp/webhook`

### "Invalid signature" (401 error)
- App Secret in Meta must match `WHATSAPP_APP_SECRET` secret
- Re-copy the secret from Meta (no extra spaces)

### No response from bot
- Check gateway is running: visit `https://YOUR-WORKER.workers.dev/api/status`
- Check logs: `npx wrangler tail`
- Ensure you're using a verified phone number

### "Message failed to send"
- Check `WHATSAPP_ACCESS_TOKEN` is the permanent token (not expired)
- Check `WHATSAPP_PHONE_NUMBER_ID` is correct

### Rate limited
- Test numbers have limits: 1,000 conversations/month free
- Wait and try again, or verify your business for higher limits

---

## Quick Reference: All Secrets

| Secret | Required | Source | Example |
|--------|----------|--------|---------|
| `WHATSAPP_ACCESS_TOKEN` | Yes | Meta System User → Generate Token | `EAAGm0PX4ZCps...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Meta WhatsApp API Setup → Phone Number ID | `123456789012345` |
| `WHATSAPP_VERIFY_TOKEN` | Yes | You make this up | `my-secret-token-123` |
| `WHATSAPP_APP_SECRET` | **Yes** | Meta App Settings → Basic → App Secret | `abc123def456...` |
| `WHATSAPP_ALLOWED_NUMBERS` | No | You + partner's numbers | `+14155551234,+14155555678` |

---

## Security Checklist

- [ ] Using permanent access token (not temporary 24h token)
- [ ] `WHATSAPP_APP_SECRET` is set (**required** - webhook rejects unsigned requests)
- [ ] `WHATSAPP_ALLOWED_NUMBERS` is set (recommended - restricts who can message)
- [ ] Cloudflare Access bypass only covers `/whatsapp/webhook` path
- [ ] Secrets set via `wrangler secret put` (not in code or env files)
