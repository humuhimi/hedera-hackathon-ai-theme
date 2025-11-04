/**
 * Generate Hedera DID from account ID
 * Format: did:hedera:<network>:<accountId>
 *
 * @example
 * generateHederaDID('0.0.12345', 'testnet')
 * // => 'did:hedera:testnet:0.0.12345'
 *
 * @see https://github.com/hashgraph/did-method
 */
export function generateHederaDID(accountId: string, network: string = 'testnet'): string {
  // Validate account ID format
  if (!accountId || !accountId.match(/^\d+\.\d+\.\d+$/)) {
    throw new Error(`Invalid Hedera account ID format: ${accountId}`);
  }

  // Validate network
  const validNetworks = ['mainnet', 'testnet', 'previewnet'];
  if (!validNetworks.includes(network.toLowerCase())) {
    throw new Error(`Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`);
  }

  return `did:hedera:${network.toLowerCase()}:${accountId}`;
}

/**
 * Parse Hedera DID into components
 *
 * @example
 * parseHederaDID('did:hedera:testnet:0.0.12345')
 * // => { method: 'hedera', network: 'testnet', accountId: '0.0.12345' }
 */
export function parseHederaDID(did: string): { method: string; network: string; accountId: string } {
  const parts = did.split(':');

  if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'hedera') {
    throw new Error(`Invalid Hedera DID format: ${did}`);
  }

  return {
    method: parts[1],
    network: parts[2],
    accountId: parts[3]
  };
}

/**
 * Validate Hedera DID format
 */
export function isValidHederaDID(did: string): boolean {
  try {
    parseHederaDID(did);
    return true;
  } catch {
    return false;
  }
}
