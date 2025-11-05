/**
 * Auth Service
 * Handles user authentication via WalletConnect (no private keys!)
 */
import { PrismaClient } from '@prisma/client';
import { generateToken, JWTPayload } from './jwt.service.js';
import { createAuthMessage } from '../utils/signature.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Challenge cache with full auth context (in production, use Redis)
interface AuthChallenge {
  challenge: string;
  message: string;
  issuedAt: string;
  domain: string;
  network: string;
  expiresAt: number;
}

const authChallengeCache = new Map<string, AuthChallenge>();

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    hederaAccountId: string;
    did?: string;
    didRegistered: boolean;
    userName?: string;
    region?: string;
    avatarUrl?: string;
  };
}

/**
 * Generate authentication challenge with full context
 */
export function generateChallenge(accountId: string): {
  challenge: string;
  message: string;
  issuedAt: string;
  domain: string;
  network: string;
} {
  const challenge = crypto.randomBytes(32).toString('hex');
  const domain = process.env.FRONTEND_URL || 'http://localhost:3000';
  const network = process.env.HEDERA_NETWORK || 'testnet';
  const issuedAt = new Date().toISOString();

  // Create the message that will be signed
  const message = createAuthMessage(domain, accountId, challenge, issuedAt, network);

  // Cache everything for verification
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  authChallengeCache.set(accountId, {
    challenge,
    message,
    issuedAt,
    domain,
    network,
    expiresAt,
  });

  // Clean up expired challenges
  setTimeout(() => authChallengeCache.delete(accountId), 5 * 60 * 1000);

  return { challenge, message, issuedAt, domain, network };
}

/**
 * Get cached auth challenge
 */
export function getAuthChallenge(accountId: string): AuthChallenge | undefined {
  const cached = authChallengeCache.get(accountId);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt < Date.now()) {
    authChallengeCache.delete(accountId);
    return undefined;
  }

  return cached;
}

/**
 * Consume auth challenge (one-time use)
 */
export function consumeAuthChallenge(accountId: string): void {
  authChallengeCache.delete(accountId);
}

/**
 * Verify wallet signature for authentication
 * Uses server-generated message from cache (client cannot tamper)
 * Fetches the account's public key from Hedera network (not client-provided)
 * Supports both Ed25519 and ECDSA(secp256k1) key types
 *
 * @param accountId Hedera account ID
 * @param signature Signature from wallet (hex string)
 *   - Ed25519: 64 bytes (128 hex chars) - R || S
 *   - ECDSA: 64-72 bytes (128-144 hex chars) - Can be DER encoded or raw r || s
 * @returns true if signature is valid
 */
export async function verifyAuthSignature(
  accountId: string,
  signature: string
): Promise<boolean> {
  const cached = getAuthChallenge(accountId);
  if (!cached) {
    return false;
  }

  // Validate signature format: must be hex string
  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    console.error('Invalid signature format: must be hex string');
    return false;
  }

  try {
    // Get the account's actual public key and key type from Hedera network
    // This prevents clients from providing a fake public key
    const { getAccountPublicKey } = await import('../utils/hedera.js');
    const { publicKey, keyType } = await getAccountPublicKey(accountId);

    // Validate signature length based on key type
    if (keyType === 'ED25519') {
      // Ed25519: Must be exactly 64 bytes (128 hex chars)
      if (signature.length !== 128) {
        console.error(`Invalid Ed25519 signature length: ${signature.length} (expected 128)`);
        return false;
      }
    } else if (keyType === 'ECDSA_SECP256K1') {
      // ECDSA: Typically 64-72 bytes (128-144 hex chars)
      // Can be DER encoded (variable length) or raw r || s (64 bytes)
      if (signature.length < 128 || signature.length > 144) {
        console.error(`Invalid ECDSA signature length: ${signature.length} (expected 128-144)`);
        return false;
      }
    }

    // Verify signature using network-resolved public key
    const messageBytes = Buffer.from(cached.message, 'utf8');
    const signatureBytes = Buffer.from(signature, 'hex');

    return publicKey.verify(messageBytes, signatureBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Authenticate user with Hedera account
 * Simply creates/finds user by accountId (signature verified separately)
 */
export async function authenticateWithHedera(
  accountId: string,
  userName?: string,
  region?: string
): Promise<AuthResponse> {
  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { hederaAccountId: accountId },
  });

  if (!user) {
    // First time user - create basic account
    user = await prisma.user.create({
      data: {
        hederaAccountId: accountId,
        didRegistered: false,
        userName,
        region,
      },
    });
  } else {
    // Existing user - update last login
    user = await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // Generate JWT token
  const payload: JWTPayload = {
    userId: user.id,
    hederaAccountId: user.hederaAccountId,
    did: user.did || undefined,
  };

  const token = generateToken(payload);

  return {
    token,
    user: {
      id: user.id,
      hederaAccountId: user.hederaAccountId,
      did: user.did || undefined,
      didRegistered: user.didRegistered,
      userName: user.userName || undefined,
      region: user.region || undefined,
      avatarUrl: user.avatarUrl || undefined,
    },
  };
}

/**
 * Register DID for user (called after client creates DID)
 */
export async function registerUserDID(
  userId: string,
  did: string,
  publicKey: string
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      did,
      didPublicKey: publicKey,
      didRegistered: true,
    },
    select: {
      id: true,
      hederaAccountId: true,
      did: true,
      didRegistered: true,
      userName: true,
      region: true,
      avatarUrl: true,
    },
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      hederaAccountId: true,
      did: true,
      didRegistered: true,
      didPublicKey: true,
      userName: true,
      region: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    userName?: string;
    region?: string;
    avatarUrl?: string;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      hederaAccountId: true,
      did: true,
      didRegistered: true,
      userName: true,
      region: true,
      avatarUrl: true,
    },
  });
}
