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
