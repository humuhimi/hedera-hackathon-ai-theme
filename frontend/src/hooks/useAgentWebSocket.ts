import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Agent } from '../services/api'
import { sessionManager } from '../services/sessionManager'

const BACKEND_URL = import.meta.env.VITE_API_URL

interface UseAgentWebSocketProps {
  agentId: string | undefined
  agent: Agent | null
  onUserMessage: (content: string, timestamp: string) => void
  onAgentMessage: (content: string, timestamp: string) => void
}

/**
 * Custom hook for managing WebSocket connection to agent channels
 * Handles connection lifecycle, message sending, and event callbacks
 * Uses refs to prevent infinite reconnection loops from callback changes
 * @param props - Configuration including agent ID and message callbacks
 * @returns Connection state, sending state, and sendMessage function
 */
export function useAgentWebSocket({
  agentId,
  agent,
  onUserMessage,
  onAgentMessage,
}: UseAgentWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const onUserMessageRef = useRef(onUserMessage)
  const onAgentMessageRef = useRef(onAgentMessage)

  // Update refs when callbacks change
  useEffect(() => {
    onUserMessageRef.current = onUserMessage
    onAgentMessageRef.current = onAgentMessage
  }, [onUserMessage, onAgentMessage])

  useEffect(() => {
    const session = sessionManager.get()
    console.log('🔄 WebSocket useEffect triggered', {
      hasSession: !!session,
      hasToken: !!session?.token,
      hasId: !!agentId,
      hasAgent: !!agent
    })

    if (!session?.token || !agentId || !agent) {
      console.log('⏸️ Skipping Socket.IO connection - missing requirements')
      return
    }

    console.log('🔌 Creating Socket.IO connection to', BACKEND_URL)
    console.log('🎫 Token:', session.token.substring(0, 20) + '...')

    // Create Socket.IO connection
    const socket = io(BACKEND_URL, {
      auth: {
        token: session.token,
      },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to backend')
      setIsConnected(true)

      // Join agent channel
      socket.emit('agent:join', { agentId })
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      console.error('Error message:', error.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from backend, reason:', reason)
      setIsConnected(false)
    })

    socket.on('agent:joined', ({ agentId: joinedAgentId, channelId }) => {
      console.log(`📢 Joined channel ${channelId} for agent ${joinedAgentId}`)
    })

    // Listen for user's own messages echoed back
    socket.on('user:message', ({ content, timestamp }) => {
      onUserMessageRef.current(content, timestamp)
    })

    // Listen for agent responses
    socket.on('agent:message', ({ content, timestamp }) => {
      console.log('📨 Received agent:message event:', {
        content: content?.substring(0, 50),
        timestamp
      })
      onAgentMessageRef.current(content, timestamp)
      setIsSending(false)
    })

    // Error handling
    socket.on('error', ({ message: errorMessage }) => {
      console.error('Socket error:', errorMessage)
      alert(`エラー: ${errorMessage}`)
      setIsSending(false)
    })

    // Cleanup on unmount
    return () => {
      if (agent?.channelId) {
        socket.emit('agent:leave', { channelId: agent.channelId })
      }
      socket.disconnect()
      socketRef.current = null
    }
  }, [agentId, agent])

  const sendMessage = (message: string) => {
    if (!agentId || !socketRef.current || !isConnected) return

    setIsSending(true)

    console.log('📤 Sending agent:sendMessage event:', {
      agentId,
      message
    })
    socketRef.current.emit('agent:sendMessage', {
      agentId,
      message,
    })
    console.log('✅ Message sent, waiting for response...')
  }

  return {
    isConnected,
    isSending,
    sendMessage,
  }
}
