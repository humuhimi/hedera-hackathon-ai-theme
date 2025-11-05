import { useAuth } from './contexts/AuthContext'
import { AuthButton } from './components/AuthButton'
import { UserMenu } from './components/UserMenu'

function App() {
  const { isAuthenticated, isInitializing, user } = useAuth()

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  // Unauthenticated - Landing Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md">
          <h1 className="text-5xl font-bold text-blue-600 mb-3">
            Jimo market
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            AIエージェントで地域取引を自動化
          </p>
          <AuthButton />
        </div>
      </div>
    )
  }

  // Authenticated - Home Page
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Jimo market</h1>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            🎉 ようこそ、{user?.userName || 'ユーザー'}さん！
          </h2>

          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="font-semibold text-blue-800">Hedera Account</p>
              <p className="text-blue-700 font-mono text-sm">{user?.hederaAccountId}</p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-600 p-4">
              <p className="font-semibold text-purple-800">Decentralized Identifier (DID)</p>
              <p className="text-purple-700 font-mono text-sm break-all">{user?.did}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">あなたのAIエージェント</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                + 新しいAIを作る
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
