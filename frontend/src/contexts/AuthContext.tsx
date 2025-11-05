import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession } from '../types/auth';
import { walletConnector } from '../services/WalletConnector';
import { sessionManager } from '../services/sessionManager';
import { api } from '../services/api';

type LoginStatus = 'idle' | 'connecting' | 'waiting-signature' | 'authenticating' | 'success' | 'error';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  loginStatus: LoginStatus;
  privateKey: string | null;
  clearPrivateKey: () => void;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const existingSession = sessionManager.get();

      if (existingSession) {
        try {
          // Verify session by fetching user data
          const userData = await api.getUserInfo(existingSession.token);
          setSession(existingSession);
          setUser(userData);
        } catch (error) {
          // Session invalid, clear it
          sessionManager.clear();
          console.log('Session expired or invalid');
        }
      }

      setIsInitializing(false);
    };

    initAuth();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setLoginStatus('connecting');

      // 1. Connect to wallet
      const { accountId } = await walletConnector.connect();
      console.log('🔗 Wallet connected:', accountId);

      // 2. Get authentication challenge
      const challengeData = await api.getChallenge(accountId);
      console.log('🎯 Challenge received');

      // 3. Sign the authentication message
      setLoginStatus('waiting-signature');
      const signature = await walletConnector.signMessage(challengeData.message);
      console.log('✍️ Message signed');

      // 4. Authenticate with backend
      setLoginStatus('authenticating');
      const result = await api.authenticate(accountId, signature);
      console.log('✅ Authenticated');

      // 5. Save session
      const newSession = {
        token: result.token,
        userId: result.user.id,
        accountId: result.user.hederaAccountId,
        did: result.user.did,
        userName: result.user.userName,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      sessionManager.save(newSession);
      setSession(newSession);
      setUser(result.user);

      // 6. Save private key if returned (first-time user)
      if (result.privateKey) {
        setPrivateKey(result.privateKey);
      }

      setLoginStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      setLoginStatus('error');
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
    setPrivateKey(null);
    setError(null);
    setLoginStatus('idle');
  };

  const clearPrivateKey = () => {
    setPrivateKey(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: user !== null,
    isInitializing,
    isLoading,
    loginStatus,
    privateKey,
    clearPrivateKey,
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
