import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        hederaAccountId: string;
        did?: string;
        didRegistered?: boolean;
      };
    }
  }
}
