/**
 * ERC-8004 Identity Registry Service
 *
 * Handles agent registration on blockchain using ERC-8004 protocol.
 * Stores agent metadata via Token URI and ownerDid via onchain metadata.
 */

import {
  Client,
  AccountId,
  PrivateKey,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
} from '@hashgraph/sdk';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { ipfsService } from './ipfs.service.js';

const prisma = new PrismaClient();

/**
 * Agent data for registration
 */
export interface AgentData {
  name: string;
  type: 'give' | 'want';
  description: string;
}

/**
 * Agent registration result
 */
export interface AgentRegistration {
  agentId: number;
  transactionId: string;
}

/**
 * Agent information from blockchain
 */
export interface AgentInfo {
  agentId: number;
  ownerAddress: string;
  ownerDid: string | null;
  tokenURI: string;
}

/**
 * ERC-8004 Registration File (Token URI content)
 */
interface RegistrationFile {
  type: string;
  name: string;
  description: string;
  agentType: 'give' | 'want';
  image?: string;
  endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
  }>;
  registrations: Array<{
    agentId: number;
    agentRegistry: string;
  }>;
}

class ERC8004Service {
  private client: Client | null = null;
  private identityRegistryId: string;

  constructor() {
    // Load deployment info
    const deploymentPath = path.join(process.cwd(), '..', 'erc8004-deployment-testnet.json');

    if (!fs.existsSync(deploymentPath)) {
      throw new Error(
        `Deployment file not found: ${deploymentPath}\n` +
        'Please deploy ERC-8004 contracts first.'
      );
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    this.identityRegistryId = deployment.contracts.identityRegistry.contractId;

    console.log(`✅ ERC8004Service initialized`);
    console.log(`   Identity Registry: ${this.identityRegistryId}`);
  }

  /**
   * Initialize Hedera client
   */
  private getClient(): Client {
    if (this.client) {
      return this.client;
    }

    const network = process.env.HEDERA_NETWORK;
    if (!network) {
      throw new Error('HEDERA_NETWORK must be set');
    }

    const operatorId = process.env.HEDERA_MANAGER_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_MANAGER_PRIVATE_KEY;

    if (!operatorId || !operatorKey) {
      throw new Error('HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set');
    }

    this.client = network === 'testnet'
      ? Client.forTestnet()
      : Client.forMainnet();

    this.client.setOperator(
      AccountId.fromString(operatorId),
      PrivateKey.fromStringECDSA(operatorKey)
    );

    return this.client;
  }

  /**
   * Generate Token URI for agent
   * Uploads metadata to IPFS via Pinata
   */
  private async generateTokenURI(
    agentData: AgentData,
    agentId: number
  ): Promise<string> {
    // Determine chain ID based on network (HIP-30)
    // eip155:295 = Hedera Mainnet
    // eip155:296 = Hedera Testnet
    const network = process.env.HEDERA_NETWORK;
    const chainId = network === 'testnet' ? '296' : '295';

    const registrationFile: RegistrationFile = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: agentData.name,
      description: agentData.description,
      agentType: agentData.type,
      endpoints: [
        {
          name: 'agentType',
          endpoint: agentData.type,
        },
      ],
      registrations: [
        {
          agentId: agentId,
          agentRegistry: `eip155:${chainId}:${this.identityRegistryId}`,
        },
      ],
    };

    return await ipfsService.uploadMetadata(registrationFile);
  }

  /**
   * Register a new agent on the blockchain
   *
   * Process:
   * 1. Generate Token URI with agent metadata
   * 2. Call register(tokenURI) to get agentId
   * 3. Set onchain metadata (ownerDid)
   *
   * @param userId User ID in database
   * @param agentData Agent information (name, type, description)
   * @returns AgentRegistration with agentId and transactionId
   */
  async registerAgent(
    userId: string,
    agentData: AgentData
  ): Promise<AgentRegistration> {
    const client = this.getClient();

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.did) {
      throw new Error('User must have a DID registered');
    }

    console.log(`📝 Registering agent on blockchain...`);
    console.log(`   Agent Name: ${agentData.name}`);
    console.log(`   Agent Type: ${agentData.type}`);
    console.log(`   User DID: ${user.did}`);

    // Step 1: Call register() with placeholder tokenURI to get agentId
    console.log('\n1️⃣  Calling register()...');
    const registerTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(500000)
      .setFunction('register');

    const registerSubmit = await registerTx.execute(client);
    await registerSubmit.getReceipt(client);
    const registerRecord = await registerSubmit.getRecord(client);

