/**
 * A2A Protocol Service
 * Handles A2A JSON-RPC 2.0 communication between agents
 */

interface A2AMessage {
  jsonrpc: '2.0';
  method: 'message/send';
  params: {
    message: {
      messageId: string;
      role: 'user' | 'agent';
      parts: Array<{ kind: 'text'; text: string }>;
    };
  };
  id: number;
}

interface A2AResponse {
  jsonrpc: '2.0';
  id: number;
  result: {
    kind: 'message';
    messageId: string;
    role: 'agent';
    parts: Array<{ kind: 'text'; text: string }>;
  };
}

/**
 * Send A2A message to another agent
 */
export async function sendA2AMessage(params: {
  toAgentUrl: string;
  messageText: string;
  messageId?: string;
  requestId?: number;
}): Promise<A2AResponse> {
  const messageId = params.messageId || `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const requestId = params.requestId || Date.now();

  const message: A2AMessage = {
    jsonrpc: '2.0',
    method: 'message/send',
    params: {
      message: {
        messageId,
        role: 'user',
        parts: [{ kind: 'text', text: params.messageText }],
      },
    },
    id: requestId,
  };

  console.log(`📤 Sending A2A message to ${params.toAgentUrl}`);
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Text: ${params.messageText.substring(0, 100)}${params.messageText.length > 100 ? '...' : ''}`);

  try {
    // Add 30 second timeout for A2A requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(params.toAgentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
    }

    const result: A2AResponse = await response.json();

    const responseText = result.result.parts[0]?.text || 'No response';
    console.log(`✅ Received A2A response:`);
    console.log(`   Message ID: ${result.result.messageId}`);
    console.log(`   Text: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);

    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`❌ A2A message timed out after 30 seconds to ${params.toAgentUrl}`);
      throw new Error(`A2A request timed out after 30 seconds`);
    }
    console.error(`❌ A2A message failed:`, error);
    console.error(`   Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });
    throw error;
  }
}

/**
 * Send initial negotiation greeting from buyer to seller
 */
export async function sendNegotiationGreeting(params: {
  sellerA2AEndpoint: string;
  buyRequest: {
    id: string;
    title: string;
    description: string;
    minPrice: number;
    maxPrice: number;
  };
  listingId: number;
  negotiationRoomId: string;
}): Promise<A2AResponse> {
  const greetingText = `Hello! I'm interested in your listing #${params.listingId}.

**What I'm looking for:**
${params.buyRequest.title}

**Details:**
${params.buyRequest.description}

**Budget:**
${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR

I found your listing through semantic search and would like to discuss the details. Are you available to negotiate?

Negotiation Room: ${params.negotiationRoomId}`;

  return sendA2AMessage({
    toAgentUrl: params.sellerA2AEndpoint,
    messageText: greetingText,
    messageId: `greeting-${params.buyRequest.id}`,
  });
}
