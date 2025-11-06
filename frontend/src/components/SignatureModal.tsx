import { useEffect, useState } from 'react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignatureModal = ({ isOpen, onClose }: SignatureModalProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full mx-4 animate-slideUp">
        {/* HashPack Icon - Larger and pulsing */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center animate-bounce-slow">
              <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title - Larger and bolder */}
        <h3 className="text-3xl font-black text-center text-gray-900 mb-3">
          ウォレットを確認してください
        </h3>
        
        <p className="text-center text-lg text-purple-600 font-semibold mb-8 animate-pulse">
          HashPackで署名を承認してください
        </p>

        {/* Steps - Larger and clearer */}
        <div className="space-y-5 mb-8">
          <div className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4 transition-all hover:bg-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">
              1
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                HashPack 拡張機能を開く
              </p>
              <p className="text-sm text-gray-500">ブラウザ右上のアイコンをクリック</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-gray-50 rounded-xl p-4 transition-all hover:bg-gray-100">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-lg">
              2
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">
                署名リクエストを確認
              </p>
              <p className="text-sm text-gray-500">メッセージ内容を確認</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-xl flex items-center justify-center text-lg font-bold shadow-lg animate-pulse">
              3
            </div>
            <div className="flex-1">
              <p className="font-bold text-purple-700">
                「承認」ボタンをクリック
              </p>
              <p className="text-sm text-purple-600">完了まであと一歩！</p>
            </div>
          </div>
        </div>

        {/* Waiting indicator - More prominent */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6 border border-purple-200">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-lg font-semibold text-purple-700">承認待ち{dots}</span>
          </div>
        </div>

        {/* Cancel button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-full py-3 px-4 text-gray-600 hover:text-gray-800 text-base font-semibold transition-all hover:bg-gray-50 rounded-xl"
        >
          キャンセル
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
