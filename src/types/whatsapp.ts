/**
 * WhatsApp Cloud API type definitions
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
 */

// =============================================================================
// Webhook Payload Types (incoming from Meta)
// =============================================================================

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string; // WhatsApp Business Account ID
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppChangeValue;
  field: 'messages';
}

export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string; // WhatsApp ID (phone number without +)
}

// =============================================================================
// Message Types
// =============================================================================

export interface WhatsAppMessage {
  from: string; // Sender's phone number
  id: string; // Message ID
  timestamp: string; // Unix timestamp
  type: WhatsAppMessageType;
  text?: WhatsAppTextContent;
  image?: WhatsAppMediaContent;
  audio?: WhatsAppMediaContent;
  video?: WhatsAppMediaContent;
  document?: WhatsAppMediaContent;
  location?: WhatsAppLocationContent;
  contacts?: WhatsAppContactContent[];
  interactive?: WhatsAppInteractiveContent;
  button?: WhatsAppButtonContent;
  context?: WhatsAppMessageContext;
}

export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'button'
  | 'sticker'
  | 'unknown';

export interface WhatsAppTextContent {
  body: string;
}

export interface WhatsAppMediaContent {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

export interface WhatsAppLocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppContactContent {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
  }>;
}

export interface WhatsAppInteractiveContent {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface WhatsAppButtonContent {
  text: string;
  payload: string;
}

export interface WhatsAppMessageContext {
  from: string;
  id: string; // ID of the message being replied to
}

// =============================================================================
// Status Updates
// =============================================================================

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: WhatsAppError[];
}

export interface WhatsAppError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details: string;
  };
}

// =============================================================================
// Outgoing Message Types (sending to WhatsApp)
// =============================================================================

export interface WhatsAppSendMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'reaction';
  text?: {
    preview_url?: boolean;
    body: string;
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  reaction?: {
    message_id: string;
    emoji: string;
  };
}

export interface WhatsAppSendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppMarkReadRequest {
  messaging_product: 'whatsapp';
  status: 'read';
  message_id: string;
}

// =============================================================================
// API Error Response
// =============================================================================

export interface WhatsAppAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// =============================================================================
// Extracted message for easier handling
// =============================================================================

export interface ParsedWhatsAppMessage {
  messageId: string;
  from: string; // Phone number
  senderName: string;
  timestamp: Date;
  type: WhatsAppMessageType;
  text: string; // Extracted text content (body, caption, or description)
  replyToMessageId?: string;
}
