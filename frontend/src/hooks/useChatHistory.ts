import { useState, useEffect, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: string
}

/**
 * Custom hook for managing chat history with persistence
 * Loads message history from backend on mount
 * @param agentId - The agent ID to load history for
 * @returns Chat history state, scroll ref, message mutation functions, and loading state
 */
export function useChatHistory(agentId?: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load message history from backend on mount
  useEffect(() => {
    if (!agentId) {
      setIsLoading(false)
      return
    }

    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/agents/${agentId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const messages = await response.json()
          setChatHistory(messages.map((msg: any) => ({
            role: msg.role,
            text: msg.content,
            timestamp: msg.createdAt,
          })))
        }
      } catch (error) {
        console.error('Failed to fetch message history:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [agentId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const addUserMessage = (content: string, timestamp: string) => {
    setChatHistory(prev => [...prev, {
      role: 'user',
      text: content,
      timestamp,
    }])
  }

  const addAgentMessage = (content: string, timestamp: string) => {
    setChatHistory(prev => {
      // Remove "Thinking..." if it exists
      const filtered = prev.filter(msg => msg.text !== 'Thinking...')
      console.log('📝 Updating chat history, removed Thinking, adding:', content?.substring(0, 30))
      return [...filtered, {
        role: 'agent',
        text: content,
        timestamp,
      }]
    })
  }

  const addThinkingPlaceholder = () => {
    setChatHistory(prev => [...prev, {
      role: 'agent',
      text: 'Thinking...',
      timestamp: new Date().toISOString(),
    }])
  }

  return {
    chatHistory,
    chatEndRef,
    addUserMessage,
    addAgentMessage,
    addThinkingPlaceholder,
    isLoading,
  }
}