    const functionResult = registerRecord.contractFunctionResult;
    if (!functionResult) {
      throw new Error('No function result from register()');
    }

    const agentId = functionResult.getUint256(0).toNumber();
    const txId = registerSubmit.transactionId.toString();
    const network = process.env.HEDERA_NETWORK || 'testnet';

    console.log(`✅ Agent registered! agentId: ${agentId}`);
    console.log(`   Transaction ID: ${txId}`);
    console.log(`   HashScan: https://hashscan.io/${network}/transaction/${txId}`);

    // Step 2: Generate Token URI with agentId
    console.log('\n2️⃣  Generating Token URI...');
    const tokenURI = await this.generateTokenURI(agentData, agentId);
    console.log(`   Token URI: ${tokenURI.substring(0, 100)}...`);

    // Step 3: Set Token URI
    console.log('\n3️⃣  Setting Token URI...');
    const setUriParams = new ContractFunctionParameters()
      .addUint256(agentId)
      .addString(tokenURI);

    const setUriTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(300000)
      .setFunction('setAgentUri', setUriParams);

    const setUriSubmit = await setUriTx.execute(client);
    await setUriSubmit.getReceipt(client);
    const setUriTxId = setUriSubmit.transactionId.toString();

    console.log('✅ Token URI set successfully');
    console.log(`   Transaction ID: ${setUriTxId}`);

    // Step 4: Set onchain metadata (ownerDid only)
    console.log('\n4️⃣  Setting agent metadata (ownerDid)...');
    const metadataParams = new ContractFunctionParameters()
      .addUint256(agentId)
      .addString('ownerDid')
      .addBytes(Buffer.from(user.did, 'utf-8'));

    const metadataTx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(300000)
      .setFunction('setMetadata', metadataParams);

    const metadataSubmit = await metadataTx.execute(client);
    await metadataSubmit.getReceipt(client);
    const metadataTxId = metadataSubmit.transactionId.toString();

    console.log('✅ Metadata set successfully');
    console.log(`   Transaction ID: ${metadataTxId}`);
    console.log(`\n🎉 Agent registration complete!`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Agent Name: ${agentData.name}`);
    console.log(`   Owner DID: ${user.did}`);
    console.log(`\n📍 Verification:`);
    console.log(`   Contract: https://hashscan.io/${network}/contract/${this.identityRegistryId}`);
    console.log(`   Agent NFT: Token ID ${agentId}`);

    return {
      agentId,
      transactionId: registerSubmit.transactionId.toString(),
    };
  }

  /**
   * Get agent information from blockchain
   */
  async getAgentInfo(agentId: number): Promise<AgentInfo> {
    const client = this.getClient();

    console.log(`🔍 Fetching agent info for ID: ${agentId}`);

    // Get agent owner address
    const ownerOfParams = new ContractFunctionParameters().addUint256(agentId);

    const ownerOfQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(100000)
      .setFunction('ownerOf', ownerOfParams);

    const ownerOfResult = await ownerOfQuery.execute(client);
    const ownerAddress = `0x${ownerOfResult.getAddress(0)}`;

    // Get Token URI
    const tokenUriParams = new ContractFunctionParameters().addUint256(agentId);

    const tokenUriQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(100000)
      .setFunction('tokenURI', tokenUriParams);

    const tokenUriResult = await tokenUriQuery.execute(client);
    const tokenURI = tokenUriResult.getString(0);

    // Get metadata (owner DID)
    const metadataParams = new ContractFunctionParameters()
      .addUint256(agentId)
      .addString('ownerDid');

    const metadataQuery = new ContractCallQuery()
      .setContractId(ContractId.fromString(this.identityRegistryId))
      .setGas(100000)
      .setFunction('getMetadata', metadataParams);

    const metadataResult = await metadataQuery.execute(client);
    const ownerDidBytes = metadataResult.asBytes();
    const ownerDid = ownerDidBytes.length > 0
      ? Buffer.from(ownerDidBytes).toString('utf-8')
      : null;

    console.log(`✅ Agent info retrieved`);
    console.log(`   Owner Address: ${ownerAddress}`);
    console.log(`   Token URI: ${tokenURI.substring(0, 80)}...`);
    console.log(`   Owner DID: ${ownerDid || '(not set)'}`);

    return {
      agentId,
      ownerAddress,
      ownerDid,
      tokenURI,
    };
  }

  /**
   * Close Hedera client connection
   */
  close() {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

export const erc8004Service = new ERC8004Service();
