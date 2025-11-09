import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, Agent } from '../services/api'
import { sessionManager } from '../services/sessionManager'

/**
 * Custom hook for managing agent data and CRUD operations
 * @param agentId - The ID of the agent to manage
 * @returns Agent data, loading state, and mutation functions
 */
export function useAgentData(agentId: string | undefined) {
  const navigate = useNavigate()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAgent = useCallback(async () => {
    try {
      setLoading(true)
      const session = sessionManager.get()
      if (!session?.token || !agentId) return

      const fetchedAgent = await api.getAgent(session.token, agentId)
      setAgent(fetchedAgent)
    } catch (error) {
      console.error('Failed to load agent:', error)
      alert('Failed to load agent')
      navigate('/home')
    } finally {
      setLoading(false)
    }
  }, [agentId, navigate])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  const updateStatus = async () => {
    if (!agent || !agentId) return

    const session = sessionManager.get()
    if (!session?.token) return

    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active'
      const updatedAgent = await api.updateAgentStatus(session.token, agentId, newStatus)
      setAgent(updatedAgent)
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  const deleteAgent = async () => {
    if (!agentId || !confirm('Are you sure you want to delete this agent?')) return

    const session = sessionManager.get()
    if (!session?.token) return

    try {
      await api.deleteAgent(session.token, agentId)
      alert('Agent has been deleted')
      navigate('/home')
    } catch (error) {
      console.error('Failed to delete agent:', error)
      alert('Failed to delete')
    }
  }

  return {
    agent,
    loading,
    updateStatus,
    deleteAgent,
  }
}
