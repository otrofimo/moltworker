/**
 * WhatsApp Cloud API Client
 *
 * Handles sending messages and marking messages as read via the Graph API.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

import type {
  WhatsAppSendMessageRequest,
  WhatsAppSendMessageResponse,
  WhatsAppMarkReadRequest,
  WhatsAppAPIError,
} from '../types/whatsapp';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = 'https://graph.facebook.com';

export interface WhatsAppClientConfig {
  accessToken: string;
  phoneNumberId: string;
}

export class WhatsAppClient {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor(config: WhatsAppClientConfig) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
    this.baseUrl = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${this.phoneNumberId}`;
  }

  /**
   * Send a text message to a WhatsApp user
   */
  async sendText(to: string, body: string): Promise<WhatsAppSendMessageResponse> {
    const payload: WhatsAppSendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: true,
        body,
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Send a reaction emoji to a message
   */
  async sendReaction(to: string, messageId: string, emoji: string): Promise<WhatsAppSendMessageResponse> {
    const payload: WhatsAppSendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'reaction',
      reaction: {
        message_id: messageId,
        emoji,
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Mark a message as read (shows blue checkmarks)
   */
  async markAsRead(messageId: string): Promise<boolean> {
    const payload: WhatsAppMarkReadRequest = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json() as WhatsAppAPIError;
      console.error('[WhatsApp] Failed to mark as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Send a message using the Graph API
   */
  private async sendMessage(payload: WhatsAppSendMessageRequest): Promise<WhatsAppSendMessageResponse> {
    console.log('[WhatsApp] Sending message to:', payload.to);

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json() as WhatsAppAPIError;
      console.error('[WhatsApp] API error:', error);
      throw new Error(`WhatsApp API error: ${error.error.message} (code: ${error.error.code})`);
    }

    const result = await response.json() as WhatsAppSendMessageResponse;
    console.log('[WhatsApp] Message sent, ID:', result.messages?.[0]?.id);
    return result;
  }
}

/**
 * Create a WhatsApp client from environment variables
 */
export function createWhatsAppClient(env: {
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
}): WhatsAppClient | null {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return null;
  }

  return new WhatsAppClient({
    accessToken: env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  });
}
