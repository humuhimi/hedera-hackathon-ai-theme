/**
 * Auth Service
 * Handles user authentication via WalletConnect (no private keys!)
 */
import { PrismaClient } from '@prisma/client';
import { generateToken, JWTPayload } from './jwt.service.js';
import { createAuthMessage } from '../utils/signature.js';
import crypto from 'crypto';
import { verifyMessageSignature } from '../utils/verifySignature.js';
import { generateDID } from './did.service.js';

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
  privateKey?: string; // Only returned on first login
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
  const network = process.env.HEDERA_NETWORK;
  if (!network) {
    throw new Error('HEDERA_NETWORK not set');
  }
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
 * Verify wallet signature using official Hedera Wallet Connect function
 */
export async function verifyAuthSignature(
  accountId: string,
  signature: string
): Promise<boolean> {
  try {
    const cached = getAuthChallenge(accountId);
    if (!cached) {
      return false;
    }

    const { getAccountPublicKey } = await import('../utils/hedera.js');
    const { publicKey } = await getAccountPublicKey(accountId);

    const signatureBytes = Buffer.from(signature, 'hex');
    const base64Signature = signatureBytes.toString('base64');

    const isValid = verifyMessageSignature(cached.message, base64Signature, publicKey);
    return isValid;
  } catch (error) {
    return false;
  }
}

/**
 * Authenticate user with Hedera account
 * Automatically creates DID for first-time users
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

  let privateKey: string | undefined;

  if (!user) {
    // First time user - create DID and account
    const didResult = await generateDID();

    user = await prisma.user.create({
      data: {
        hederaAccountId: accountId,
        did: didResult.did,
        didPublicKey: didResult.publicKey,
        didRegistered: true,
        userName,
        region,
      },
    });

    // Return private key only on first login
    privateKey = didResult.privateKey;
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
    didRegistered: user.didRegistered,
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
    privateKey,
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
