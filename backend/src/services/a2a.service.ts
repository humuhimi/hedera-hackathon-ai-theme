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
  const acceptanceKeywords = ['deal!', 'deal.', 'i accept', 'accept this price', 'accept your offer', 'agreed', 'sold', 'purchase', "let's proceed", "i'll buy", "i'll take it", 'finalize', 'confirm the'];
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
- Your base price: ${params.listing.basePrice} HBAR
- Your expected price (target): ${params.listing.expectedPrice} HBAR

BUYER'S REQUEST:
- Looking for: ${params.buyRequest.title}
- Details: ${params.buyRequest.description}
- Budget: ${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR

STRATEGIC PRICING GUIDANCE:
- Buyer's maximum budget is ${params.buyRequest.maxPrice} HBAR
- Your expected price is ${params.listing.expectedPrice} HBAR
- Recommended opening price: ${Math.min(params.buyRequest.maxPrice * 0.85, params.listing.expectedPrice * 1.3).toFixed(1)} HBAR (aim for their upper budget range)
- Minimum acceptable: ${(params.listing.expectedPrice * 0.8).toFixed(1)} HBAR (80% of expected)
- Any offer within 10% of your expected price (${(params.listing.expectedPrice * 0.9).toFixed(1)}-${(params.listing.expectedPrice * 1.1).toFixed(1)} HBAR) should be ACCEPTED

IMPORTANT RULES:
1. Make ONE clear counter-offer with specific price
2. If buyer accepts your price, respond with "I accept this price. Deal!" and STOP
3. Make maximum 2 counter-offers, then accept or reject
4. Once you say "Deal" or "I accept", you CANNOT change the price
5. Keep responses concise (max 80 words)

---

Hello! I'm interested in your listing #${params.listing.listingId} (${params.listing.title}).

I'm looking for "${params.buyRequest.title}" and your listing seems like a good match. My budget is ${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR.

Your asking price is ${params.listing.basePrice} HBAR. Can we negotiate a price that works for both of us?

Please make ONE concrete price proposal so we can reach an agreement quickly.

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
    expectedPrice?: number;
    roundNumber?: number;
  };
  messageId: string;
}): Promise<A2AResponse> {
  const contextualMessage = `NEGOTIATION CONTEXT:
Listing #${params.negotiationContext.listingId}: ${params.negotiationContext.listingTitle}
Current offer: ${params.negotiationContext.currentPrice} HBAR
${params.negotiationContext.expectedPrice ? `Expected price: ${params.negotiationContext.expectedPrice} HBAR` : ''}
Budget range: ${params.negotiationContext.budget.min}-${params.negotiationContext.budget.max} HBAR
${params.negotiationContext.roundNumber ? `Round: ${params.negotiationContext.roundNumber}/25` : ''}

CRITICAL RULES:
1. Make a concrete decision (accept, reject, or ONE counter-offer with specific price)
2. If you say "Deal" or "I accept", you CANNOT change the price afterward
3. Be strategic: Consider if this price is fair for both parties
4. Negotiation will continue until agreement or rejection (max 25 rounds)
5. Keep response under 80 words

---

${params.messageText}`;

  return sendA2AMessage({
    toAgentUrl: params.targetAgentEndpoint,
    messageText: contextualMessage,
    messageId: params.messageId,
  });
}
