/**
 * JWT Service
 * Handles JWT token generation and verification with security best practices
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_AUDIENCE = 'jimomarket-api';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

export interface JWTPayload {
  userId: string;
  hederaAccountId: string;
  did?: string;
  // Standard JWT claims
  iss?: string;
  aud?: string;
  sub?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(payload: Omit<JWTPayload, 'iss' | 'aud' | 'sub' | 'jti' | 'iat' | 'exp'>): string {
  const jti = crypto.randomBytes(16).toString('hex');

  return jwt.sign(
    {
      ...payload,
      sub: payload.userId, // subject = user ID
      jti, // unique token ID for revocation tracking
    },
    JWT_SECRET,
    {
      algorithm: 'HS256', // Explicitly set algorithm
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'], // Only allow HS256
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode JWT without verification (for debugging only)
 */
export function decodeToken(token: string): JWTPayload | null {
  return jwt.decode(token) as JWTPayload | null;
}
