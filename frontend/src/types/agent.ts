export type AgentType = 'give' | 'want'

export type AgentStatus = 'active' | 'paused'

export interface Agent {
  id: string
  type: AgentType
  name: string
  icon: string
  inquiries: number
  status: AgentStatus
}
