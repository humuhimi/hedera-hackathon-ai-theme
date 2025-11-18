import { useState, FormEvent, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Agent } from '../services/api'
import { ChatMessage } from '../hooks/useChatHistory'

interface ChatPanelProps {
  agent: Agent
  chatHistory: ChatMessage[]
  chatEndRef: React.RefObject<HTMLDivElement>
  isConnected: boolean
  isSending: boolean
  onSendMessage: (message: string) => void
}

/**
 * Chat interface component for agent communication
 * Displays chat history and provides message input
 * @param props - Agent data, chat state, and message handler
 */
export function ChatPanel({
  agent,
  chatHistory,
  chatEndRef,
  isConnected,
  isSending,
  onSendMessage,
}: ChatPanelProps) {
  const [message, setMessage] = useState('')
  const [showNavigatePrompt, setShowNavigatePrompt] = useState(false)
  const [listingUrl, setListingUrl] = useState<string | null>(null)
  const navigate = useNavigate()
  const isGiveType = agent.type === 'give'

  // Detect listing URL in chat messages
  useEffect(() => {
    if (chatHistory.length === 0) return
    const lastMessage = chatHistory[chatHistory.length - 1]
    if (lastMessage && lastMessage.role === 'agent') {
      // Look for listing URL pattern: /listing/123 or http://localhost:3000/listing/123
      const urlMatch = lastMessage.text.match(/\/listing\/(\d+)/)
      if (urlMatch) {
        const detectedUrl = `/listing/${urlMatch[1]}`
        setListingUrl(detectedUrl)
        setShowNavigatePrompt(true)

        // Auto-navigate after 2 seconds
        const timer = setTimeout(() => {
          navigate(detectedUrl)
        }, 2000)

        return () => clearTimeout(timer)
      }
    }
  }, [chatHistory, navigate])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    onSendMessage(message)
    setMessage('')
  }

  const handleNavigateNow = () => {
    if (listingUrl) {
      navigate(listingUrl)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg h-[600px] flex flex-col">
      {/* Chat Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Chat with Agent</h2>
        <p className="text-sm text-gray-600 mt-1">
          Give instructions or ask questions to your AI agent
          {isConnected && <span className="ml-2 text-green-600">● Live</span>}
        </p>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">👋 Start chatting with your agent!</p>
            <p className="text-sm">
              {isGiveType
                ? 'Tell the agent about items you want to sell'
                : 'Tell the agent what items you want to buy'}
            </p>
          </div>
        ) : (
          <>
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : msg.text === 'Thinking...'
                      ? 'bg-gray-200 text-gray-600 animate-pulse'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {/* Navigation Prompt */}
      {showNavigatePrompt && listingUrl && (
        <div className="px-6 py-3 bg-green-50 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-lg">✅</span>
              <span className="text-sm text-green-800 font-medium">
                Listing created! Redirecting in 2 seconds...
              </span>
            </div>
            <button
              onClick={handleNavigateNow}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              View Now
            </button>
          </div>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200">
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending || agent.status !== 'active' || !isConnected}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isSending || !message.trim() || agent.status !== 'active' || !isConnected}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
        {agent.status !== 'active' && (
          <p className="text-sm text-amber-600 mt-2">
            ⚠️ Agent is paused. Activate it to send messages.
          </p>
        )}
        {!isConnected && agent.status === 'active' && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Not connected to server. Reconnecting...
          </p>
        )}
      </form>
    </div>
  )
}
