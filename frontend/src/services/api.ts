import type { AuthResponse, User } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = {
  /**
   * Get authentication challenge
   */
  async getChallenge(accountId: string): Promise<{
    challenge: string;
    message: string;
    issuedAt: string;
    domain: string;
    network: string;
  }> {
    const response = await fetch(`${API_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId })
    });

    if (!response.ok) {
      throw new Error(`Failed to get challenge: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Verify signature and authenticate
   */
  async authenticate(accountId: string, signature: string, userName?: string, region?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, signature, userName, region })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get current user info
   */
  async getUserInfo(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }

    return response.json();
  },
};