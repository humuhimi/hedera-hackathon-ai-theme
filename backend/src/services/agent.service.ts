import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateAgentParams {
  userId: string;
  type: 'give' | 'want';
  name: string;
  description?: string;
}

interface SendMessageParams {
  agentId: string;
  message: string;
  userId: string;
}

class AgentService {
  private elizaOsUrl = process.env.ELIZAOS_URL;

  /**
   * Create a new agent for a user
   * Note: ElizaOS runs as a separate service on port 3333
   */
  async createAgent(params: CreateAgentParams) {
    const { userId, type, name, description } = params;

    // Validate type
    if (type !== 'give' && type !== 'want') {
      throw new Error('Invalid agent type. Must be "give" or "want"');
    }

    // Create agent in database
    const agent = await prisma.agent.create({
      data: {
        userId,
        type,
        name,
        description,
        status: 'active',
      },
    });

    console.log(`✅ Agent ${agent.id} created (${type}) - ElizaOS runs separately on ${this.elizaOsUrl}`);

    return agent;
  }

  /**
   * Send message to ElizaOS agent via HTTP
   */
  async sendMessage(params: SendMessageParams) {
    const { agentId, message, userId } = params;

    // Verify agent exists and belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId,
        status: 'active',
      },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    // Send message to ElizaOS via HTTP
    try {
      const response = await fetch(`${this.elizaOsUrl}/api/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          message,
          characterType: agent.type, // 'give' or 'want'
        }),
      });

      if (!response.ok) {
        throw new Error(`ElizaOS HTTP error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      return {
        message: result.text || result.message || 'No response',
        agentId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to communicate with ElizaOS at ${this.elizaOsUrl}:`, error);
      throw new Error('Failed to process message - ElizaOS may not be running');
    }
  }

  /**
   * Get all agents for a user
   */
  async getUserAgents(userId: string) {
    return prisma.agent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single agent by ID
   */
  async getAgent(agentId: string, userId: string) {
    return prisma.agent.findFirst({
      where: {
        id: agentId,
        userId,
      },
    });
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, userId: string, status: 'active' | 'paused') {
    // Update with userId check to prevent unauthorized access
    const result = await prisma.agent.updateMany({
      where: { 
        id: agentId, 
        userId  // Ensure user owns the agent
      },
      data: { status },
    });

    if (result.count === 0) {
      throw new Error('Agent not found or access denied');
    }

    // Fetch and return the updated agent
    return prisma.agent.findUnique({
      where: { id: agentId },
    });
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string, userId: string) {
    // Delete with userId check to prevent unauthorized access
    const result = await prisma.agent.deleteMany({
      where: { 
        id: agentId, 
        userId  // Ensure user owns the agent
      },
    });

    if (result.count === 0) {
      throw new Error('Agent not found or access denied');
    }

    // Remove runtime if exists
    this.runtimes.delete(agentId);

    return { success: true };
  }
}

export const agentService = new AgentService();
