import type { AuthResponse, User } from '../types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Agent {
  id: string;
  userId: string;
  type: 'give' | 'want';
  name: string;
  description?: string;
  status: 'active' | 'paused';
  channelId?: string;
  createdAt: string;
  updatedAt: string;
  // ERC-8004 blockchain registration
  erc8004AgentId?: number;
  blockchainTxId?: string;
  tokenURI?: string;  // IPFS URI (ipfs://...)
  ownerDid?: string;  // Owner's DID
}

export interface AgentMessage {
  message: string;
  agentId: string;
  timestamp: string;
}

export const api = {
  /**
   * Get authentication challenge
   */
  async getChallenge(accountId: string): Promise<{
    challenge: string;
    message: string;
    issuedAt: string;
    domain: string;
    network: string;
  }> {
    const response = await fetch(`${API_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId })
    });

    if (!response.ok) {
      throw new Error(`Failed to get challenge: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Verify signature and authenticate
   */
  async authenticate(accountId: string, signature: string, userName?: string, region?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, signature, userName, region })
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get current user info
   */
  async getUserInfo(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Create a new agent
   */
  async createAgent(token: string, data: { type: 'give' | 'want'; name: string; description?: string }): Promise<Agent> {
    const response = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Failed to create agent: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get all agents for current user
   */
  async getAgents(token: string): Promise<Agent[]> {
    const response = await fetch(`${API_URL}/agents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agents: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get a specific agent
   */
  async getAgent(token: string, agentId: string): Promise<Agent> {
    const response = await fetch(`${API_URL}/agents/${agentId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Send message to an agent
   */
  async sendAgentMessage(token: string, agentId: string, message: string): Promise<AgentMessage> {
    const response = await fetch(`${API_URL}/agents/${agentId}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Update agent status
   */
  async updateAgentStatus(token: string, agentId: string, status: 'active' | 'paused'): Promise<Agent> {
    const response = await fetch(`${API_URL}/agents/${agentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(`Failed to update agent status: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Delete an agent
   */
  async deleteAgent(token: string, agentId: string): Promise<void> {
    const response = await fetch(`${API_URL}/agents/${agentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete agent: ${response.statusText}`);
    }
  },
};
