# LLM Providers & Cost Comparison

This guide covers setting up different LLM providers with moltworker via Cloudflare AI Gateway.

## Cost Comparison (per 1M tokens)

| Model | Input | Output | Monthly Est.* | Quality | Best For |
|-------|-------|--------|---------------|---------|----------|
| **Kimi K2.5** | $0.60 | $2.50 | ~$5-15 | Good | Best value, fast iteration |
| **Gemini Flash-Lite** | $0.075 | $0.30 | ~$1-5 | Decent | Budget, high volume |
| **Gemini 2.5 Pro** | $1.25 | $5.00 | ~$10-30 | Great | Long context (2M tokens) |
| **Claude Sonnet 4.5** | $3.00 | $15.00 | ~$30-80 | Excellent | Balance of cost/quality |
| **Claude Opus 4.5** | $5.00 | $25.00 | ~$50-150 | Best | Complex reasoning, code |
| **OpenAI Codex Mini** | $1.50 | $6.00 | ~$15-40 | Very Good | Code-optimized |
| **GPT-5 Codex** | $1.25 | $10.00 | ~$20-50 | Excellent | Multi-language code |

*Estimates based on ~100-300 WhatsApp messages/month with typical conversation lengths

## Quality Benchmarks (2025)

| Benchmark | Claude Opus 4.5 | Kimi K2.5 | Gemini 3 Pro | GPT-5 |
|-----------|-----------------|-----------|--------------|-------|
| **SWE-Bench** (bug fixing) | **80.9%** | 76.8% | 76.8% | 78% |
| **LiveCodeBench** (interactive) | 64.0% | **83.1%** | 79.7% | 75% |
| **Aider Polyglot** (multi-lang) | **89.4%** | - | - | 88% |

### TL;DR
- **Best Quality**: Claude Opus 4.5 (complex debugging, production code)
- **Best Value**: Kimi K2.5 (9x cheaper than Opus, good for daily use)
- **Budget**: Gemini Flash-Lite (extremely cheap, decent quality)
- **Long Context**: Gemini 2.5 Pro (2M token context window)

---

## AI Gateway Setup

Cloudflare AI Gateway provides:
- **Unified billing** - Pay all providers through Cloudflare
- **Dynamic routing** - Switch models via dashboard (no code changes)
- **Caching** - Reduce costs with response caching
- **Analytics** - Monitor usage and costs

### Step 1: Create AI Gateway

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → AI Gateway
2. Click "Create Gateway"
3. Name it (e.g., `moltbot-gateway`)
4. Note your **Account ID** and **Gateway ID**

### Step 2: Configure Provider

Choose ONE of these setups based on your preferred provider:

#### Option A: Anthropic (Claude) - Best Quality

```bash
# Set your Anthropic API key
npx wrangler secret put AI_GATEWAY_API_KEY
# Enter: sk-ant-... (your Anthropic key)

npx wrangler secret put AI_GATEWAY_BASE_URL
# Enter: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/anthropic

# Optional: Select model (default: claude-opus-4-5)
npx wrangler secret put AI_GATEWAY_MODEL
# Enter: claude-sonnet-4-5   (cheaper, still great)
#   or:  claude-haiku-4-5    (cheapest Claude)
```

#### Option B: Moonshot (Kimi K2.5) - Best Value

```bash
npx wrangler secret put AI_GATEWAY_API_KEY
# Enter: your Moonshot API key from https://platform.moonshot.ai

npx wrangler secret put AI_GATEWAY_BASE_URL
# Enter: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/moonshot

npx wrangler secret put AI_GATEWAY_MODEL
# Enter: kimi-k2.5
```

#### Option C: Google (Gemini) - Budget/Long Context

```bash
npx wrangler secret put AI_GATEWAY_API_KEY
# Enter: your Google AI API key from https://aistudio.google.com

npx wrangler secret put AI_GATEWAY_BASE_URL
# Enter: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/google-ai-studio

npx wrangler secret put AI_GATEWAY_MODEL
# Enter: gemini-2.0-flash      (fast, cheap)
#   or:  gemini-2.5-pro        (best quality)
#   or:  gemini-flash-lite     (cheapest)
```

