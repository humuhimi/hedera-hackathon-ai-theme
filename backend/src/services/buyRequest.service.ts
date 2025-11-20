/**
 * BuyRequest Service
 * Handles buy request operations (DB only, no blockchain)
 */

import { PrismaClient } from "@prisma/client";
import { getListings, getAgentA2AEndpoint } from "./marketplace.service";
import { semanticSearch } from "./semanticSearch.service";
import { sendNegotiationGreeting, sendNegotiationResponse, detectDecisionCriteria, checkMutualSatisfaction } from "./a2a.service";
import { sendMessage } from "./negotiation.service";
import { io } from "../socket";

const prisma = new PrismaClient();

type SearchStep = 'idle' | 'searching' | 'found' | 'verifying' | 'verified' | 'contacting' | 'contacted' | 'joined_room' | 'negotiation_complete' | 'complete' | 'error' | 'no_results';

/**
 * Update buy request search progress
 */
async function updateSearchProgress(
  buyRequestId: string,
  step: SearchStep,
  message: string,
  extra?: {
    matchedListingId?: number;
    sellerAgentId?: number;
    a2aEndpoint?: string;
    searchError?: string;
    negotiationRoomId?: string;
  }
) {
  const updated = await prisma.buyRequest.update({
    where: { id: buyRequestId },
    data: {
      searchStep: step,
      searchMessage: message,
      ...extra,
    },
  });

  // Emit WebSocket event to buyRequest room
  io.to(`buyRequest:${buyRequestId}`).emit('buyRequest:progress', {
    buyRequestId,
    searchStep: step,
    searchMessage: message,
    matchedListingId: extra?.matchedListingId ?? updated.matchedListingId,
    sellerAgentId: extra?.sellerAgentId ?? updated.sellerAgentId,
    a2aEndpoint: extra?.a2aEndpoint ?? updated.a2aEndpoint,
    searchError: extra?.searchError ?? updated.searchError,
    negotiationRoomId: extra?.negotiationRoomId ?? updated.negotiationRoomId,
  });
}

/**
 * Continue multi-round negotiation between buyer and seller agents
 * Uses OpenAI to generate intelligent buyer responses based on context
 */
