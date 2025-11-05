/**
 * Authentication message utilities for Hedera accounts
 */

/**
 * Create SIWE-style authentication message
 * @param domain Domain of the application
 * @param accountId Hedera account ID
 * @param challenge Nonce/challenge
 * @param issuedAt ISO timestamp
 * @param network Hedera network (testnet/mainnet)
 * @returns Formatted message for signing
 */
export function createAuthMessage(
  domain: string,
  accountId: string,
  challenge: string,
  issuedAt: string,
  network: string
): string {
  return [
    `${domain} wants you to sign in with your Hedera account:`,
    accountId,
    '',
    'Sign in to Jimo Market',
    '',
    `Nonce: ${challenge}`,
    `Issued At: ${issuedAt}`,
    `Network: ${network}`
  ].join('\n');
}
