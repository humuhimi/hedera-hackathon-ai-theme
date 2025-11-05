/**
 * Hedera message signature verification utility
 * Extracted from @hashgraph/hedera-wallet-connect/dist/lib/shared/utils.js
 */
import { Buffer } from 'buffer';
import { PublicKey } from '@hashgraph/sdk';
import { proto } from '@hashgraph/proto';

/**
 * Converts a Base64-encoded string to a `proto.SignatureMap`.
 */
function base64StringToSignatureMap(base64string: string): proto.SignatureMap {
  const encoded = Buffer.from(base64string, 'base64');
  return proto.SignatureMap.decode(encoded);
}

/**
 * Prefix message for Hedera signing
 */
function prefixMessageToSign(message: string): string {
  return '\x19Hedera Signed Message:\n' + message.length + message;
}

/**
 * Verify message signature using Hedera's official implementation
 *
 * @param message - A plain text string
 * @param base64SignatureMap - A base64 encoded proto.SignatureMap object
 * @param publicKey - A PublicKey object use to verify the signature
 * @returns boolean - whether or not the first signature in the sigPair is valid for the message and public key
 */
export function verifyMessageSignature(
  message: string,
  base64SignatureMap: string,
  publicKey: PublicKey,
): boolean {
  const signatureMap = base64StringToSignatureMap(base64SignatureMap);
  const signature = signatureMap.sigPair[0].ed25519 || signatureMap.sigPair[0].ECDSASecp256k1;

  if (!signature) throw new Error('Signature not found in signature map');

  return publicKey.verify(Buffer.from(prefixMessageToSign(message)), signature);
}
