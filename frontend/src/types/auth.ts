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
  did?: string;  // Hedera DID (optional, registered separately)
  token: string;
  expiresAt: string;  // ISO 8601 timestamp
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
