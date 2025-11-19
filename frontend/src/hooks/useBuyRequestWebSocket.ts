import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { sessionManager } from '../services/sessionManager'

const BACKEND_URL = import.meta.env.VITE_API_URL

interface BuyRequestProgress {
  buyRequestId: string
  searchStep: string
  searchMessage: string | null
  matchedListingId: number | null
  sellerAgentId: number | null
  a2aEndpoint: string | null
  searchError: string | null
}

interface UseBuyRequestWebSocketProps {
  buyRequestId: string | undefined
  onProgress: (progress: BuyRequestProgress) => void
}

/**
 * Custom hook for receiving BuyRequest progress updates via WebSocket
 */
export function useBuyRequestWebSocket({
  buyRequestId,
  onProgress,
}: UseBuyRequestWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const onProgressRef = useRef(onProgress)

  // Update ref when callback changes
  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    const session = sessionManager.get()

    if (!session?.token || !buyRequestId) {
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
      console.log('✅ BuyRequest WebSocket connected')
      setIsConnected(true)

      // Join buyRequest room
      socket.emit('buyRequest:join', { buyRequestId })
    })

    socket.on('connect_error', (error) => {
      console.error('❌ BuyRequest WebSocket connection error:', error.message)
    })

    socket.on('disconnect', (reason) => {
      console.log('❌ BuyRequest WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    // Listen for progress updates
    socket.on('buyRequest:progress', (progress: BuyRequestProgress) => {
      console.log('📦 BuyRequest progress:', progress)
      onProgressRef.current(progress)
    })

    // Error handling
    socket.on('error', ({ message: errorMessage }) => {
      console.error('BuyRequest WebSocket error:', errorMessage)
    })

    // Cleanup on unmount
    return () => {
      socket.emit('buyRequest:leave', { buyRequestId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [buyRequestId])

  return {
    isConnected,
  }
}
