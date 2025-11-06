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
      alert('エージェントの読み込みに失敗しました')
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
      alert('ステータスの更新に失敗しました')
    }
  }

  const deleteAgent = async () => {
    if (!agentId || !confirm('本当にこのエージェントを削除しますか？')) return

    const session = sessionManager.get()
    if (!session?.token) return

    try {
      await api.deleteAgent(session.token, agentId)
      alert('エージェントを削除しました')
      navigate('/home')
    } catch (error) {
      console.error('Failed to delete agent:', error)
      alert('削除に失敗しました')
    }
  }

  return {
    agent,
    loading,
    updateStatus,
    deleteAgent,
  }
}
