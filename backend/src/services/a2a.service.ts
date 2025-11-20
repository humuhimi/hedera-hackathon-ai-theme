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
 * Decision criteria detection for negotiation
 * Analyzes message content to detect if a decision has been reached
 */
export function detectDecisionCriteria(message: string): {
  hasDecision: boolean;
  decisionType: 'accepted' | 'rejected' | 'price_agreed' | 'counter_offer' | 'none';
  agreedPrice?: number;
} {
  const lowerMsg = message.toLowerCase();

  // Check for explicit acceptance
  const acceptanceKeywords = ['deal', 'accept', 'agree', 'sold', 'purchase', "let's proceed", "i'll buy", "i'll take it", 'okay', 'sounds good'];
  const hasAcceptance = acceptanceKeywords.some(keyword => lowerMsg.includes(keyword));

  // Check for explicit rejection
  const rejectionKeywords = ['reject', 'decline', 'not interested', 'too expensive', 'cannot accept', "can't accept", 'no deal', 'sorry'];
  const hasRejection = rejectionKeywords.some(keyword => lowerMsg.includes(keyword));

  // Check for price agreement pattern (e.g., "2 HBAR", "2.5 HBAR", "2 hbar")
  const priceMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:HBAR|hbar)/i);
  const agreedPrice = priceMatch ? parseFloat(priceMatch[1]) : undefined;

  // Check for counter offer
  const counterOfferKeywords = ['counter', 'how about', 'what about', 'could you do', 'would you accept', 'can you do'];
  const hasCounterOffer = counterOfferKeywords.some(keyword => lowerMsg.includes(keyword));

  if (hasAcceptance && agreedPrice) {
    return { hasDecision: true, decisionType: 'price_agreed', agreedPrice };
  }
  if (hasAcceptance) {
    return { hasDecision: true, decisionType: 'accepted' };
  }
  if (hasRejection) {
    return { hasDecision: true, decisionType: 'rejected' };
  }
  if (hasCounterOffer) {
    return { hasDecision: false, decisionType: 'counter_offer' };
  }

  return { hasDecision: false, decisionType: 'none' };
}

/**
 * Check if both agents' requirements are satisfied
 * Buyer: proposed price <= maxPrice
 * Seller: proposed price >= expectedPrice (or at minimum acceptable level)
 */
export function checkMutualSatisfaction(params: {
  proposedPrice: number;
  buyerBudget: { min: number; max: number };
  sellerPrice: { base: number; expected: number };
}): {
  isSatisfied: boolean;
  reason: string;
} {
  const { proposedPrice, buyerBudget, sellerPrice } = params;

  // Buyer's requirement: price must be within budget
  const buyerSatisfied = proposedPrice >= buyerBudget.min && proposedPrice <= buyerBudget.max;

  // Seller's requirement: price should be at or above expected price
  // Or at least within reasonable range (90% of expected price)
  const minAcceptablePrice = sellerPrice.expected * 0.9;
  const sellerSatisfied = proposedPrice >= minAcceptablePrice;

  if (buyerSatisfied && sellerSatisfied) {
    return {
      isSatisfied: true,
      reason: `Price ${proposedPrice} HBAR satisfies both parties: within buyer's budget (${buyerBudget.min}-${buyerBudget.max} HBAR) and meets seller's expectation (expected: ${sellerPrice.expected} HBAR)`
    };
  }

  if (!buyerSatisfied) {
    return {
      isSatisfied: false,
      reason: `Price ${proposedPrice} HBAR exceeds buyer's maximum budget of ${buyerBudget.max} HBAR`
    };
  }

  if (!sellerSatisfied) {
    return {
      isSatisfied: false,
      reason: `Price ${proposedPrice} HBAR is below seller's minimum acceptable price of ${minAcceptablePrice.toFixed(2)} HBAR`
    };
  }

  return { isSatisfied: false, reason: 'Unknown constraint violation' };
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
  listing: {
    listingId: string | number;
    title: string;
    description: string;
    basePrice: number;
    expectedPrice: number;
  };
  negotiationRoomId: string;
}): Promise<A2AResponse> {
  const greetingText = `NEGOTIATION CONTEXT:
You are negotiating about Listing #${params.listing.listingId}:
- Title: ${params.listing.title}
- Description: ${params.listing.description}
- Your asking price: ${params.listing.basePrice} HBAR (expected: ${params.listing.expectedPrice} HBAR)

BUYER'S REQUEST:
- Looking for: ${params.buyRequest.title}
- Details: ${params.buyRequest.description}
- Budget: ${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR

---

Hello! I'm interested in your listing #${params.listing.listingId} (${params.listing.title}).

I'm looking for "${params.buyRequest.title}" and your listing seems like a good match. My budget is ${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR.

Your asking price is ${params.listing.basePrice} HBAR. Can we negotiate a price that works for both of us?

Please make a concrete proposal or counteroffer so we can reach an agreement.

Negotiation Room: ${params.negotiationRoomId}`;

  return sendA2AMessage({
    toAgentUrl: params.sellerA2AEndpoint,
    messageText: greetingText,
    messageId: `greeting-${params.buyRequest.id}`,
  });
}

/**
 * Send negotiation response from buyer to seller
 */
export async function sendNegotiationResponse(params: {
  targetAgentEndpoint: string;
  messageText: string;
  negotiationContext: {
    listingId: string | number;
    listingTitle: string;
    currentPrice: number;
    budget: { min: number; max: number };
  };
  messageId: string;
}): Promise<A2AResponse> {
  const contextualMessage = `NEGOTIATION CONTEXT:
Listing #${params.negotiationContext.listingId}: ${params.negotiationContext.listingTitle}
Current price: ${params.negotiationContext.currentPrice} HBAR
Your budget: ${params.negotiationContext.budget.min}-${params.negotiationContext.budget.max} HBAR

IMPORTANT: Please make a concrete decision (accept, reject, or counter-offer with specific price).

---

${params.messageText}`;

  return sendA2AMessage({
    toAgentUrl: params.targetAgentEndpoint,
    messageText: contextualMessage,
    messageId: params.messageId,
  });
}
