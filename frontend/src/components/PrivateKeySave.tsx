import { useState } from 'react';

interface PrivateKeySaveProps {
  privateKey: string;
  did: string;
  onComplete: () => void;
}

export function PrivateKeySave({ privateKey, did, onComplete }: PrivateKeySaveProps) {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([
      `DID Private Key\n`,
      `================\n\n`,
      `DID: ${did}\n\n`,
      `Private Key:\n${privateKey}\n\n`,
      `⚠️ KEEP THIS SAFE! This key cannot be recovered if lost.\n`
    ], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'did-private-key.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleComplete = () => {
    if (confirmed) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            DIDが作成されました！
          </h2>
          <p className="text-gray-600">
            あなたの分散型ID（DID）が正常に作成されました
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-start">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <p className="font-bold text-yellow-800 mb-1">重要な注意事項</p>
              <p className="text-yellow-700 text-sm">
                この秘密鍵は二度と表示されません。必ず安全な場所に保存してください。
                秘密鍵を紛失すると、DIDへのアクセスが永久に失われます。
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            あなたのDID
          </label>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-purple-700 font-mono text-xs break-all">{did}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-gray-700">
              秘密鍵（Private Key）
            </label>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showKey ? '🙈 隠す' : '👁️ 表示'}
            </button>
          </div>
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-3">
            <p className="text-gray-700 font-mono text-xs break-all">
              {showKey ? privateKey : '••••••••••••••••••••••••••••••••'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              📋 {copied ? 'コピーしました！' : 'コピー'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              💾 ダウンロード
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">
              秘密鍵を安全な場所に保存しました。紛失した場合は復旧できないことを理解しています。
            </span>
          </label>
        </div>

        <button
          onClick={handleComplete}
          disabled={!confirmed}
          className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all ${
            confirmed
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          確認しました - 続ける
        </button>
      </div>
    </div>
  );
}
