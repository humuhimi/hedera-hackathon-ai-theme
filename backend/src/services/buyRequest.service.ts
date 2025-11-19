/**
 * BuyRequest Service
 * Handles buy request operations (DB only, no blockchain)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      },
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
