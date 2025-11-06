import { Agent } from '../services/api'

interface AgentInfoPanelProps {
  agent: Agent
  isConnected: boolean
  onStatusToggle: () => void
  onDelete: () => void
}

/**
 * Displays agent information panel with status indicators and controls
 * @param props - Agent data, connection state, and action handlers
 */
export function AgentInfoPanel({
  agent,
  isConnected,
  onStatusToggle,
  onDelete,
}: AgentInfoPanelProps) {
  const isGiveType = agent.type === 'give'

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">{isGiveType ? '🎁' : '🔍'}</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{agent.name}</h1>
        <p className="text-gray-600 text-sm">{agent.description}</p>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Connection</span>
          <span
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <button
            onClick={onStatusToggle}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              agent.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
              }`}
            ></span>
            {agent.status === 'active' ? 'Active' : 'Paused'}
          </button>
        </div>

        {/* Type */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Type</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isGiveType ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {isGiveType ? 'Give Away' : 'Looking For'}
          </span>
        </div>

        {/* Created */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Created</span>
          <span className="text-sm text-gray-600">
            {new Date(agent.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="w-full mt-6 px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
      >
        Delete Agent
      </button>
    </div>
  )
}
