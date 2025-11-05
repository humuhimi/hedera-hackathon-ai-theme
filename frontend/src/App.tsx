import { useAuth } from './contexts/AuthContext'
import { AuthButton } from './components/AuthButton'
import { UserMenu } from './components/UserMenu'
import { PrivateKeySave } from './components/PrivateKeySave'
import { EmptyStateHero } from './components/home/EmptyStateHero'
import { AgentTypeCard } from './components/home/AgentTypeCard'
import { HowToUseSection } from './components/home/HowToUseSection'
import { AgentList } from './components/home/AgentList'
import { Agent, AgentType } from './types/agent'

function App() {
  const { isAuthenticated, isInitializing, user, privateKey, clearPrivateKey } = useAuth()

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            Automate local trading with AI agents
          </p>
          <AuthButton />
        </div>
      </div>
    )
  }

  // Authenticated - Show private key save screen if needed
  if (isAuthenticated && privateKey && user?.did) {
    return (
      <PrivateKeySave
        privateKey={privateKey}
        did={user.did}
        onComplete={clearPrivateKey}
      />
    )
  }

  // Authenticated - Home Page
  // Mock data: Replace with real data from API
  const agents: Agent[] = [] // [] for empty state, or array of agents
  const hasAgents = agents.length > 0

  const handleCreateAgent = (type: AgentType) => {
    console.log('Create agent:', type)
    // TODO: Navigate to agent creation page
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Jimo market</h1>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {!hasAgents ? (
          <>
            <EmptyStateHero />

            {/* Two-Column CTA Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <AgentTypeCard type="give" onCreateAgent={() => handleCreateAgent('give')} />
              <AgentTypeCard type="want" onCreateAgent={() => handleCreateAgent('want')} />
            </div>

            <HowToUseSection />
          </>
        ) : (
          <AgentList agents={agents} onCreateAgent={handleCreateAgent} />
        )}
      </main>
    </div>
  )
}

export default App
