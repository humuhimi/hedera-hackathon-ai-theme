import { AuthResult } from '../types/auth';
import { generateHederaDID } from '../utils/did';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const HEDERA_NETWORK = import.meta.env.VITE_HEDERA_NETWORK || 'testnet';

export const api = {
  /**
   * Authenticate user with Hedera account ID and DID
   * Backend will auto-create user if new, or login if existing
   */
  async authenticate(accountId: string): Promise<AuthResult> {
    try {
      // Generate DID from account ID
      const did = generateHederaDID(accountId, HEDERA_NETWORK);

      const response = await fetch(`${API_URL}/auth/hashpack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          did
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const result: AuthResult = await response.json();
      return result;
    } catch (error) {
      console.error('Authentication API error:', error);
      throw error;
    }
  },

  /**
   * Verify session token
   */
  async verifySession(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }
};
