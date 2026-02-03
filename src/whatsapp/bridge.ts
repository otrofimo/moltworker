/**
 * WhatsApp to Gateway Bridge
 *
 * Connects WhatsApp messages to the OpenClaw gateway via WebSocket.
 * Each incoming WhatsApp message creates a WebSocket connection to the gateway,
 * sends the message, collects the streaming response, and returns it.
 */

import type { Sandbox } from '@cloudflare/sandbox';
import { MOLTBOT_PORT } from '../config';

export interface BridgeConfig {
  gatewayToken?: string;
}

export interface GatewayMessage {
  type: string;
  content?: string;
  error?: { message: string };
  [key: string]: unknown;
}

/**
 * Send a message to the gateway and collect the response
 *
 * The gateway uses a streaming WebSocket protocol. Messages come in chunks
 * and we need to accumulate them until we get the final response.
 */
export async function sendToGateway(
  sandbox: Sandbox,
  message: string,
  config: BridgeConfig = {},
  conversationId?: string
): Promise<string> {
  console.log('[Bridge] Sending message to gateway, length:', message.length);

  // Build WebSocket URL with optional token
  let wsPath = '/ws';
  const params = new URLSearchParams();
  if (config.gatewayToken) {
    params.set('token', config.gatewayToken);
  }
  if (conversationId) {
    params.set('conversation', conversationId);
  }
  const query = params.toString();
  if (query) {
    wsPath += `?${query}`;
  }

  // Create a request for WebSocket upgrade
  const wsUrl = `ws://localhost:${MOLTBOT_PORT}${wsPath}`;
  const request = new Request(wsUrl, {
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
    },
  });

  // Connect to the gateway
  const response = await sandbox.wsConnect(request, MOLTBOT_PORT);
  const ws = response.webSocket;

  if (!ws) {
    throw new Error('Failed to establish WebSocket connection to gateway');
  }

  ws.accept();
  console.log('[Bridge] WebSocket connected');

  return new Promise((resolve, reject) => {
    let responseChunks: string[] = [];
    let isComplete = false;
    const timeout = setTimeout(() => {
      if (!isComplete) {
        console.error('[Bridge] Response timeout after 5 minutes');
        ws.close(1000, 'Timeout');
        reject(new Error('Gateway response timeout'));
      }
    }, 5 * 60 * 1000); // 5 minute timeout for long responses

    ws.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? event.data : '';
        console.log('[Bridge] Received:', data.slice(0, 200));

        // Try to parse as JSON
        let parsed: GatewayMessage;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Not JSON, might be raw text
          responseChunks.push(data);
          return;
        }

        // Handle different message types from the gateway
        switch (parsed.type) {
          case 'chunk':
          case 'content':
          case 'text':
            // Streaming text chunk
            if (parsed.content) {
              responseChunks.push(parsed.content);
            }
            break;

          case 'done':
          case 'complete':
          case 'end':
            // Response complete
            isComplete = true;
            clearTimeout(timeout);
            const fullResponse = responseChunks.join('');
            console.log('[Bridge] Response complete, length:', fullResponse.length);
            ws.close(1000, 'Complete');
            resolve(fullResponse);
            break;

          case 'error':
            // Error from gateway
            isComplete = true;
            clearTimeout(timeout);
            const errorMsg = parsed.error?.message || 'Unknown gateway error';
            console.error('[Bridge] Gateway error:', errorMsg);
            ws.close(1000, 'Error');
            reject(new Error(errorMsg));
            break;

          case 'assistant':
            // Full assistant message (non-streaming response)
            if (parsed.content) {
              isComplete = true;
              clearTimeout(timeout);
              console.log('[Bridge] Got full response, length:', parsed.content.length);
              ws.close(1000, 'Complete');
              resolve(parsed.content);
            }
            break;

          default:
            // Unknown message type, might contain content
            if (parsed.content) {
              responseChunks.push(parsed.content);
            }
            console.log('[Bridge] Unknown message type:', parsed.type);
        }
      } catch (err) {
        console.error('[Bridge] Error processing message:', err);
      }
    });

    ws.addEventListener('close', (event) => {
      clearTimeout(timeout);
      if (!isComplete) {
        // Connection closed before we got a complete response
        const partial = responseChunks.join('');
        if (partial) {
          console.log('[Bridge] Connection closed with partial response, length:', partial.length);
          resolve(partial);
        } else {
          reject(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`));
        }
      }
    });

    ws.addEventListener('error', (event) => {
      clearTimeout(timeout);
      console.error('[Bridge] WebSocket error:', event);
      if (!isComplete) {
        reject(new Error('WebSocket error'));
      }
    });

    // Send the user message
    const userMessage = JSON.stringify({
      type: 'user',
      content: message,
    });
    console.log('[Bridge] Sending user message');
    ws.send(userMessage);
  });
}

/**
 * Format a message for display, handling long responses
 */
export function formatResponse(response: string, maxLength: number = 4096): string {
  // WhatsApp has a 4096 character limit per message
  if (response.length <= maxLength) {
    return response;
  }

  // Truncate and add indicator
  const truncated = response.slice(0, maxLength - 50);
  const lastNewline = truncated.lastIndexOf('\n');
  const cutPoint = lastNewline > maxLength - 200 ? lastNewline : truncated.length;

  return truncated.slice(0, cutPoint) + '\n\n... (response truncated)';
}
