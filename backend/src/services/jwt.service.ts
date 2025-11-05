/**
 * JWT Service
 * Handles JWT token generation and verification with security best practices
 */
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN!;
const JWT_ISSUER = process.env.FRONTEND_URL!;
const JWT_AUDIENCE = 'jimomarket-api';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
if (!JWT_EXPIRES_IN) {
  throw new Error('JWT_EXPIRES_IN must be set');
}
if (!JWT_ISSUER) {
  throw new Error('FRONTEND_URL must be set');
}

export interface JWTPayload {
  userId: string;
  hederaAccountId: string;
  did?: string;
  didRegistered?: boolean;
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

  // @ts-ignore - jwt.sign type inference issue
  return jwt.sign(
    {
      ...payload,
      sub: payload.userId,
      jti,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
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
