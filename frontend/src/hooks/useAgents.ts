import { useState, useEffect, useCallback } from 'react'
import { Agent, AgentType } from '../types/agent'
import { api } from '../services/api'
import { sessionManager } from '../services/sessionManager'
import { useAuth } from '../contexts/AuthContext'

export function useAgents() {
  const { isAuthenticated, user } = useAuth()
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)

  const loadAgents = useCallback(async () => {
    try {
      setIsLoadingAgents(true)
      const session = sessionManager.get()
      if (!session?.token) return
      
      const fetchedAgents = await api.getAgents(session.token)
      setAgents(fetchedAgents)
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setIsLoadingAgents(false)
    }
  }, [])

  // Load agents when authenticated, clear when logged out
  useEffect(() => {
    if (isAuthenticated && user) {
      loadAgents()
    } else {
      setAgents([])
    }
  }, [isAuthenticated, user, loadAgents])

  const createAgent = useCallback(async (type: AgentType) => {
    try {
      setIsCreatingAgent(true)
      const session = sessionManager.get()
      if (!session?.token) {
        alert('Authentication token is missing. Please log in again.')
        return
      }
      const token = session.token

      const name = type === 'give' ? 'Seller AI' : 'Buyer AI'
      await api.createAgent(token, {
        type,
        name,
        description: type === 'give' 
          ? 'AI that helps you sell items'
          : 'AI that helps you find and buy items'
      })

      await loadAgents()
      alert(`${name} has been created!`)
    } catch (error) {
      console.error('Failed to create agent:', error)
      alert('Failed to create agent.')
    } finally {
      setIsCreatingAgent(false)
    }
  }, [loadAgents])

  return {
    agents,
    isLoadingAgents,
    isCreatingAgent,
    createAgent,
    loadAgents
  }
}
