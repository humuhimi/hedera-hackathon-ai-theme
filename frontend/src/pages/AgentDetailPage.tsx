import { useParams, useNavigate } from 'react-router-dom'
import { useAgentData } from '../hooks/useAgentData'
import { useChatHistory } from '../hooks/useChatHistory'
import { useAgentWebSocket } from '../hooks/useAgentWebSocket'
import { AgentInfoPanel } from '../components/AgentInfoPanel'
import { ChatPanel } from '../components/ChatPanel'

/**
 * Agent detail page component
 * Orchestrates agent data, chat history, and WebSocket communication
 * Displays agent info panel and chat interface
 */
export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Custom hooks
  const { agent, loading, updateStatus, deleteAgent } = useAgentData(id)
  const {
    chatHistory,
    chatEndRef,
    addUserMessage,
    addAgentMessage,
    addThinkingPlaceholder,
  } = useChatHistory()
  const { isConnected, isSending, sendMessage } = useAgentWebSocket({
    agentId: id,
    agent,
    onUserMessage: addUserMessage,
    onAgentMessage: addAgentMessage,
  })

  // Handle sending messages
  const handleSendMessage = (message: string) => {
    addThinkingPlaceholder()
    sendMessage(message)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">エージェントが見つかりません</p>
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/home')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <span>←</span>
        <span>Back to Home</span>
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agent Info Panel */}
        <div className="lg:col-span-1">
          <AgentInfoPanel
            agent={agent}
            isConnected={isConnected}
            onStatusToggle={updateStatus}
            onDelete={deleteAgent}
          />
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-2">
          <ChatPanel
            agent={agent}
            chatHistory={chatHistory}
            chatEndRef={chatEndRef}
            isConnected={isConnected}
            isSending={isSending}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </main>
  )
}