#### Option D: OpenAI (GPT/Codex) - Multi-language Code

```bash
npx wrangler secret put AI_GATEWAY_API_KEY
# Enter: sk-... (your OpenAI key)

npx wrangler secret put AI_GATEWAY_BASE_URL
# Enter: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai

npx wrangler secret put AI_GATEWAY_MODEL
# Enter: gpt-5.2           (latest)
#   or:  codex-mini-latest (code-optimized)
```

#### Option E: Unified Endpoint (Multi-provider)

Use the unified OpenAI-compatible endpoint to access multiple providers:

```bash
npx wrangler secret put AI_GATEWAY_API_KEY
# Enter: your preferred provider's API key

npx wrangler secret put AI_GATEWAY_BASE_URL
# Enter: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat

npx wrangler secret put AI_GATEWAY_MODEL
# Enter: claude-sonnet-4-5  (or any model from catalog below)
```

**Unified Endpoint Model Catalog:**
- `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`
- `gpt-5.2`, `gpt-5`, `codex-mini`
- `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-flash-lite`
- `kimi-k2.5`, `kimi-k2`

---

## Dynamic Routing (Advanced)

AI Gateway's Dynamic Routing lets you:
- A/B test models
- Route by cost/latency
- Set budget limits
- Automatic fallbacks

### Example: Cost-Based Routing

1. In AI Gateway dashboard, click "Dynamic Routes"
2. Create a route called `cost-optimized`
3. Configure:
   ```json
   {
     "providers": [
       { "model": "moonshot/kimi-k2.5", "weight": 80 },
       { "model": "anthropic/claude-haiku-4-5", "weight": 20 }
     ],
     "fallback": "anthropic/claude-sonnet-4-5"
   }
   ```
4. Use `dynamic/cost-optimized` as your model

### Example: Quality Fallback Chain

```json
{
  "providers": [
    { "model": "anthropic/claude-opus-4-5" }
  ],
  "fallback": [
    { "model": "anthropic/claude-sonnet-4-5" },
    { "model": "openai/gpt-5.2" },
    { "model": "moonshot/kimi-k2.5" }
  ]
}
```

---

## Switching Models

To switch models after deployment:

```bash
# Change to a cheaper model
npx wrangler secret put AI_GATEWAY_MODEL
# Enter: kimi-k2.5

# Redeploy
npm run deploy
```

Or use Dynamic Routing to switch without redeploying.

---

## Cost Optimization Tips

1. **Use caching** - Enable response caching in AI Gateway for repeated queries
2. **Batch requests** - Use batch API for 50% discount (where available)
3. **Route by complexity** - Use cheaper models for simple queries
4. **Monitor usage** - Check AI Gateway analytics for cost breakdown
5. **Set budget alerts** - Configure spending limits in Cloudflare

---

## Unified Billing

With AI Gateway's unified billing:
1. Add credits in Cloudflare Dashboard → Billing
2. All provider usage is billed through Cloudflare
3. Single invoice for all AI providers
4. No need to manage multiple provider accounts

**To enable:**
1. Go to AI Gateway → Settings
2. Enable "Unified Billing"
3. Add credits to your Cloudflare account

---

## Provider API Key Sources

| Provider | Get API Key |
|----------|-------------|
| Anthropic | https://console.anthropic.com |
| OpenAI | https://platform.openai.com/api-keys |
| Google | https://aistudio.google.com/apikey |
| Moonshot | https://platform.moonshot.ai |

---

## Recommendations

| Use Case | Recommended Setup |
|----------|------------------|
| Personal assistant (budget) | Kimi K2.5 or Gemini Flash-Lite |
| Personal assistant (quality) | Claude Sonnet 4.5 |
| Coding tasks | Claude Opus 4.5 or Codex Mini |
| Long documents | Gemini 2.5 Pro (2M context) |
| High volume | Dynamic routing with Kimi fallback |
