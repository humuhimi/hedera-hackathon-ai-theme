/**
 * Auth Routes
 * Secure authentication via WalletConnect (NO private keys!)
 */
import { Router, Request, Response } from 'express';
import {
  generateChallenge,
  verifyAuthSignature,
  consumeAuthChallenge,
  authenticateWithHedera,
  registerUserDID,
  getUserById,
  updateUserProfile
} from '../services/auth.service.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /auth/challenge
 * Generate authentication challenge with full signing context
 * Returns: challenge, message (to sign), issuedAt, domain, network
 */
router.post('/challenge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      res.status(400).json({ error: 'accountId is required' });
      return;
    }

    const challengeData = generateChallenge(accountId);

    res.json(challengeData);
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

/**
 * POST /auth/verify
 * Verify wallet signature and authenticate user
 * Required: accountId, signature
 *
 * Signature formats (both Ed25519 and ECDSA supported):
 *   - Ed25519: 64 bytes as hex string (128 characters) - R || S
 *   - ECDSA(secp256k1): 64-72 bytes as hex string (128-144 characters)
 *     Can be DER encoded or raw r || s format
 *
 * Security: Public key and key type are fetched from Hedera network, not client-provided.
 * This prevents clients from providing fake public keys.
 * The server automatically detects the account's key type and validates accordingly.
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, signature, userName, region } = req.body;

    // Validate required fields
    if (!accountId || !signature) {
      res.status(400).json({
        error: 'accountId and signature are required',
        format: {
          signature: 'Hex string - Ed25519 (128 chars) or ECDSA (128-144 chars)'
        }
      });
      return;
    }

    // Verify signature using server-cached message and network-resolved public key
    const signatureValid = await verifyAuthSignature(accountId, signature);
    if (!signatureValid) {
      res.status(401).json({ error: 'Invalid signature or expired challenge' });
      return;
    }

    // Consume challenge (one-time use)
    consumeAuthChallenge(accountId);

    // Authenticate user
    const result = await authenticateWithHedera(accountId, userName, region);

    res.json(result);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/did/register
 * Generate and register DID using official Hedera DID SDK (HIP-29)
 *
 * SECURITY:
 * - Server generates DID with new key pair
 * - Immediately registers to HCS
 * - Returns DID and private key ONCE over HTTPS
 * - Client MUST securely store the private key (encrypted)
 * - Server does NOT store private keys
 *
 * Response includes:
 * - did: HIP-29 compliant DID string
 * - privateKey: DID root private key (store securely!)
 * - publicKey: DID root public key
 */
router.post('/did/register', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user already has DID
    if (req.user.didRegistered) {
      res.status(400).json({
        error: 'DID already registered',
        did: req.user.did
      });
      return;
    }

    // Import DID service
    const { generateAndRegisterDID } = await import('../services/did.service.js');

    // Generate and register DID
    const result = await generateAndRegisterDID();

    // Update user with DID
    const user = await registerUserDID(req.user.userId, result.did, result.publicKey);

    res.json({
      success: true,
      user,
      did: result.did,
      privateKey: result.privateKey, // ⚠️ ONLY RETURNED ONCE - Store securely!
      publicKey: result.publicKey,
      network: result.network,
      didTopicId: result.didTopicId,
      receipt: result.receipt,
      warning: 'Store the privateKey securely! It will not be returned again.'
    });
  } catch (error) {
    console.error('DID registration error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to register DID'
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile (protected route)
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PATCH /auth/profile
 * Update user profile (protected route)
 */
router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userName, region, avatarUrl } = req.body;
    const user = await updateUserProfile(req.user.userId, { userName, region, avatarUrl });

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
