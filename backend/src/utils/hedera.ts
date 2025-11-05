/**
 * Hedera Network Utilities
 * Secure account public key resolution from Hedera network
 * Supports both Ed25519 and ECDSA(secp256k1) key types
 */
import { Client, AccountId, AccountInfoQuery, PublicKey } from '@hashgraph/sdk';

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';
const OPERATOR_ID = process.env.HEDERA_MANAGER_ACCOUNT_ID;
const OPERATOR_KEY = process.env.HEDERA_MANAGER_PRIVATE_KEY;

/**
 * Key type for Hedera accounts
 */
export type KeyType = 'ED25519' | 'ECDSA_SECP256K1';

/**
 * Account key info with type
 */
export interface AccountKeyInfo {
  publicKey: PublicKey;
  keyType: KeyType;
}

/**
 * Detect key type from PublicKey instance
 */
function detectKeyType(publicKey: PublicKey): KeyType {
  const keyTypeName = publicKey.constructor.name;

  if (keyTypeName === 'Ed25519PublicKey' || keyTypeName.includes('Ed25519')) {
    return 'ED25519';
  } else if (keyTypeName === 'ECDSAsecp256k1PublicKey' || keyTypeName.includes('ECDSA')) {
    return 'ECDSA_SECP256K1';
  }

  // Fallback: Try to detect by byte length
  // Ed25519 public key is 32 bytes, ECDSA secp256k1 is 33 bytes (compressed)
  const keyBytes = publicKey.toBytes();
  if (keyBytes.length === 32) {
    return 'ED25519';
  } else if (keyBytes.length === 33) {
    return 'ECDSA_SECP256K1';
  }

  throw new Error(`Unsupported key type: ${keyTypeName}`);
}

/**
 * Get account's public key and key type from Hedera network
 * This ensures we're verifying signatures against the actual account's key,
 * not a client-provided key that could be forged.
 *
 * Supports both Ed25519 and ECDSA(secp256k1) key types.
 *
 * @param accountId - Hedera account ID (e.g., "0.0.12345")
 * @returns AccountKeyInfo with public key and key type
 * @throws Error if account not found or network error
 */
export async function getAccountPublicKey(accountId: string): Promise<AccountKeyInfo> {
  const client = HEDERA_NETWORK === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  // Set operator if available (improves query performance)
  if (OPERATOR_ID && OPERATOR_KEY) {
    client.setOperator(AccountId.fromString(OPERATOR_ID), OPERATOR_KEY);
  }

  try {
    const info = await new AccountInfoQuery()
      .setAccountId(accountId)
      .execute(client);

    const publicKey = info.key as PublicKey;

    // Note: This assumes a single key. For threshold/key list accounts,
    // additional logic would be needed to handle complex key structures.

    // Detect key type
    const keyType = detectKeyType(publicKey);

    return { publicKey, keyType };
  } catch (error) {
    console.error(`Failed to get public key for account ${accountId}:`, error);
    throw new Error(`Cannot verify account ${accountId}: ${error instanceof Error ? error.message : 'Network error'}`);
  } finally {
    client.close();
  }
}
