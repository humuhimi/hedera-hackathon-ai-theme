export interface User {
  id: string;
  hederaAccountId: string;
  did: string;  // Hedera DID
  userName?: string;
  region?: string;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  userId: string;
  accountId: string;
  did: string;  // Hedera DID
  token: string;
  expiresAt: number;
  userName?: string;
}

export interface AuthResult {
  isNewUser: boolean;
  user: User;
  session: AuthSession;
}

export interface WalletConnectionResult {
  accountId: string;
  topic?: string;  // WalletConnect session topic
}
