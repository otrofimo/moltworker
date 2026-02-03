/**
 * WhatsApp module exports
 */

export { WhatsAppClient, createWhatsAppClient, type WhatsAppClientConfig } from './client';
export { sendToGateway, formatResponse, type BridgeConfig, type GatewayMessage } from './bridge';
