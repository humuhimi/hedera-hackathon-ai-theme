/**
 * Auth Middleware
 * Protects routes by verifying JWT tokens
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.service.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    hederaAccountId: string;
    did?: string;
    didRegistered?: boolean;
  };
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}
