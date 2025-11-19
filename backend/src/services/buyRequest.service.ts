/**
 * BuyRequest Service
 * Handles buy request operations (DB only, no blockchain)
 */

import { PrismaClient } from "@prisma/client";
import { getListings, getAgentA2AEndpoint } from "./marketplace.service";
import { io } from "../server";

const prisma = new PrismaClient();

type SearchStep = 'idle' | 'searching' | 'found' | 'verifying' | 'verified' | 'contacting' | 'contacted' | 'negotiating' | 'complete' | 'error' | 'no_results';

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
  });
}

/**
 * Process automatic search for a buy request
 * This runs asynchronously after the buy request is created
 */
async function processAutoSearch(buyRequestId: string, searchQuery: string, maxPrice: number) {
  try {
    // Step 1: Search listings
    await updateSearchProgress(buyRequestId, 'searching', 'Searching for matching listings...');

    const listingsResult = await getListings({
      status: 'OPEN',
      search: searchQuery,
    });

    if (!listingsResult.listings || listingsResult.listings.length === 0) {
      await updateSearchProgress(buyRequestId, 'no_results', 'No matching listings found');
      return;
    }

    // Filter by price
    const affordableListings = listingsResult.listings.filter(
      (l: any) => l.basePrice <= maxPrice
    );

    if (affordableListings.length === 0) {
      await updateSearchProgress(buyRequestId, 'no_results', 'No listings within budget found');
      return;
    }

    await updateSearchProgress(
      buyRequestId,
      'found',
      `Found ${affordableListings.length} matching listing(s)`
    );

    // Step 2: Select best match and verify on-chain
    const bestMatch = affordableListings[0];
    await updateSearchProgress(
      buyRequestId,
      'verifying',
      `Verifying listing #${bestMatch.listingId} on-chain...`,
      { matchedListingId: bestMatch.listingId, sellerAgentId: bestMatch.sellerAgentId }
    );

    // TODO: Add actual on-chain verification here
    // For now, assume verified
    await updateSearchProgress(
      buyRequestId,
      'verified',
      `Listing #${bestMatch.listingId} verified`,
      { matchedListingId: bestMatch.listingId, sellerAgentId: bestMatch.sellerAgentId }
    );

    // Step 3: Get A2A endpoint
    await updateSearchProgress(
      buyRequestId,
      'contacting',
      `Getting A2A endpoint for Agent #${bestMatch.sellerAgentId}...`,
      { matchedListingId: bestMatch.listingId, sellerAgentId: bestMatch.sellerAgentId }
    );

    const a2aInfo = await getAgentA2AEndpoint(bestMatch.sellerAgentId);

    await updateSearchProgress(
      buyRequestId,
      'contacted',
      'A2A endpoint resolved',
      {
        matchedListingId: bestMatch.listingId,
        sellerAgentId: bestMatch.sellerAgentId,
        a2aEndpoint: a2aInfo.a2aEndpoint
      }
    );

    // Step 4: Initiate negotiation
    await updateSearchProgress(
      buyRequestId,
      'negotiating',
      'Initiating negotiation with seller agent...',
      {
        matchedListingId: bestMatch.listingId,
        sellerAgentId: bestMatch.sellerAgentId,
        a2aEndpoint: a2aInfo.a2aEndpoint
      }
    );

    // TODO: Send actual A2A negotiation request here

    // Complete
    await updateSearchProgress(
      buyRequestId,
      'complete',
      'Agent connection established! Ready to negotiate.',
      {
        matchedListingId: bestMatch.listingId,
        sellerAgentId: bestMatch.sellerAgentId,
        a2aEndpoint: a2aInfo.a2aEndpoint
      }
    );

    // Update status to MATCHED
    await prisma.buyRequest.update({
      where: { id: buyRequestId },
      data: { status: 'MATCHED' },
    });

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
    processAutoSearch(buyRequest.id, params.title, params.maxPrice).catch(err => {
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
