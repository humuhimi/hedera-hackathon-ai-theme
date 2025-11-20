import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ListingWithNegotiation {
  id: string;
  listingId: string;
  sellerAgentId: number;
  title: string;
  description: string;
  basePrice: number;
  expectedPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  negotiation?: {
    roomId: string;
    buyerAgentId: number | null;
    status: string;
    agreedPrice: number | null;
    negotiationUrl: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BuyRequestWithNegotiation {
  id: string;
  buyerAgentId: number;
  title: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  status: string;
  searchStep: string;
  matchedListingId: number | null;
  createdAt: string;
  updatedAt: string;
  negotiation?: {
    roomId: string;
    sellerAgentId: number;
    listingId: string;
    status: string;
    agreedPrice: number | null;
    negotiationUrl: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface UserActivity {
  listings: ListingWithNegotiation[];
  buyRequests: BuyRequestWithNegotiation[];
}

/**
 * Get user's all activity: listings and buy requests with negotiation status
 */
export async function getUserActivity(userId: string): Promise<UserActivity> {
  try {
    console.log(`📊 Fetching activity for user ${userId}`);

    // 1. Get all user's agents
    const agents = await prisma.agent.findMany({
      where: { userId },
      select: { erc8004AgentId: true, type: true }
    });

    console.log(`   Found ${agents.length} agents`);

    const sellerAgentIds = agents.filter(a => a.type === 'give').map(a => a.erc8004AgentId!);
    const buyerAgentIds = agents.filter(a => a.type === 'want').map(a => a.erc8004AgentId!);

    // 2. Get all listings created by user's seller agents
    const listings = await prisma.listing.findMany({
      where: {
        sellerAgentId: { in: sellerAgentIds }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Found ${listings.length} listings`);

    // 3. For each listing, get its negotiation room
    const listingsWithNegotiation: ListingWithNegotiation[] = await Promise.all(
      listings.map(async (listing) => {
        const negotiationRoom = await prisma.negotiationRoom.findUnique({
          where: { listingId: listing.listingId }
        });

        return {
          id: listing.id,
          listingId: listing.listingId,
          sellerAgentId: listing.sellerAgentId,
          title: listing.title,
          description: listing.description,
          basePrice: listing.basePrice,
          expectedPrice: listing.expectedPrice,
          status: listing.status,
          createdAt: listing.createdAt.toISOString(),
          updatedAt: listing.updatedAt.toISOString(),
          negotiation: negotiationRoom ? {
            roomId: negotiationRoom.id,
            buyerAgentId: negotiationRoom.buyerAgentId,
            status: negotiationRoom.status,
            agreedPrice: negotiationRoom.agreedPrice,
            negotiationUrl: `${process.env.FRONTEND_URL}/negotiation/${negotiationRoom.id}`,
            createdAt: negotiationRoom.createdAt.toISOString(),
            updatedAt: negotiationRoom.updatedAt.toISOString(),
          } : undefined
        };
      })
    );

    // 4. Get all buy requests created by user's buyer agents
    const buyRequests = await prisma.buyRequest.findMany({
      where: {
        buyerAgentId: { in: buyerAgentIds }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Found ${buyRequests.length} buy requests`);

    // 5. For each buy request, get its negotiation room if negotiationRoomId exists
    const buyRequestsWithNegotiation: BuyRequestWithNegotiation[] = await Promise.all(
      buyRequests.map(async (buyRequest) => {
        let negotiationRoom = null;

        if (buyRequest.negotiationRoomId) {
          negotiationRoom = await prisma.negotiationRoom.findUnique({
            where: { id: buyRequest.negotiationRoomId }
          });
        }

        return {
          id: buyRequest.id,
          buyerAgentId: buyRequest.buyerAgentId,
          title: buyRequest.title,
          description: buyRequest.description,
          minPrice: buyRequest.minPrice,
          maxPrice: buyRequest.maxPrice,
          status: buyRequest.status,
          searchStep: buyRequest.searchStep,
          matchedListingId: buyRequest.matchedListingId,
          createdAt: buyRequest.createdAt.toISOString(),
          updatedAt: buyRequest.updatedAt.toISOString(),
          negotiation: negotiationRoom ? {
            roomId: negotiationRoom.id,
            sellerAgentId: negotiationRoom.sellerAgentId,
            listingId: negotiationRoom.listingId,
            status: negotiationRoom.status,
            agreedPrice: negotiationRoom.agreedPrice,
            negotiationUrl: `${process.env.FRONTEND_URL}/negotiation/${negotiationRoom.id}`,
            createdAt: negotiationRoom.createdAt.toISOString(),
            updatedAt: negotiationRoom.updatedAt.toISOString(),
          } : undefined
        };
      })
    );

    console.log(`✅ User activity fetched successfully`);

    return {
      listings: listingsWithNegotiation,
      buyRequests: buyRequestsWithNegotiation
    };

  } catch (error) {
    console.error('Error fetching user activity:', error);
    throw error;
  }
}
