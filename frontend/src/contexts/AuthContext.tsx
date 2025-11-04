import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession } from '../types/auth';
import { walletConnector } from '../services/WalletConnector';
import { sessionManager } from '../services/sessionManager';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const existingSession = sessionManager.get();

      if (existingSession) {
        // Verify session with backend
        const isValid = await api.verifySession(existingSession.token);

        if (isValid) {
          setSession(existingSession);
          // Note: In production, you'd fetch full user data here
          setUser({
            id: existingSession.userId,
            hederaAccountId: existingSession.accountId,
            did: existingSession.did,
            userName: existingSession.userName,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          });
        } else {
          sessionManager.clear();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Connect to HashPack (or demo mode)
      const { accountId } = await walletConnector.connect();
      console.log('🔗 Wallet connected:', accountId);

      // 2. Authenticate with backend (auto signup/login)
      const result = await api.authenticate(accountId);
      console.log('✅ Authenticated:', result.isNewUser ? 'New user' : 'Existing user');

      // 3. Save session
      sessionManager.save(result.session);
      setSession(result.session);
      setUser(result.user);

      // 4. Handle onboarding for new users
      if (result.isNewUser) {
        // In a real app, navigate to onboarding
        console.log('🎉 New user! Show onboarding flow');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('❌ Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionManager.clear();
    walletConnector.disconnect();
    setUser(null);
    setSession(null);
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: user !== null,
    isLoading,
    login,
    logout,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
