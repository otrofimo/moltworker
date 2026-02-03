/**
 * WhatsApp Cloud API Webhook Routes
 *
 * Handles incoming webhooks from Meta and bridges messages to the gateway.
 * These routes are PUBLIC (no Cloudflare Access auth) because Meta needs to reach them.
 * Security is provided by webhook signature verification using WHATSAPP_APP_SECRET.
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types';
import type {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  ParsedWhatsAppMessage,
} from '../types/whatsapp';
import { createWhatsAppClient } from '../whatsapp/client';
import { sendToGateway, formatResponse } from '../whatsapp/bridge';
import { ensureMoltbotGateway } from '../gateway';

const whatsapp = new Hono<AppEnv>();

/**
 * Verify the X-Hub-Signature-256 header from Meta
 * This proves the request actually came from Meta, not an attacker
 */
async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  appSecret: string
): Promise<boolean> {
  if (!signature) {
    console.error('[WhatsApp] Missing X-Hub-Signature-256 header');
    return false;
  }

  // Signature format: "sha256=hex_digest"
  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) {
    console.error('[WhatsApp] Invalid signature format');
    return false;
  }

  const providedHash = signature.slice(expectedPrefix.length);

  // Compute HMAC-SHA256
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computedHash = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (providedHash.length !== computedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedHash.length; i++) {
    result |= providedHash.charCodeAt(i) ^ computedHash.charCodeAt(i);
  }

  const isValid = result === 0;
  if (!isValid) {
    console.error('[WhatsApp] Signature verification failed');
  }

  return isValid;
}

/**
 * GET /whatsapp/webhook - Webhook verification
 *
 * Meta sends a GET request to verify your webhook URL.
 * You must respond with the hub.challenge value.
 */
whatsapp.get('/webhook', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  console.log('[WhatsApp] Webhook verification request');
  console.log('[WhatsApp] Mode:', mode);
  console.log('[WhatsApp] Token matches:', token === c.env.WHATSAPP_VERIFY_TOKEN);

  if (mode === 'subscribe' && token === c.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified successfully');
    return c.text(challenge || '', 200);
  }

  console.error('[WhatsApp] Webhook verification failed');
  return c.text('Forbidden', 403);
});

/**
 * POST /whatsapp/webhook - Receive messages
 *
 * Meta sends message events here. We parse the message,
 * forward it to the gateway, and send the response back to WhatsApp.
 */
whatsapp.post('/webhook', async (c) => {
  // Get raw body for signature verification
  const rawBody = await c.req.text();

  // Verify webhook signature if app secret is configured
  if (c.env.WHATSAPP_APP_SECRET) {
    const signature = c.req.header('X-Hub-Signature-256');
    const isValid = await verifyWebhookSignature(rawBody, signature, c.env.WHATSAPP_APP_SECRET);

    if (!isValid) {
      console.error('[WhatsApp] Webhook signature verification failed - rejecting request');
      return c.text('Invalid signature', 401);
    }
    console.log('[WhatsApp] Webhook signature verified');
  } else {
    console.warn('[WhatsApp] WHATSAPP_APP_SECRET not set - skipping signature verification (not recommended for production)');
  }

  // Parse the verified body
  const body = JSON.parse(rawBody) as WhatsAppWebhookPayload;

  console.log('[WhatsApp] Received webhook:', JSON.stringify(body).slice(0, 500));

  // Validate it's a WhatsApp message
  if (body.object !== 'whatsapp_business_account') {
    console.log('[WhatsApp] Not a WhatsApp event, ignoring');
    return c.text('OK', 200);
  }

  // Extract messages from the webhook payload
  const messages = extractMessages(body);
  if (messages.length === 0) {
    console.log('[WhatsApp] No messages in payload (might be status update)');
    return c.text('OK', 200);
  }

  // Process messages in the background
  c.executionCtx.waitUntil(
    processMessages(c, messages).catch((err) => {
      console.error('[WhatsApp] Error processing messages:', err);
    })
  );

  // Respond immediately to Meta
  return c.text('OK', 200);
});

/**
 * Extract messages from the webhook payload
 */
