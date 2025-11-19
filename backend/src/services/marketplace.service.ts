/**
 * Marketplace Service
 * Handles interactions with Marketplace smart contract on Hedera
 */

import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
} from "@hashgraph/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MARKETPLACE_CONTRACT_ID = process.env.MARKETPLACE_CONTRACT_ID;

if (!MARKETPLACE_CONTRACT_ID) {
  throw new Error("MARKETPLACE_CONTRACT_ID not set in environment");
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
      inquiryId: inquiryId?.toString(),
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

