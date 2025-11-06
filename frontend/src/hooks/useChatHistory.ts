import { useState, useEffect, useRef } from 'react'

export interface ChatMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: string
}

/**
 * Custom hook for managing chat history and auto-scrolling
 * @returns Chat history state, scroll ref, and message mutation functions
 */
export function useChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

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
  }
}
