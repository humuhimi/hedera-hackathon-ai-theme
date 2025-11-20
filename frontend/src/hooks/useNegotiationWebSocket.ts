import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { sessionManager } from '../services/sessionManager'

const BACKEND_URL = import.meta.env.VITE_API_URL

interface NegotiationMessage {
  id: string
  roomId: string
  sender: 'seller' | 'buyer'
  senderAgentId: number
  content: string
  messageType: string
  metadata: any
  createdAt: string
}

interface NegotiationConcluded {
  roomId: string
  decisionType: 'price_agreed' | 'accepted' | 'rejected'
  agreedPrice?: number
  reason?: string
}

interface UseNegotiationWebSocketProps {
  roomId: string | undefined
  onMessage: (message: NegotiationMessage) => void
  onStatusChanged?: (status: string) => void
  onConcluded?: (data: NegotiationConcluded) => void
}

/**
 * Custom hook for receiving negotiation messages via WebSocket
 */
export function useNegotiationWebSocket({
  roomId,
  onMessage,
  onStatusChanged,
  onConcluded,
}: UseNegotiationWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const onMessageRef = useRef(onMessage)
  const onStatusChangedRef = useRef(onStatusChanged)
  const onConcludedRef = useRef(onConcluded)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onStatusChangedRef.current = onStatusChanged
    onConcludedRef.current = onConcluded
  }, [onMessage, onStatusChanged, onConcluded])

  useEffect(() => {
    const session = sessionManager.get()

    if (!session?.token || !roomId) {
      return
    }

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
      console.log('✅ Negotiation WebSocket connected')
      setIsConnected(true)

      // Join negotiation room
      socket.emit('negotiation:join', { roomId })
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Negotiation WebSocket connection error:', error.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ Negotiation WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    // Listen for messages
    socket.on('negotiation:message', (message: NegotiationMessage) => {
      console.log('💬 Negotiation message:', message)
      onMessageRef.current(message)
    })

    // Listen for status changes
    socket.on('negotiation:statusChanged', ({ status }) => {
      console.log('🔄 Negotiation status changed:', status)
      onStatusChangedRef.current?.(status)
    })

    // Listen for negotiation conclusion
    socket.on('negotiation:concluded', (data: NegotiationConcluded & { status?: string }) => {
      console.log('✅ Negotiation concluded:', data)

      // Update status if provided
      if (data.status) {
        onStatusChangedRef.current?.(data.status)
      }

      onConcludedRef.current?.(data)
    })

    // Error handling
    socket.on('error', ({ message: errorMessage }) => {
      console.error('Negotiation WebSocket error:', errorMessage)
    })

    // Cleanup on unmount
    return () => {
      socket.emit('negotiation:leave', { roomId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [roomId])

  return {
    isConnected,
  }
}
