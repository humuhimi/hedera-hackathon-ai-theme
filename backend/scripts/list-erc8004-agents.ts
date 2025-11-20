/**
 * ERC-8004 Agent Discovery Test
 * オンチェーンから登録済みエージェント一覧を取得
 */

import {
  Client,
  AccountId,
  PrivateKey,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractId,
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DEPLOYMENT_PATH = path.join(__dirname, '..', '..', 'erc8004-deployment-testnet.json');

async function main() {
  // Load deployment info
  if (!fs.existsSync(DEPLOYMENT_PATH)) {
    throw new Error(`Deployment file not found: ${DEPLOYMENT_PATH}`);
  }

  const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf-8'));
  const identityRegistryId = deployment.contracts.identityRegistry.contractId;

  console.log('🔍 ERC-8004 Agent Discovery');
  console.log('='.repeat(60));
  console.log(`Identity Registry: ${identityRegistryId}`);
  console.log('');

  // Initialize Hedera client
  const operatorId = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const operatorKey = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error('HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set');
  }

  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromStringECDSA(operatorKey)
  );

  // Try to get agents by iterating through IDs
  // ERC-721 doesn't have totalSupply by default, so we'll try IDs until we hit an error
  const agents: any[] = [];
  let agentId = 0;
  const maxAttempts = 100; // Safety limit

  console.log('📋 Fetching registered agents...\n');

  while (agentId < maxAttempts) {
    try {
      // Try to get owner of this agentId
      const ownerOfParams = new ContractFunctionParameters().addUint256(agentId);

      const ownerOfQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(identityRegistryId))
        .setGas(100000)
        .setFunction('ownerOf', ownerOfParams);

      const ownerOfResult = await ownerOfQuery.execute(client);
      const ownerAddress = '0x' + ownerOfResult.getAddress(0);

      // Get Token URI
      const tokenUriParams = new ContractFunctionParameters().addUint256(agentId);

      const tokenUriQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(identityRegistryId))
        .setGas(100000)
        .setFunction('tokenURI', tokenUriParams);

      const tokenUriResult = await tokenUriQuery.execute(client);
      const tokenURI = tokenUriResult.getString(0);

      // Get agentType metadata
      const agentTypeParams = new ContractFunctionParameters()
        .addUint256(agentId)
        .addString('agentType');

      const agentTypeQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(identityRegistryId))
        .setGas(100000)
        .setFunction('getMetadata', agentTypeParams);

      const agentTypeResult = await agentTypeQuery.execute(client);
      const agentTypeBytes = agentTypeResult.asBytes();
      const agentType = agentTypeBytes.length > 0
        ? Buffer.from(agentTypeBytes).toString('utf-8').replace(/\0/g, '')
        : '(not set)';

      // Get ownerDid metadata
      const ownerDidParams = new ContractFunctionParameters()
        .addUint256(agentId)
        .addString('ownerDid');

      const ownerDidQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(identityRegistryId))
        .setGas(100000)
        .setFunction('getMetadata', ownerDidParams);

      const ownerDidResult = await ownerDidQuery.execute(client);
      const ownerDidBytes = ownerDidResult.asBytes();
      const ownerDid = ownerDidBytes.length > 0
        ? Buffer.from(ownerDidBytes).toString('utf-8').replace(/\0/g, '')
        : '(not set)';

      agents.push({
        agentId,
        ownerAddress,
        agentType,
        ownerDid,
        tokenURI: tokenURI.substring(0, 80) + (tokenURI.length > 80 ? '...' : ''),
      });

      console.log(`✅ Agent #${agentId}`);
      console.log(`   Type: ${agentType}`);
      console.log(`   Owner: ${ownerAddress}`);
      console.log(`   DID: ${ownerDid}`);
      console.log('');

      agentId++;
    } catch (error: any) {
      // If we get an error, we've reached the end of registered agents
      if (error.message?.includes('ERC721') || error.message?.includes('invalid token')) {
        break;
      }
      // Stop on any error to avoid infinite loop
      break;
    }
  }

  console.log('='.repeat(60));
  console.log(`📊 Total agents found: ${agents.length}`);
  console.log('');

  // Group by type
  const sellerAgents = agents.filter(a => a.agentType === 'give');
  const buyerAgents = agents.filter(a => a.agentType === 'want');

  console.log(`🏪 Seller Agents (give): ${sellerAgents.length}`);
  console.log(`🛒 Buyer Agents (want): ${buyerAgents.length}`);
  console.log('');

  // Output JSON
  console.log('📄 JSON Output:');
  console.log(JSON.stringify(agents, null, 2));

  client.close();
}

main().catch(console.error);
