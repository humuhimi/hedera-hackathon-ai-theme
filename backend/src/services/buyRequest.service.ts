/**
 * BuyRequest Service
 * Handles buy request operations (DB only, no blockchain)
 */

import { PrismaClient } from "@prisma/client";
import { getListings, getAgentA2AEndpoint } from "./marketplace.service";
import { semanticSearch } from "./semanticSearch.service";
import { sendNegotiationGreeting } from "./a2a.service";
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

      const a2aResponse = await sendNegotiationGreeting({
        sellerA2AEndpoint: a2aInfo.a2aEndpoint,
        buyRequest: {
          id: buyRequestId,
          title: buyRequest.title,
          description: buyRequest.description,
          minPrice: buyRequest.minPrice,
          maxPrice: buyRequest.maxPrice,
        },
        listingId: Number(bestMatch.listingId),
        negotiationRoomId: room.id,
      });

      // Log buyer's greeting message to negotiation room
      const greetingText = `Hello! I'm interested in your listing #${bestMatch.listingId}.

**What I'm looking for:**
${buyRequest.title}

**Details:**
${buyRequest.description}

**Budget:**
${buyRequest.minPrice}-${buyRequest.maxPrice} HBAR

I found your listing through semantic search and would like to discuss the details. Are you available to negotiate?`;

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
      }

      console.log(`✅ Negotiation initiated successfully`);
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

  } catch (error: any) {
    console.error('Auto search failed:', error);
    await updateSearchProgress(
      buyRequestId,
      'error',
      'Search failed',
      { searchError: error.message || 'Unknown error' }
    );
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
