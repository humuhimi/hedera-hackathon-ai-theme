import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent, AgentType } from '../../types/agent'
import { Spinner } from '../common/Spinner'

interface AgentListProps {
  agents: Agent[]
  onCreateAgent: (type: AgentType) => void
  isLoading: boolean
}

export const AgentList = ({ agents, onCreateAgent, isLoading }: AgentListProps) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AgentType>('give')

  const giveAgents = agents.filter(a => a.type === 'give')
  const wantAgents = agents.filter(a => a.type === 'want')
  const displayAgents = activeTab === 'give' ? giveAgents : wantAgents

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Your AI Agents
      </h2>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('give')}
          className={`pb-3 px-4 font-semibold transition-colors ${
            activeTab === 'give'
              ? 'text-orange-600 border-b-4 border-orange-600'
              : 'text-gray-500 hover:text-orange-600'
          }`}
        >
          💰 Seller ({giveAgents.length})
        </button>
        <button
          onClick={() => setActiveTab('want')}
          className={`pb-3 px-4 font-semibold transition-colors ${
            activeTab === 'want'
              ? 'text-blue-600 border-b-4 border-blue-600'
              : 'text-gray-500 hover:text-blue-600'
          }`}
        >
          🛒 Buyer ({wantAgents.length})
        </button>
      </div>

      {/* Agent Cards */}
      <div className="space-y-4">
        {displayAgents.map((agent) => (
          <div
            key={agent.id}
            className="border-2 border-gray-200 rounded-xl p-6 hover:border-orange-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{agent.icon}</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    {agent.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      <span className={`font-medium ${
                        agent.status === 'active' ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {agent.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      💬 {agent.inquiries} inquiries
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/agent/${agent.id}`)}
                className="px-4 py-2 border-2 border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium"
              >
                View Details
              </button>
            </div>
          </div>
        ))}

        {/* Add New Agent Card */}
        <button
          onClick={() => onCreateAgent(activeTab)}
          disabled={isLoading}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:border-orange-400 hover:bg-orange-50 transition-colors text-center group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="flex items-center justify-center mb-2">
                <Spinner size="lg" className="text-orange-500" />
              </div>
              <p className="text-gray-600 font-medium">Creating agent...</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                ➕
              </div>
              <p className="text-gray-600 font-medium group-hover:text-orange-600">
                Add new {activeTab === 'give' ? 'Seller' : 'Buyer'} AI
              </p>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
