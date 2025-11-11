import { PrismaClient } from '@prisma/client';
import { erc8004Service } from './erc8004.service';

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
  private elizaOsServerId = process.env.ELIZAOS_SERVER_ID;

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

    // Get user's DID for blockchain registration
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.did) {
      throw new Error('User does not have a DID. Please create a DID first.');
    }

    // Step 1: Create agent instance in ElizaOS (this generates the agentId)
    console.log(`🔨 Creating ${type === 'give' ? 'Seller' : 'Buyer'} agent in ElizaOS...`);
    const elizaResponse = await fetch(`${this.elizaOsUrl}/internal/agents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });

    if (!elizaResponse.ok) {
      const errorText = await elizaResponse.text();
      throw new Error(`Failed to create agent in ElizaOS: ${errorText}`);
    }

    const elizaData = await elizaResponse.json() as { agentId: string; name: string; type: string };
    const elizaAgentId = elizaData.agentId;
    console.log(`✅ ElizaOS agent created with ID: ${elizaAgentId}`);

    // Step 2: Register agent on blockchain
    console.log(`🔗 Registering agent on blockchain...`);
    const registration = await erc8004Service.registerAgent(userId, {
      name: name,
      type: type as 'give' | 'want',
      description: description || ''
    });
    console.log(`✅ Agent registered on blockchain with ID: ${registration.agentId}`);

    // Step 3: Create agent in database with both ElizaOS and blockchain info
    const agent = await prisma.agent.create({
      data: {
        userId,
        type,
        name,
        description,
        status: 'active',
        channelId: elizaAgentId, // ElizaOS agentId stored as channelId
        erc8004AgentId: registration.agentId,
        blockchainTxId: registration.transactionId,
        tokenURI: registration.tokenURI,
        ownerDid: registration.ownerDid,
      },
    });

    console.log(`✅ Agent ${agent.id} created (ElizaOS: ${elizaAgentId}, Blockchain: ${registration.agentId})`);

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

    // Check if agent has a channelId
    if (!agent.channelId) {
      throw new Error('Agent does not have an associated ElizaOS channel');
    }

    // Send message to ElizaOS via messaging API
    try {
      const submitResponse = await fetch(`${this.elizaOsUrl}/api/messaging/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel_id: agent.channelId,
          server_id: this.elizaOsServerId,
          author_id: userId,
          content: message,
          source_type: 'api',
          raw_message: {
            text: message,
            agentId: agentId,
            userId: userId,
          },
        }),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error(`ElizaOS API error: ${submitResponse.status} ${errorText}`);
        throw new Error(`ElizaOS responded with status ${submitResponse.status}`);
      }

      const submitResult = await submitResponse.json() as { data?: { message?: { id: string } } };
      const userMessageId = submitResult.data?.message?.id;

      // Wait for agent response (poll for new messages)
      const agentResponse = await this.waitForAgentResponse(agent.channelId, userMessageId);

      return {
        message: agentResponse || 'Agent is processing your message...',
        agentId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to communicate with ElizaOS at ${this.elizaOsUrl}:`, error);
      throw new Error('Failed to send message to ElizaOS');
    }
  }

  /**
   * Wait for agent response by polling channel messages
   * TODO: Replace HTTP polling with WebSocket/Socket.IO for real-time agent responses
   */
  private async waitForAgentResponse(channelId: string, afterMessageId?: string): Promise<string | null> {
    const maxAttempts = 20; // 20 seconds max wait
    const pollInterval = 1000; // 1 second
    let foundUserMessage = false;

    console.log(`⏳ Waiting for agent response in channel ${channelId}, after message ${afterMessageId}`);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Get recent messages from channel
        const messagesResponse = await fetch(
          `${this.elizaOsUrl}/api/messaging/central-channels/${channelId}/messages?limit=10`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json() as {
            data?: {
              messages?: Array<{
                id: string;
                sourceType: string;
                content?: string;
                rawMessage?: { text: string };
                createdAt: string;
              }>
            }
          };
          const messages = messagesData.data?.messages || [];

          console.log(`📋 Polling attempt ${attempt + 1}/${maxAttempts}, found ${messages.length} messages`);

          // Find our user message first to mark the position
          for (const msg of messages) {
            if (afterMessageId && msg.id === afterMessageId) {
              foundUserMessage = true;
              console.log(`✅ Found user message: ${afterMessageId}`);
            }
            
            // Find agent response that came after our user message
            if (foundUserMessage && msg.sourceType === 'agent_response' && msg.id !== afterMessageId) {
              console.log(`✅ Found agent response: ${msg.id}, content: ${msg.content?.substring(0, 50)}`);
              return msg.content || msg.rawMessage?.text || null;
            }
          }

          // If we didn't find afterMessageId, look for any recent agent_response
          if (!afterMessageId) {
            for (const msg of messages) {
              if (msg.sourceType === 'agent_response') {
                const messageAge = Date.now() - new Date(msg.createdAt).getTime();
                if (messageAge < 5000) { // Message created within last 5 seconds
                  console.log(`✅ Found recent agent response: ${msg.id}`);
                  return msg.content || msg.rawMessage?.text || null;
                }
              }
            }
          }
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Error polling for agent response:', error);
      }
    }

    console.log(`❌ Timeout waiting for agent response in channel ${channelId}`);
    return null; // Timeout
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

    return { success: true };
  }
}

export const agentService = new AgentService();