function extractMessages(payload: WhatsAppWebhookPayload): ParsedWhatsAppMessage[] {
  const messages: ParsedWhatsAppMessage[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      if (!value.messages) continue;

      // Get contact info for sender names
      const contacts = new Map(
        (value.contacts || []).map((c) => [c.wa_id, c.profile.name])
      );

      for (const msg of value.messages) {
        const parsed = parseMessage(msg, contacts);
        if (parsed) {
          messages.push(parsed);
        }
      }
    }
  }

  return messages;
}

/**
 * Parse a single WhatsApp message
 */
function parseMessage(
  msg: WhatsAppMessage,
  contacts: Map<string, string>
): ParsedWhatsAppMessage | null {
  // Extract text content based on message type
  let text = '';

  switch (msg.type) {
    case 'text':
      text = msg.text?.body || '';
      break;
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
      text = msg[msg.type]?.caption || `[${msg.type}]`;
      break;
    case 'location':
      const loc = msg.location;
      text = loc ? `[Location: ${loc.name || ''} ${loc.address || ''} (${loc.latitude}, ${loc.longitude})]` : '[Location]';
      break;
    case 'contacts':
      text = '[Contact shared]';
      break;
    case 'interactive':
      text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '[Interactive]';
      break;
    case 'button':
      text = msg.button?.text || '[Button]';
      break;
    default:
      console.log('[WhatsApp] Unsupported message type:', msg.type);
      return null;
  }

  if (!text) {
    return null;
  }

  return {
    messageId: msg.id,
    from: msg.from,
    senderName: contacts.get(msg.from) || msg.from,
    timestamp: new Date(parseInt(msg.timestamp) * 1000),
    type: msg.type,
    text,
    replyToMessageId: msg.context?.id,
  };
}

/**
 * Process messages and send responses
 */
async function processMessages(
  c: { env: AppEnv['Bindings']; get: (key: 'sandbox') => unknown },
  messages: ParsedWhatsAppMessage[]
): Promise<void> {
  const client = createWhatsAppClient(c.env);
  if (!client) {
    console.error('[WhatsApp] Client not configured (missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)');
    return;
  }

  const sandbox = c.get('sandbox') as import('@cloudflare/sandbox').Sandbox;

  // Ensure gateway is running
  try {
    await ensureMoltbotGateway(sandbox, c.env);
  } catch (err) {
    console.error('[WhatsApp] Failed to start gateway:', err);
    // Try to notify user of the error
    for (const msg of messages) {
      try {
        await client.sendText(
          msg.from,
          '⚠️ Sorry, the assistant is currently unavailable. Please try again later.'
        );
      } catch {
        // Ignore send errors
      }
    }
    return;
  }

  // Process each message
  for (const msg of messages) {
    console.log(`[WhatsApp] Processing message from ${msg.senderName}: ${msg.text.slice(0, 100)}`);

    try {
      // Mark as read (shows blue checkmarks)
      await client.markAsRead(msg.messageId);

      // Send typing indicator via reaction (WhatsApp doesn't have typing indicators)
      // Using a thinking emoji as a "typing" indicator
      await client.sendReaction(msg.from, msg.messageId, '🤔');

      // Send to gateway and get response
      const response = await sendToGateway(
        sandbox,
        msg.text,
        { gatewayToken: c.env.MOLTBOT_GATEWAY_TOKEN },
        `whatsapp-${msg.from}` // Use phone number as conversation ID
      );

      // Remove thinking reaction
      await client.sendReaction(msg.from, msg.messageId, ''); // Empty emoji removes reaction

      // Format and send response
      const formattedResponse = formatResponse(response);
      await client.sendText(msg.from, formattedResponse);

      console.log(`[WhatsApp] Sent response to ${msg.from}, length: ${formattedResponse.length}`);
    } catch (err) {
      console.error(`[WhatsApp] Error processing message from ${msg.from}:`, err);

      // Remove thinking reaction on error
      try {
        await client.sendReaction(msg.from, msg.messageId, '');
      } catch {
        // Ignore
      }

      // Send error message to user
      try {
        await client.sendText(
          msg.from,
          '❌ Sorry, I encountered an error processing your message. Please try again.'
        );
      } catch {
        // Ignore send errors
      }
    }
  }
}

export { whatsapp };
