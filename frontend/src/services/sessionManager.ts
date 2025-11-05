import { AuthSession } from '../types/auth';

const SESSION_KEY = 'jimo_market_session';

export const sessionManager = {
  /**
   * Save session to localStorage
   */
  save(session: AuthSession): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  /**
   * Get session from localStorage
   */
  get(): AuthSession | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) return null;

      const session: AuthSession = JSON.parse(data);

      // Check if session is expired
      if (this.isExpired(session)) {
        this.clear();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  /**
   * Clear session from localStorage
   */
  clear(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },

  /**
   * Check if session is expired
   */
  isExpired(session: AuthSession): boolean {
    return new Date() > new Date(session.expiresAt);
  },

  /**
   * Check if valid session exists
   */
  hasValidSession(): boolean {
    const session = this.get();
    return session !== null;
  }
};
