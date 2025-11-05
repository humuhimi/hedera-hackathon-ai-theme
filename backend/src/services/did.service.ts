/**
 * DID Service - Official Hedera DID SDK Implementation
 * Uses @hashgraph/did-sdk-js (HIP-29 compliant)
 *
 * SECURITY NOTE:
 * - Server generates DID and keys
 * - Private key is returned ONCE to client over HTTPS
 * - Client must securely store the private key (encrypted)
 * - Server does NOT store private keys
 */
import {
  HcsIdentityNetworkBuilder,
  HcsIdentityNetwork,
  DidMethodOperation,
} from '@hashgraph/did-sdk-js';
import {
  Client,
  AccountId,
  TopicId,
  FileId,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk';

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';
const DID_TOPIC_ID = process.env.DID_TOPIC_ID;
const VC_TOPIC_ID = process.env.VC_TOPIC_ID;
const ADDRESS_BOOK_FILE_ID = process.env.ADDRESS_BOOK_FILE_ID;
const OPERATOR_ID = process.env.HEDERA_MANAGER_ACCOUNT_ID;
const OPERATOR_KEY = process.env.HEDERA_MANAGER_PRIVATE_KEY;

if (!DID_TOPIC_ID || !VC_TOPIC_ID || !ADDRESS_BOOK_FILE_ID) {
  console.warn('⚠️ DID_TOPIC_ID, VC_TOPIC_ID, or ADDRESS_BOOK_FILE_ID not set');
  console.warn('   Run setup script to create Identity Network');
}
if (!OPERATOR_ID || !OPERATOR_KEY) {
  console.warn('⚠️ HEDERA_MANAGER_ACCOUNT_ID/PRIVATE_KEY not set - DID operations will fail');
}

/**
 * Create Hedera client for DID operations
 */
function createClient(): Client {
  const client = HEDERA_NETWORK === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  if (OPERATOR_ID && OPERATOR_KEY) {
    const operatorId = AccountId.fromString(OPERATOR_ID);
    client.setOperator(operatorId, OPERATOR_KEY);
  }

  return client;
}

/**
 * Get or create Identity Network
 * If DID_TOPIC_ID exists, attempts to connect to existing network
 * Otherwise, creates new Identity Network
 */
async function getOrCreateIdentityNetwork(client: Client): Promise<HcsIdentityNetwork> {
  // If all IDs are set, try to use existing network
  if (DID_TOPIC_ID && VC_TOPIC_ID && ADDRESS_BOOK_FILE_ID) {
    console.log('📡 Using existing Identity Network');
    console.log('   DID Topic:', DID_TOPIC_ID);
    console.log('   VC Topic:', VC_TOPIC_ID);
    console.log('   Address Book:', ADDRESS_BOOK_FILE_ID);

    // Note: Official SDK doesn't have a direct way to connect to existing network
    // We use the constructor if available, or create a new builder
    try {
      // Try to construct from existing IDs
      const network = new HcsIdentityNetwork();
      (network as any)._network = HEDERA_NETWORK;
      (network as any)._didTopicId = TopicId.fromString(DID_TOPIC_ID);
      (network as any)._vcTopicId = TopicId.fromString(VC_TOPIC_ID);
      (network as any)._addressBookFileId = FileId.fromString(ADDRESS_BOOK_FILE_ID);
      return network;
    } catch (error) {
      console.warn('Failed to construct HcsIdentityNetwork from existing IDs, creating new network');
    }
  }

  // Create new Identity Network
  console.log('🏗️  Creating new Identity Network...');

  const operatorKey = PrivateKey.fromStringECDSA(OPERATOR_KEY!);
  const operatorPublicKey = operatorKey.publicKey;

  const identityNetwork = await new HcsIdentityNetworkBuilder()
    .setNetwork(HEDERA_NETWORK as 'mainnet' | 'testnet')
    .setAppnetName('JimoMarket')
    .setMaxTransactionFee(new Hbar(2))
    .setDidTopicMemo('Jimo Market DID Topic')
    .setVCTopicMemo('Jimo Market VC Topic')
    .setPublicKey(operatorPublicKey)
    .execute(client);

  console.log('✅ Identity Network created!');
  console.log('   DID Topic ID:', identityNetwork.getDidTopicId().toString());
  console.log('   VC Topic ID:', identityNetwork.getVcTopicId().toString());
  const addressBook = identityNetwork.getAddressBook();
  const addressBookFileId = addressBook.getFileId();
  console.log('   Address Book File ID:', addressBookFileId.toString());
  console.log();
  console.log('📝 Add these to your .env file:');
  console.log(`DID_TOPIC_ID=${identityNetwork.getDidTopicId().toString()}`);
  console.log(`VC_TOPIC_ID=${identityNetwork.getVcTopicId().toString()}`);
  console.log(`ADDRESS_BOOK_FILE_ID=${addressBookFileId.toString()}`);

  return identityNetwork;
}

/**
 * Generate and register DID
 *
 * SECURITY:
 * - Generates DID with new key pair on server
 * - Registers DID Document to HCS immediately
 * - Returns DID and private key to client (MUST be over HTTPS)
 * - Client MUST securely store the private key
 * - Server does NOT store private keys
 *
 * @returns DID information including private key (to be stored client-side)
 */
export async function generateAndRegisterDID(): Promise<{
  did: string;
  privateKey: string;
  publicKey: string;
  network: string;
  didTopicId: string;
  receipt: {
    status: string;
    topicSequenceNumber?: string;
  };
}> {
  const client = createClient();

  try {
    // Get or create Identity Network
    const identityNetwork = await getOrCreateIdentityNetwork(client);

    // Generate DID with new key pair
    console.log('🔑 Generating DID...');
    const hcsDid = identityNetwork.generateDid(true);
    const didRootKey = hcsDid.getPrivateDidRootKey();

    if (!didRootKey) {
      throw new Error('Failed to generate DID root key');
    }

    const did = hcsDid.toString();
    console.log('✅ DID generated:', did);

    // Generate DID Document
    console.log('📄 Creating DID Document...');
    const didDocument = hcsDid.generateDidDocument();

    // Register DID Document to HCS
    console.log('📤 Registering DID Document to HCS...');
    const response = await identityNetwork.createDidTransaction(DidMethodOperation.CREATE)
      .setDidDocument(didDocument.toJSON())
      .signMessage(doc => didRootKey.sign(doc))
      .buildAndSignTransaction(tx => tx.setMaxTransactionFee(new Hbar(2)))
      .execute(client);

    const receipt = await response.getReceipt(client);
    console.log('✅ DID Document registered!');
    console.log('   Status:', receipt.status.toString());

    return {
      did,
      privateKey: didRootKey.toString(),
      publicKey: didRootKey.publicKey.toString(),
      network: HEDERA_NETWORK,
      didTopicId: identityNetwork.getDidTopicId().toString(),
      receipt: {
        status: receipt.status.toString(),
        topicSequenceNumber: receipt.topicSequenceNumber?.toString(),
      },
    };
  } catch (error) {
    console.error('Failed to generate and register DID:', error);
    throw error;
  } finally {
    client.close();
  }
}
