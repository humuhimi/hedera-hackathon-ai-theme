/**
 * Hedera Network Utilities
 * Secure account public key resolution from Hedera network
 * Supports both Ed25519 and ECDSA(secp256k1) key types
 */
import { PublicKey } from '@hashgraph/sdk';

const HEDERA_NETWORK = process.env.HEDERA_NETWORK || 'testnet';

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
  // Use byte length to detect key type
  const keyBytes = publicKey.toBytes();
  
  if (keyBytes.length === 32) {
    return 'ED25519';
  } else if (keyBytes.length === 33) {
    return 'ECDSA_SECP256K1';
  } else if (keyBytes.length === 47) {
    // DER-encoded ECDSA secp256k1 public key
    // Format: 302d300706052b8104000a03220002 + 33-byte key
    return 'ECDSA_SECP256K1';
  } else if (keyBytes.length === 44) {
    // DER-encoded Ed25519 public key
    return 'ED25519';
  }

  // Fallback: check hex string format
  const keyHex = publicKey.toString();
  if (keyHex.startsWith('302d') || keyHex.startsWith('3029')) {
    // DER-encoded ECDSA
    return 'ECDSA_SECP256K1';
  } else if (keyHex.startsWith('302a')) {
    // DER-encoded Ed25519
    return 'ED25519';
  }

  throw new Error(`Unsupported key type: bytes=${keyBytes.length}, hex=${keyHex}`);
}


/**
 * Parse key bytes and return PublicKey instance with key type
 * Handles both raw and DER-encoded keys
 */
function parseKeyBytes(keyBytes: Buffer): AccountKeyInfo {
  let publicKey: PublicKey;
  let keyType: KeyType;

  if (keyBytes.length === 47) {
    // DER-encoded ECDSA secp256k1 (last 33 bytes are raw key)
    const rawKeyBytes = keyBytes.slice(-33);
    publicKey = PublicKey.fromBytesECDSA(rawKeyBytes);
    keyType = 'ECDSA_SECP256K1';
  } else if (keyBytes.length === 44) {
    // DER-encoded Ed25519 (last 32 bytes are raw key)
    const rawKeyBytes = keyBytes.slice(-32);
    publicKey = PublicKey.fromBytesED25519(rawKeyBytes);
    keyType = 'ED25519';
  } else if (keyBytes.length === 33) {
    // Raw ECDSA secp256k1
    publicKey = PublicKey.fromBytesECDSA(keyBytes);
    keyType = 'ECDSA_SECP256K1';
  } else if (keyBytes.length === 32) {
    // Raw Ed25519
    publicKey = PublicKey.fromBytesED25519(keyBytes);
    keyType = 'ED25519';
  } else {
    throw new Error(`Unsupported key length: ${keyBytes.length} bytes`);
  }

  return { publicKey, keyType };
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
/**
 * Fetch account public key from Hedera Mirror Node (free, no operator required)
 */
async function fetchAccountKeyFromMirror(accountId: string): Promise<string> {
  const mirrorUrl = HEDERA_NETWORK === 'mainnet'
    ? 'https://mainnet-public.mirrornode.hedera.com'
    : 'https://testnet.mirrornode.hedera.com';

  const url = `${mirrorUrl}/api/v1/accounts/${accountId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mirror Node request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.key || !data.key.key) {
    throw new Error('Account key not found in Mirror Node response');
  }

  return data.key.key;
}

export async function getAccountPublicKey(accountId: string): Promise<AccountKeyInfo> {
  try {
    const keyHex = await fetchAccountKeyFromMirror(accountId);
    const keyBytes = Buffer.from(keyHex, 'hex');
    
    return parseKeyBytes(keyBytes);
  } catch (error) {
    throw new Error(`Cannot verify account ${accountId}: ${error instanceof Error ? error.message : 'Network error'}`);
  }
}
