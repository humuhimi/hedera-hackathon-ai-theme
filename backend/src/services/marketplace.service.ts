/**
 * Marketplace Service
 * Handles interactions with Marketplace smart contract on Hedera
 */

import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
} from "@hashgraph/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MARKETPLACE_CONTRACT_ID = process.env.MARKETPLACE_CONTRACT_ID;
const ERC8004_IDENTITY_REGISTRY = process.env.ERC8004_IDENTITY_REGISTRY;

if (!MARKETPLACE_CONTRACT_ID) {
  throw new Error("MARKETPLACE_CONTRACT_ID not set in environment");
}

if (!ERC8004_IDENTITY_REGISTRY) {
  throw new Error("ERC8004_IDENTITY_REGISTRY not set in environment");
}

/**
 * Create a Hedera client for the given account
 */
function createClient(accountId: string, privateKey: string): Client {
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(accountId),
    PrivateKey.fromStringECDSA(privateKey)
  );
  return client;
}

/**
 * Create a listing on the Marketplace
 */
export async function createListing(params: {
  sellerAgentId: string | number;
  title: string;
  description: string;
  basePrice: number; // in HBAR
  expectedPrice: number; // in HBAR
  accountId: string;
  privateKey: string;
}) {
  const client = createClient(params.accountId, params.privateKey);

  try {
    const functionParams = new ContractFunctionParameters()
      .addUint256(Number(params.sellerAgentId))
      .addString(params.title)
      .addString(params.description)
      .addUint256(Math.floor(params.basePrice * 100_000_000)) // HBAR to tinybar
      .addUint256(Math.floor(params.expectedPrice * 100_000_000));

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(300000)
      .setFunction("createListing", functionParams);

    const txResponse = await tx.execute(client);
    await txResponse.getReceipt(client);
    const record = await txResponse.getRecord(client);

    const listingId = record.contractFunctionResult?.getUint256(0);
    if (!listingId) {
      throw new Error("Failed to retrieve listing ID from contract");
    }
    const transactionId = txResponse.transactionId.toString();

    // Save to database
    await prisma.listing.create({
      data: {
        listingId: listingId.toString(),
        sellerAgentId: Number(params.sellerAgentId),
        title: params.title,
        description: params.description,
        basePrice: params.basePrice,
        expectedPrice: params.expectedPrice,
        status: "OPEN",
        transactionId: transactionId,
      },
    });

    return {
      success: true,
      listingId: listingId?.toString(),
      transactionId: transactionId,
      fee: Number(record.transactionFee.toTinybars()) / 100_000_000,
    };
  } catch (error) {
    console.error("Error creating listing:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Get all listings from database with optional filters
 */
export async function getListings(params?: {
  status?: string;
  sellerAgentId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.sellerAgentId) {
      where.sellerAgentId = params.sellerAgentId;
    }

    if (params?.search) {
      where.OR = [
        { title: { contains: params.search } },
        { description: { contains: params.search } },
      ];
    }

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params?.limit || 100,
      skip: params?.offset || 0,
    });

    return listings.map(listing => ({
      listingId: listing.listingId,
      sellerAgentId: listing.sellerAgentId,
      title: listing.title,
      description: listing.description,
      basePrice: listing.basePrice,
      expectedPrice: listing.expectedPrice,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      transactionId: listing.transactionId,
    }));
  } catch (error) {
    console.error("Error getting listings:", error);
    throw error;
  }
}

/**
 * Get listing details from database
 */
export async function getListing(listingId: number) {
  try {
    const listing = await prisma.listing.findUnique({
      where: {
        listingId: listingId.toString(),
      },
    });

    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    return {
      listingId: listing.listingId,
      sellerAgentId: listing.sellerAgentId.toString(),
      title: listing.title,
      description: listing.description,
      basePrice: listing.basePrice,
      expectedPrice: listing.expectedPrice,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      transactionId: listing.transactionId,
    };
  } catch (error) {
    console.error("Error getting listing:", error);
    throw error;
  }
}

/**
 * Get listing with on-chain verification
 * Fetches from DB and verifies against blockchain data
 */
