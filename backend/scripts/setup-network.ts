/**
 * Setup HCS Identity Network for Jimo Market
 * Creates DID Topic and Address Book File on Hedera testnet
 * Run once to initialize the network, then save the IDs to .env
 */
import { Client, PrivateKey, AccountId } from '@hashgraph/sdk';
import { HcsIdentityNetworkBuilder } from '@hashgraph/did-sdk-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupNetwork() {
  console.log('🚀 Setting up HCS Identity Network...\n');

  // Get manager account from environment
  const managerAccountId = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const managerPrivateKey = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!managerAccountId || !managerPrivateKey) {
    throw new Error('HEDERA_MANAGER_ACCOUNT_ID and HEDERA_MANAGER_PRIVATE_KEY must be set in .env');
  }

  // Create Hedera client
  const client = Client.forTestnet();
  client.setOperator(
    AccountId.fromString(managerAccountId),
    PrivateKey.fromString(managerPrivateKey)
  );

  try {
    console.log('📝 Creating HCS Identity Network...');
    console.log(`   Using manager account: ${managerAccountId}\n`);

    // Create network infrastructure
    const network = await new HcsIdentityNetworkBuilder()
      .setNetwork('testnet')
      .buildAndSignTopicCreateTransaction(tx => tx)
      .buildAndSignFileCreateTransaction(tx => tx)
      .execute(client);

    console.log('✅ Network created successfully!\n');
    console.log('📋 Add this to your .env file:\n');
    console.log(`DID_TOPIC_ID=${network.getDidTopicId()}\n`);

    console.log('⚠️  Save this ID - you will need it for DID operations');
  } catch (error) {
    console.error('❌ Failed to create network:', error);
    throw error;
  } finally {
    client.close();
  }
}

// Run setup
setupNetwork()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
