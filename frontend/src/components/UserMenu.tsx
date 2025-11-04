import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserMenu = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const displayName = user.userName || `Account ${user.hederaAccountId.slice(-6)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl">👤</span>
        <span className="font-medium">{displayName}</span>
        <span className="text-gray-500">▼</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm text-gray-500">Hedera Account</p>
              <p className="text-sm font-mono text-gray-900">{user.hederaAccountId}</p>
            </div>

            <div className="py-2">
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center space-x-2"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to dashboard
                }}
              >
                <span>📊</span>
                <span>ダッシュボード</span>
              </button>

              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center space-x-2"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to reputation
                }}
              >
                <span>🏅</span>
                <span>マイReputation</span>
              </button>

              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center space-x-2"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to settings
                }}
              >
                <span>⚙️</span>
                <span>設定</span>
              </button>

              <hr className="my-2 border-gray-200" />

              <button
                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 transition-colors flex items-center space-x-2"
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
              >
                <span>🚪</span>
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