export async function getListingVerified(listingId: number) {
  const operatorId = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set");
  }

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringECDSA(operatorKey)
  );

  try {
    // Get from DB first
    const dbListing = await prisma.listing.findUnique({
      where: {
        listingId: listingId.toString(),
      },
    });

    if (!dbListing) {
      throw new Error(`Listing ${listingId} not found in database`);
    }

    // Fetch from blockchain for verification
    const params = new ContractFunctionParameters().addUint256(listingId);

    const query = new ContractCallQuery()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID!))
      .setGas(100000)
      .setFunction("getListing", params);

    const result = await query.execute(client);

    // Parse on-chain listing data
    // Listing struct: sellerAgentId, title, description, basePrice, expectedPrice, status, timestamp
    const onChainSellerAgentId = result.getUint256(0);
    const onChainTitle = result.getString(1);
    const onChainBasePrice = Number(result.getUint256(3)) / 100_000_000; // tinybar to HBAR
    const onChainExpectedPrice = Number(result.getUint256(4)) / 100_000_000;
    const onChainStatus = result.getUint8(5); // 0=OPEN, 1=RESERVED, 2=COMPLETED, 3=CANCELLED

    const statusMap: { [key: number]: string } = {
      0: "OPEN",
      1: "RESERVED",
      2: "COMPLETED",
      3: "CANCELLED",
    };

    // Verify data integrity
    const verified =
      dbListing.sellerAgentId === Number(onChainSellerAgentId) &&
      dbListing.title === onChainTitle &&
      Math.abs(dbListing.basePrice - onChainBasePrice) < 0.0001 &&
      Math.abs(dbListing.expectedPrice - onChainExpectedPrice) < 0.0001;

    return {
      listingId: dbListing.listingId,
      sellerAgentId: dbListing.sellerAgentId,
      title: dbListing.title,
      description: dbListing.description,
      basePrice: dbListing.basePrice,
      expectedPrice: dbListing.expectedPrice,
      status: dbListing.status,
      createdAt: dbListing.createdAt.toISOString(),
      transactionId: dbListing.transactionId,
      // Verification info
      verified,
      onChain: {
        sellerAgentId: Number(onChainSellerAgentId),
        title: onChainTitle,
        basePrice: onChainBasePrice,
        expectedPrice: onChainExpectedPrice,
        status: statusMap[onChainStatus] || "UNKNOWN",
      },
    };
  } catch (error) {
    console.error("Error getting verified listing:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Create an inquiry on a listing
 */
export async function createInquiry(params: {
  buyerAgentId: string | number;
  listingId: string | number;
  offerPrice: number; // in HBAR
  message: string;
  accountId: string;
  privateKey: string;
}) {
  const client = createClient(params.accountId, params.privateKey);

  try {
    // Placeholder hashes for VC verification (same pattern as listing)
    const placeholderHash = Buffer.alloc(32, 0);

    const functionParams = new ContractFunctionParameters()
      .addUint256(Number(params.buyerAgentId))
      .addUint256(Number(params.listingId))
      .addUint256(Math.floor(params.offerPrice * 100_000_000)) // HBAR to tinybar
      .addString(params.message)
      .addBytes32(placeholderHash) // mandateVcHash
      .addBytes32(placeholderHash) // claimedAttributesHash
      .addBytes32(placeholderHash); // claimedCapabilitiesHash

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(MARKETPLACE_CONTRACT_ID))
      .setGas(300000)
      .setFunction("createInquiry", functionParams);

    const txResponse = await tx.execute(client);
    await txResponse.getReceipt(client);
    const record = await txResponse.getRecord(client);

    const inquiryId = record.contractFunctionResult?.getUint256(0);
    if (!inquiryId) {
      throw new Error("Failed to retrieve inquiry ID from contract");
    }
    const transactionId = txResponse.transactionId.toString();

    // Save to database
    await prisma.inquiry.create({
      data: {
        inquiryId: inquiryId.toString(),
        listingId: params.listingId.toString(),
        buyerAgentId: Number(params.buyerAgentId),
        offerPrice: params.offerPrice,
        message: params.message,
        status: "PENDING",
        transactionId: transactionId,
      },
    });

    return {
      success: true,
      inquiryId: inquiryId.toString(),
      transactionId: transactionId,
      fee: Number(record.transactionFee.toTinybars()) / 100_000_000,
    };
  } catch (error) {
    console.error("Error creating inquiry:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Get A2A endpoint for an agent from ERC-8004 registry
 * Fetches tokenURI, retrieves IPFS metadata, and extracts A2A endpoint
 */
export async function getAgentA2AEndpoint(agentId: number) {
  const operatorId = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error("HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set");
  }

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringECDSA(operatorKey)
  );

  try {
    // Get tokenURI from ERC-8004 contract
    const params = new ContractFunctionParameters().addUint256(agentId);

    const query = new ContractCallQuery()
      .setContractId(ContractId.fromString(ERC8004_IDENTITY_REGISTRY!))
      .setGas(100000)
      .setFunction("tokenURI", params);

    const result = await query.execute(client);
    const tokenURI = result.getString(0);

    if (!tokenURI) {
      throw new Error(`No tokenURI found for agent ${agentId}`);
    }

    // Fetch IPFS metadata
    // Convert ipfs:// to gateway URL
    const ipfsGateway = "https://gateway.pinata.cloud/ipfs/";
    const metadataUrl = tokenURI.replace("ipfs://", ipfsGateway);

    const metadataResponse = await fetch(metadataUrl);
    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch agent metadata from ${metadataUrl}`);
    }

    const metadata = await metadataResponse.json();

    // Find A2A endpoint in endpoints array
    const a2aEndpoint = metadata.endpoints?.find(
      (ep: { name: string; endpoint: string }) => ep.name === 'a2a'
    );

    if (!a2aEndpoint) {
      throw new Error(`No A2A endpoint found for agent ${agentId}`);
    }

    return {
      agentId,
      tokenURI,
      a2aEndpoint: a2aEndpoint.endpoint,
      a2aVersion: a2aEndpoint.version || 'unknown',
      metadata: {
        name: metadata.name,
        description: metadata.description,
        agentType: metadata.agentType,
        ownerDid: metadata.ownerDid,
      },
    };
  } catch (error) {
    console.error("Error getting agent A2A endpoint:", error);
    throw error;
  } finally {
    client.close();
  }
}

/**
 * Get inquiry details from database
 */
export async function getInquiry(inquiryId: number) {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: {
        inquiryId: inquiryId.toString(),
      },
      include: {
        listing: true,
      },
    });

    if (!inquiry) {
      throw new Error(`Inquiry ${inquiryId} not found`);
    }

    return {
      inquiryId: inquiry.inquiryId,
      listingId: inquiry.listingId,
      buyerAgentId: inquiry.buyerAgentId.toString(),
      offerPrice: inquiry.offerPrice,
      message: inquiry.message,
      status: inquiry.status,
      createdAt: inquiry.createdAt.toISOString(),
      transactionId: inquiry.transactionId,
      listing: {
        title: inquiry.listing.title,
        description: inquiry.listing.description,
        basePrice: inquiry.listing.basePrice,
        expectedPrice: inquiry.listing.expectedPrice,
      },
    };
  } catch (error) {
    console.error("Error getting inquiry:", error);
    throw error;
  }
}

