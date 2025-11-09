import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SignatureModal } from './SignatureModal';

export const AuthButton = () => {
  const { login, isLoading, loginStatus, error } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await login();
    } catch (err) {
      // Error is already handled in AuthContext
      console.error('Login failed:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleModalClose = () => {
    // User cancelled the signature request
    setIsConnecting(false);
  };

  const getStatusMessage = () => {
    switch (loginStatus) {
      case 'connecting':
        return '🔗 Connecting wallet...';
      case 'authenticating':
        return '🔐 Authenticating...';
      case 'success':
        return '✅ Authentication successful!';
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <>
      <SignatureModal 
        isOpen={loginStatus === 'waiting-signature'} 
        onClose={handleModalClose}
      />
      
      <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleConnect}
        disabled={isLoading || isConnecting}
        className={`
          bg-blue-600 hover:bg-blue-700
          text-white font-bold
          py-3 px-8
          rounded-lg
          transition-all duration-200
          flex items-center space-x-2
          ${isLoading || isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
          ${error ? 'border-2 border-red-500' : ''}
        `}
      >
        {isConnecting ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span className="text-xl">🔗</span>
            <span>Get Started with HashPack</span>
          </>
        )}
      </button>

      <p className="text-sm text-gray-600">
        * No email or password required
      </p>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg max-w-md">
          <p className="text-sm font-medium">{statusMessage}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-md">
          <p className="text-sm font-medium">Connection Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      </div>
    </>
  );
};