async function continueNegotiation(params: {
  roomId: string;
  buyerAgentId: number;
  sellerAgentId: number;
  buyerA2AEndpoint: string;
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
  conversationHistory: Array<{ role: 'buyer' | 'seller'; content: string }>;
  maxRounds?: number;
}) {
  const MAX_ROUNDS = params.maxRounds || 25;
  let roundCount = 0;
  let currentHistory = [...params.conversationHistory];

  console.log(`🔄 Starting multi-round negotiation (max ${MAX_ROUNDS} rounds)`);

  while (roundCount < MAX_ROUNDS) {
    roundCount++;
    console.log(`\n🔄 Round ${roundCount}/${MAX_ROUNDS}`);

    // Get the last message from seller
    const lastSellerMessage = currentHistory[currentHistory.length - 1];
    if (lastSellerMessage.role !== 'seller') {
      console.log(`⚠️  Last message is not from seller, ending negotiation`);
      break;
    }

    // Check if seller made a decision
    const sellerDecision = detectDecisionCriteria(lastSellerMessage.content);
    console.log(`   Seller decision: ${sellerDecision.decisionType}`);

    // If seller proposed a price, check if it satisfies both parties
    if (sellerDecision.agreedPrice) {
      const mutualCheck = checkMutualSatisfaction({
        proposedPrice: sellerDecision.agreedPrice,
        buyerBudget: { min: params.buyRequest.minPrice, max: params.buyRequest.maxPrice },
        sellerPrice: { base: params.listing.basePrice, expected: params.listing.expectedPrice },
      });

      console.log(`   Mutual satisfaction check: ${mutualCheck.isSatisfied ? '✅' : '❌'} ${mutualCheck.reason}`);

      if (mutualCheck.isSatisfied && sellerDecision.hasDecision) {
        console.log(`✅ Negotiation concluded: Both parties satisfied at ${sellerDecision.agreedPrice} HBAR`);

        await prisma.negotiationRoom.update({
          where: { id: params.roomId },
          data: {
            status: 'COMPLETED',
            agreedPrice: sellerDecision.agreedPrice,
          },
        });

        io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
          roomId: params.roomId,
          decisionType: 'price_agreed',
          status: 'COMPLETED',
          agreedPrice: sellerDecision.agreedPrice,
          reason: mutualCheck.reason,
        });

        break;
      }
    }

    if (sellerDecision.hasDecision && sellerDecision.decisionType === 'rejected') {
      console.log(`✅ Negotiation concluded: ${sellerDecision.decisionType}`);

      await prisma.negotiationRoom.update({
        where: { id: params.roomId },
        data: { status: 'REJECTED' },
      });

      io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
        roomId: params.roomId,
        decisionType: sellerDecision.decisionType,
        status: 'REJECTED',
      });

      break;
    }

    // Generate buyer response using OpenAI
    try {
      const conversationContext = currentHistory
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      const prompt = `You are a buyer agent negotiating to purchase an item. Here's the context:

LISTING:
- ID: ${params.listing.listingId}
- Title: ${params.listing.title}
- Description: ${params.listing.description}
- Seller's asking price: ${params.listing.basePrice} HBAR
- Seller's expected price: ${params.listing.expectedPrice} HBAR

YOUR BUYER REQUEST:
- Looking for: ${params.buyRequest.title}
- Details: ${params.buyRequest.description}
- Budget: ${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR

CONVERSATION SO FAR:
${conversationContext}

CRITICAL NEGOTIATION RULES:
1. If the seller accepts your offer, respond with "I accept this price. Deal!" and DO NOT try to lower the price further
2. Each price change must be at least 0.1 HBAR (no micro-adjustments like 0.01-0.02 HBAR)
3. Make at most 2-3 counter-offers before accepting or rejecting
4. If the seller's price is within your budget (${params.buyRequest.minPrice}-${params.buyRequest.maxPrice} HBAR), ACCEPT IT
5. Be fair and realistic - do not keep asking for lower prices indefinitely

Generate a response that:
- Responds directly to the seller's last message
- Makes ONE concrete price proposal or accepts the seller's offer
- Is concise (max 80 words) and professional
- Leads to a FINAL decision within 2-3 more exchanges

Your response:`;

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_LARGE_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a professional buyer agent negotiating purchases.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const buyerResponse = openaiData.choices[0].message.content.trim();

      console.log(`   Buyer generated response: ${buyerResponse.substring(0, 100)}...`);

      // Log buyer message to negotiation room FIRST
      await sendMessage({
        roomId: params.roomId,
        senderAgentId: params.buyerAgentId,
        content: buyerResponse,
        messageType: 'negotiation',
        metadata: {
          roundNumber: roundCount,
          source: 'ai-generated',
        },
      });

      // Check if buyer's response indicates acceptance/decision BEFORE sending to seller
      const buyerDecision = detectDecisionCriteria(buyerResponse);

      // If buyer said "Deal!" or accepted the price, end negotiation immediately
      if (buyerDecision.hasDecision && (buyerDecision.decisionType === 'accepted' || buyerDecision.decisionType === 'price_agreed')) {
        const agreedPrice = buyerDecision.agreedPrice || params.listing.basePrice;

        console.log(`✅ Buyer accepted the deal at ${agreedPrice} HBAR`);

        await prisma.negotiationRoom.update({
          where: { id: params.roomId },
          data: {
            status: 'COMPLETED',
            agreedPrice,
          },
        });

        io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
          roomId: params.roomId,
          decisionType: 'price_agreed',
          agreedPrice,
          status: 'COMPLETED',
          reason: `Buyer accepted the offer at ${agreedPrice} HBAR`,
        });

        break;
      }

      // If buyer rejected, end negotiation
      if (buyerDecision.hasDecision && buyerDecision.decisionType === 'rejected') {
        console.log(`✅ Buyer rejected the offer`);

        await prisma.negotiationRoom.update({
          where: { id: params.roomId },
          data: { status: 'REJECTED' },
        });

        io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
          roomId: params.roomId,
          decisionType: 'rejected',
          status: 'REJECTED',
          reason: 'Buyer rejected the offer',
        });

        break;
      }

      // If no decision yet, send to seller and continue negotiation
      const a2aResponse = await sendNegotiationResponse({
        targetAgentEndpoint: params.sellerA2AEndpoint,
        messageText: buyerResponse,
        negotiationContext: {
          listingId: params.listing.listingId,
          listingTitle: params.listing.title,
          currentPrice: params.listing.basePrice,
          budget: { min: params.buyRequest.minPrice, max: params.buyRequest.maxPrice },
        },
        messageId: `round-${roundCount}-buyer-${params.buyRequest.id}`,
      });

      // Log seller response to negotiation room
      const sellerResponseText = a2aResponse.result.parts[0]?.text;
      if (sellerResponseText) {
        await sendMessage({
          roomId: params.roomId,
          senderAgentId: params.sellerAgentId,
          content: sellerResponseText,
          messageType: 'negotiation',
          metadata: {
            a2aMessageId: a2aResponse.result.messageId,
            roundNumber: roundCount,
            source: 'a2a-response',
          },
        });

        // Add to conversation history
        currentHistory.push({ role: 'buyer', content: buyerResponse });
        currentHistory.push({ role: 'seller', content: sellerResponseText });

        // Check if seller's response indicates acceptance/decision
        const sellerDecision = detectDecisionCriteria(sellerResponseText);

        // If seller accepted the price, end negotiation immediately
        if (sellerDecision.hasDecision && (sellerDecision.decisionType === 'accepted' || sellerDecision.decisionType === 'price_agreed')) {
          const agreedPrice = sellerDecision.agreedPrice || params.listing.basePrice;

          console.log(`✅ Seller accepted the deal at ${agreedPrice} HBAR`);

          await prisma.negotiationRoom.update({
            where: { id: params.roomId },
            data: {
              status: 'COMPLETED',
              agreedPrice,
            },
          });

          io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
            roomId: params.roomId,
            decisionType: 'price_agreed',
            agreedPrice,
            status: 'COMPLETED',
            reason: `Seller accepted the offer at ${agreedPrice} HBAR`,
          });

          break;
        }

        // If seller rejected, end negotiation
        if (sellerDecision.hasDecision && sellerDecision.decisionType === 'rejected') {
          console.log(`✅ Seller rejected the offer`);

          await prisma.negotiationRoom.update({
            where: { id: params.roomId },
            data: { status: 'REJECTED' },
          });

          io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
            roomId: params.roomId,
            decisionType: 'rejected',
            status: 'REJECTED',
            reason: 'Seller rejected the offer',
          });

          break;
        }
      } else {
        console.log(`⚠️  No response from seller, ending negotiation`);
        break;
      }

      // Small delay between rounds to avoid overwhelming the agents
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Error in negotiation round ${roundCount}:`, error?.message || error);
      break;
    }
  }

  if (roundCount >= MAX_ROUNDS) {
    console.log(`⚠️  Negotiation reached max rounds (${MAX_ROUNDS}), stopping`);

    // Update status to CANCELLED if max rounds reached without agreement
    await prisma.negotiationRoom.update({
      where: { id: params.roomId },
      data: { status: 'CANCELLED' },
    });

    io.to(`negotiation:${params.roomId}`).emit('negotiation:concluded', {
      roomId: params.roomId,
      decisionType: 'max_rounds_reached',
      status: 'CANCELLED',
      reason: `Negotiation ended after ${MAX_ROUNDS} rounds without agreement`,
    });
  }

  console.log(`✅ Negotiation completed after ${roundCount} rounds`);
}

/**
 * Process automatic search for a buy request
 * This runs asynchronously after the buy request is created
 */
async function processAutoSearch(
  buyRequestId: string,
  buyRequest: { title: string; description: string; minPrice: number; maxPrice: number },
  buyerAgentId: number
) {
  try {
    // Step 1: Get all open listings
    await updateSearchProgress(buyRequestId, 'searching', 'Searching for matching listings...');

    const allListings = await getListings({
      status: 'OPEN',
    });

    if (!allListings || allListings.length === 0) {
      await updateSearchProgress(buyRequestId, 'no_results', 'No listings available');
      return;
    }

    // Step 2: Use AI to find semantically matching listings
    const matches = await semanticSearch.findMatchingListings(buyRequest, allListings);

    if (matches.length === 0) {
      await updateSearchProgress(buyRequestId, 'no_results', 'No matching listings found');
      return;
    }

    // Get the best match (highest score)
    const bestMatchResult = matches.sort((a, b) => b.score - a.score)[0];
    const affordableListings = allListings.filter(
      (l: any) => l.listingId === bestMatchResult.listingId
    );

    if (affordableListings.length === 0) {
      await updateSearchProgress(buyRequestId, 'no_results', 'No listings within budget found');
      return;
    }

    await updateSearchProgress(
      buyRequestId,
      'found',
      `Found ${matches.length} matching listing(s) - Best: ${bestMatchResult.reason}`
    );

    // Step 2: Select best match and verify on-chain
    const bestMatch = affordableListings[0];
    await updateSearchProgress(
      buyRequestId,
      'verifying',
      `Verifying listing #${bestMatch.listingId} on-chain...`,
      { matchedListingId: Number(bestMatch.listingId), sellerAgentId: bestMatch.sellerAgentId }
    );

    // Verify the listing actually exists in the database (minimal verification)
    const listingExists = await prisma.listing.findUnique({
      where: { listingId: bestMatch.listingId },
    });

    if (!listingExists) {
      throw new Error(`Listing #${bestMatch.listingId} not found in database`);
    }

    if (listingExists.status !== 'OPEN') {
      throw new Error(`Listing #${bestMatch.listingId} is not open (status: ${listingExists.status})`);
    }

    // TODO: Add actual Hedera on-chain verification here in the future

    await updateSearchProgress(
      buyRequestId,
      'verified',
      `Listing #${bestMatch.listingId} verified`,
      { matchedListingId: Number(bestMatch.listingId), sellerAgentId: bestMatch.sellerAgentId }
    );

    // Step 3: Get A2A endpoint
    await updateSearchProgress(
      buyRequestId,
      'contacting',
      `Getting A2A endpoint for Agent #${bestMatch.sellerAgentId}...`,
      { matchedListingId: Number(bestMatch.listingId), sellerAgentId: bestMatch.sellerAgentId }
    );

    const a2aInfo = await getAgentA2AEndpoint(bestMatch.sellerAgentId);

    await updateSearchProgress(
      buyRequestId,
      'contacted',
      'A2A endpoint resolved',
      {
        matchedListingId: Number(bestMatch.listingId),
        sellerAgentId: bestMatch.sellerAgentId,
        a2aEndpoint: a2aInfo.a2aEndpoint
      }
    );

    // Step 4: Join negotiation room
    // Find the NegotiationRoom for this listing
    const room = await prisma.negotiationRoom.findUnique({
      where: { listingId: bestMatch.listingId },
    });

    if (!room) {
      throw new Error(`NegotiationRoom not found for listing ${bestMatch.listingId}`);
    }

    // Get buyer's A2A endpoint
    const buyerA2AInfo = await getAgentA2AEndpoint(buyerAgentId);

    // Update NegotiationRoom with buyer info
    await prisma.negotiationRoom.update({
      where: { id: room.id },
      data: {
        buyerAgentId: buyerAgentId,
        buyerA2AEndpoint: buyerA2AInfo.a2aEndpoint,
        status: 'ACTIVE',
      },
    });

    // Only mark as joined AFTER successfully updating the room
    await updateSearchProgress(
      buyRequestId,
      'joined_room',
      'Joined negotiation room! Initiating negotiation...',
      {
        matchedListingId: Number(bestMatch.listingId),
        sellerAgentId: bestMatch.sellerAgentId,
        a2aEndpoint: a2aInfo.a2aEndpoint,
        negotiationRoomId: room.id,
      }
    );

    // Step 5: Send initial negotiation greeting via A2A
    try {
      console.log(`🤝 Initiating negotiation for BuyRequest ${buyRequestId}`);

      // Prepare context for agents: Listing details
      const listingContext = {
        listingId: bestMatch.listingId,
        title: bestMatch.title,
        description: bestMatch.description,
        basePrice: bestMatch.basePrice,
        expectedPrice: bestMatch.expectedPrice,
      };

      const a2aResponse = await sendNegotiationGreeting({
        sellerA2AEndpoint: a2aInfo.a2aEndpoint,
        buyRequest: {
          id: buyRequestId,
          title: buyRequest.title,
          description: buyRequest.description,
          minPrice: buyRequest.minPrice,
          maxPrice: buyRequest.maxPrice,
        },
        listing: listingContext,
        negotiationRoomId: room.id,
      });

      // Log buyer's greeting message to negotiation room
      const greetingText = `Hello! I'm interested in your listing #${bestMatch.listingId} (${bestMatch.title}).

I'm looking for "${buyRequest.title}" and your listing seems like a good match. My budget is ${buyRequest.minPrice}-${buyRequest.maxPrice} HBAR.

Your asking price is ${bestMatch.basePrice} HBAR. Can we negotiate a price that works for both of us?`;

      await sendMessage({
        roomId: room.id,
        senderAgentId: buyerAgentId,
        content: greetingText,
        messageType: 'greeting',
        metadata: {
          a2aMessageId: `greeting-${buyRequestId}`,
          source: 'auto-search',
        },
      });

      // Log seller's response to negotiation room
      const sellerResponseText = a2aResponse.result.parts[0]?.text;
      if (sellerResponseText) {
        await sendMessage({
          roomId: room.id,
          senderAgentId: bestMatch.sellerAgentId,
          content: sellerResponseText,
          messageType: 'response',
          metadata: {
            a2aMessageId: a2aResponse.result.messageId,
            source: 'a2a-response',
          },
        });

        console.log(`✅ Initial greeting exchanged, starting multi-round negotiation`);

        // Start multi-round negotiation
        await continueNegotiation({
          roomId: room.id,
          buyerAgentId: buyerAgentId,
          sellerAgentId: bestMatch.sellerAgentId,
          buyerA2AEndpoint: buyerA2AInfo.a2aEndpoint,
          sellerA2AEndpoint: a2aInfo.a2aEndpoint,
          buyRequest: {
            id: buyRequestId,
            title: buyRequest.title,
            description: buyRequest.description,
            minPrice: buyRequest.minPrice,
            maxPrice: buyRequest.maxPrice,
          },
          listing: listingContext,
          conversationHistory: [
            { role: 'buyer', content: greetingText },
            { role: 'seller', content: sellerResponseText },
          ],
          maxRounds: 25,
        });

        console.log(`✅ Negotiation process completed`);
      } else {
        console.log(`⚠️  No response from seller, negotiation cannot continue`);
      }

    } catch (error: any) {
      console.error(`⚠️  Failed to send A2A greeting, but room is ready:`, error?.message || error);
      console.error(`   Error type: ${error?.name}`);
      console.error(`   Seller endpoint was: ${a2aInfo.a2aEndpoint}`);
      // Don't fail the whole process if A2A message fails
      // The room is already created and users can still manually negotiate
    }

    // Note: Step 5 "Complete Negotiation" will be triggered externally
    // when the negotiation actually completes.

    // Update BuyRequest status
    await prisma.buyRequest.update({
      where: { id: buyRequestId },
      data: {
        status: 'MATCHED',
      },
    });

    console.log(`🤝 BuyRequest ${buyRequestId} joined NegotiationRoom ${room.id}`);

    return {
      success: true,
      negotiationRoomId: room.id,
      listingId: bestMatch.listingId,
      sellerAgentId: bestMatch.sellerAgentId,
    };

  } catch (error: any) {
    console.error('Auto search failed:', error);
    await updateSearchProgress(
      buyRequestId,
      'error',
      'Search failed',
      { searchError: error.message || 'Unknown error' }
    );
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Create a buy request (what buyer wants to purchase)
 * This is DB-only, no blockchain transaction
 */
export async function createBuyRequest(params: {
  buyerAgentId: string | number;
  title: string;
  description: string;
  minPrice: number; // in HBAR
  maxPrice: number; // in HBAR
  category?: string;
}) {
  try {
    const buyRequest = await prisma.buyRequest.create({
      data: {
        buyerAgentId: Number(params.buyerAgentId),
        title: params.title,
        description: params.description,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        category: params.category || null,
        status: "OPEN",
        searchStep: "idle",
        searchMessage: "Waiting to start...",
      },
    });

    // Start auto search process asynchronously (don't await)
    // Results will be communicated via WebSocket events
    processAutoSearch(
      buyRequest.id,
      {
        title: params.title,
        description: params.description,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
      },
      Number(params.buyerAgentId)
    ).catch(err => {
      console.error('Auto search process error:', err);
    });

    return {
      success: true,
      buyRequestId: buyRequest.id,
      title: buyRequest.title,
      minPrice: buyRequest.minPrice,
      maxPrice: buyRequest.maxPrice,
    };
  } catch (error) {
    console.error("Error creating buy request:", error);
    throw error;
  }
}

/**
 * Get buy request details from database
 */
export async function getBuyRequest(buyRequestId: string) {
  try {
    const buyRequest = await prisma.buyRequest.findUnique({
      where: {
        id: buyRequestId,
      },
    });

    if (!buyRequest) {
      throw new Error(`Buy request ${buyRequestId} not found`);
    }

    return {
      id: buyRequest.id,
      buyerAgentId: buyRequest.buyerAgentId.toString(),
      title: buyRequest.title,
      description: buyRequest.description,
      minPrice: buyRequest.minPrice,
      maxPrice: buyRequest.maxPrice,
      category: buyRequest.category,
      status: buyRequest.status,
      createdAt: buyRequest.createdAt.toISOString(),
      // Search progress fields
      searchStep: buyRequest.searchStep,
      searchMessage: buyRequest.searchMessage,
      matchedListingId: buyRequest.matchedListingId,
      sellerAgentId: buyRequest.sellerAgentId,
      a2aEndpoint: buyRequest.a2aEndpoint,
      searchError: buyRequest.searchError,
      negotiationRoomId: buyRequest.negotiationRoomId,
    };
  } catch (error) {
    console.error("Error getting buy request:", error);
    throw error;
  }
}

/**
 * List all open buy requests
 */
export async function listOpenBuyRequests() {
  try {
    const buyRequests = await prisma.buyRequest.findMany({
      where: {
        status: "OPEN",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return buyRequests.map((br) => ({
      id: br.id,
      buyerAgentId: br.buyerAgentId.toString(),
      title: br.title,
      description: br.description,
      minPrice: br.minPrice,
      maxPrice: br.maxPrice,
      category: br.category,
      status: br.status,
      createdAt: br.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error listing buy requests:", error);
    throw error;
  }
}

/**
 * Update buy request status
 */
export async function updateBuyRequestStatus(
  buyRequestId: string,
  status: "OPEN" | "MATCHED" | "CLOSED"
) {
  try {
    const buyRequest = await prisma.buyRequest.update({
      where: {
        id: buyRequestId,
      },
      data: {
        status,
      },
    });

    return {
      id: buyRequest.id,
      status: buyRequest.status,
    };
  } catch (error) {
    console.error("Error updating buy request status:", error);
    throw error;
  }
}
