import {
  DidMethodOperation,
  HcsIdentityNetworkBuilder,
} from '@hashgraph/did-sdk-js';
import {
  Client,
  Hbar,
  PrivateKey,
} from '@hashgraph/sdk';

function getConfig() {
  const HEDERA_NETWORK = process.env.HEDERA_NETWORK;
  const OPERATOR_ID = process.env.HEDERA_MANAGER_ACCOUNT_ID;
  const OPERATOR_KEY = process.env.HEDERA_MANAGER_PRIVATE_KEY;

  if (!HEDERA_NETWORK) {
    throw new Error('HEDERA_NETWORK not set');
  }

  if (HEDERA_NETWORK !== 'mainnet' && HEDERA_NETWORK !== 'testnet') {
    throw new Error(`Unsupported HEDERA_NETWORK "${HEDERA_NETWORK}" for DID operations`);
  }

  if (!OPERATOR_ID || !OPERATOR_KEY) {
    throw new Error('HEDERA_MANAGER_ACCOUNT_ID/PRIVATE_KEY not set');
  }

  return { HEDERA_NETWORK, OPERATOR_ID, OPERATOR_KEY };
}

let networkCache: any = null;

export async function generateDID(): Promise<{
  did: string;
  privateKey: string;
  publicKey: string;
  network: string;
  didTopicId: string;
}> {
  const { HEDERA_NETWORK, OPERATOR_ID, OPERATOR_KEY } = getConfig();

  const client = HEDERA_NETWORK === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  const keyHex = OPERATOR_KEY.startsWith('0x') ? OPERATOR_KEY.slice(2) : OPERATOR_KEY;

  client.setOperator(
    OPERATOR_ID,
    PrivateKey.fromStringECDSA(keyHex)
  );

  const operatorKey = PrivateKey.fromStringECDSA(keyHex);
  const operatorPublicKey = operatorKey.publicKey;

  try {
    // Use cached network or create new one (about 0.01 HBAR per creation)
    if (!networkCache) {
      networkCache = await new HcsIdentityNetworkBuilder()
        .setNetwork(HEDERA_NETWORK as 'mainnet' | 'testnet')
        .setAppnetName('JimoMarket')
        .setMaxTransactionFee(new Hbar(2))
        .setDidTopicMemo('Jimo Market DID Topic')
        .setVCTopicMemo('Jimo Market VC Topic')
        .setPublicKey(operatorPublicKey)
        .execute(client);

      console.log('📡 Created new Identity Network');
      console.log('   DID Topic:', networkCache.getDidTopicId().toString());
      console.log('   VC Topic:', networkCache.getVcTopicId().toString());
      console.log('   Address Book:', networkCache.getAddressBook().getFileId().toString());
    }

    const hcsDid = networkCache.generateDid(true);
    const didRootKey = hcsDid.getPrivateDidRootKey();

    if (!didRootKey) {
      throw new Error('Failed to generate DID root key');
    }

    const didDocument = hcsDid.generateDidDocument();

    await networkCache.createDidTransaction(DidMethodOperation.CREATE)
      .setDidDocument(didDocument.toJSON())
      .signMessage((doc: Uint8Array) => didRootKey.sign(doc))
      .buildAndSignTransaction((tx: any) => tx.setMaxTransactionFee(new Hbar(2)))
      .execute(client);

    return {
      did: hcsDid.toString(),
      privateKey: didRootKey.toString(),
      publicKey: didRootKey.publicKey.toString(),
      network: HEDERA_NETWORK,
      didTopicId: networkCache.getDidTopicId().toString(),
    };
  } finally {
    client.close();
  }
}
