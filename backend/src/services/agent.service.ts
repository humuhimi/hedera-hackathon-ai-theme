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

// Configuration constants
const CONFIG = {
  CONTEXT_MESSAGE_LIMIT: 10,       // Number of messages to include in context summary
  CONTEXT_CHAR_LIMIT: 200,         // Max characters per message in summary
  POLL_MAX_ATTEMPTS: 20,           // Max polling attempts for agent response
  POLL_INTERVAL_MS: 1000,          // Polling interval in milliseconds
  RECENT_MESSAGE_THRESHOLD_MS: 5000, // Threshold for "recent" messages
} as const;

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

    // Step 2: Create channel for agent messaging
    const channelPayload = {
      id: elizaAgentId,
      serverId: this.elizaOsServerId,
      name: name,
      type: 'direct',
      participants: [userId, elizaAgentId]
    };

    const channelResponse = await fetch(`${this.elizaOsUrl}/api/messaging/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channelPayload),
    });

    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      throw new Error(`Failed to create channel: ${errorText}`);
    }

    const channelResult = await channelResponse.json() as { success: boolean; data: { channel: { id: string } } };
    const actualChannelId = channelResult.data.channel.id;

    // Add agent as participant to the channel
    const addParticipantResponse = await fetch(
      `${this.elizaOsUrl}/api/messaging/central-channels/${actualChannelId}/agents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: elizaAgentId }),
      }
    );

    if (!addParticipantResponse.ok) {
      const errorText = await addParticipantResponse.text();
      throw new Error(`Failed to add agent as participant: ${errorText}`);
    }

    // Add user as participant to the channel
    const addUserResponse = await fetch(
      `${this.elizaOsUrl}/api/messaging/central-channels/${actualChannelId}/agents`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: userId }),
      }
    );

    if (!addUserResponse.ok) {
      const errorText = await addUserResponse.text();
      console.warn(`Failed to add user as participant: ${errorText}`);
    }

    // Step 3: Register agent on blockchain
    console.log(`🔗 Registering agent on blockchain...`);
    const registration = await erc8004Service.registerAgent(userId, {
      name: name,
      type: type as 'give' | 'want',
      description: description || ''
    });
    console.log(`✅ Agent registered on blockchain with ID: ${registration.agentId}`);

    // Step 4: Create agent in database with both ElizaOS and blockchain info
    const agent = await prisma.agent.create({
      data: {
        userId,
        type,
        name,
        description,
        status: 'active',
        channelId: actualChannelId, // Use actual channel ID from ElizaOS response
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
      // Save user message to database
      await prisma.message.create({
        data: {
          agentId,
          role: 'user',
          content: message,
        },
      });

      // Check if this is the first message after restoration (context injection needed)
      let messageWithContext = message;
      const needsContextInjection = await this.checkIfNeedsContextInjection(agentId, agent.channelId);

      if (needsContextInjection) {
        const contextSummary = await this.getConversationContextSummary(agentId);
        if (contextSummary) {
          messageWithContext = `[System Context: The following is a summary of previous conversation history. Please refer to this information.]\n${contextSummary}\n\n[User's new message:]\n${message}`;
          console.log(`📜 Injecting conversation context for agent ${agentId}`);
        }
      }

      const messagePayload = {
        channel_id: agent.channelId,
        server_id: this.elizaOsServerId,
        author_id: userId,
        content: messageWithContext,
        source_type: 'api',
        raw_message: {
          text: message, // Original message for display
          agentId: agentId,
          userId: userId,
        },
      };
      console.log(`📤 Message submission payload:`, JSON.stringify(messagePayload, null, 2));

      const submitResponse = await fetch(`${this.elizaOsUrl}/api/messaging/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error(`ElizaOS API error: ${submitResponse.status} ${errorText}`);
        throw new Error(`ElizaOS responded with status ${submitResponse.status}`);
      }

      const submitResult = await submitResponse.json() as { data?: { id: string; message?: { id: string } } };
      console.log(`📥 ElizaOS submit response:`, JSON.stringify(submitResult, null, 2));
      // ElizaOS returns id directly in data, not nested in message
      const userMessageId = submitResult.data?.id || submitResult.data?.message?.id;
      console.log(`🔑 Extracted userMessageId: ${userMessageId}`);

      // Wait for agent response (poll for new messages)
      const agentResponse = await this.waitForAgentResponse(agent.channelId, userMessageId);

      // Save agent response to database
      if (agentResponse) {
        await prisma.message.create({
          data: {
            agentId,
            role: 'agent',
            content: agentResponse,
          },
        });
      }

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
    const collectedResponses: Array<{ id: string; content: string; createdAt: string }> = [];
    const seenMessageIds = new Set<string>();
    let firstResponseTime = 0;
    const ADDITIONAL_WAIT_MS = 3000; // Wait 3 seconds after first response for additional messages

    console.log(`⏳ Waiting for agent response in channel ${channelId}, after message ${afterMessageId}`);

    for (let attempt = 0; attempt < CONFIG.POLL_MAX_ATTEMPTS; attempt++) {
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

          console.log(`📋 Polling attempt ${attempt + 1}/${CONFIG.POLL_MAX_ATTEMPTS}, found ${messages.length} messages`);

          // Find user message timestamp
          const userMessage = messages.find(msg => msg.id === afterMessageId);
          const userMessageTime = userMessage ? new Date(userMessage.createdAt).getTime() : 0;

          if (userMessage) {
            console.log(`✅ Found user message: ${afterMessageId}`);
          }

          // Find agent responses that came after our user message (by timestamp)
          for (const msg of messages) {
            if (msg.sourceType === 'agent_response' && !seenMessageIds.has(msg.id)) {
              const msgTime = new Date(msg.createdAt).getTime();

              // Only include responses newer than user message
              if (afterMessageId && userMessageTime > 0 && msgTime <= userMessageTime) {
                continue;
              }

              const content = msg.content || msg.rawMessage?.text;
              if (content) {
                console.log(`✅ Found agent response: ${msg.id}, content: ${content.substring(0, 50)}...`);
                collectedResponses.push({
                  id: msg.id,
                  content,
                  createdAt: msg.createdAt
                });
                seenMessageIds.add(msg.id);
                if (firstResponseTime === 0) {
                  firstResponseTime = Date.now();
                }
              }
            }
          }

          // If we didn't find afterMessageId, look for any recent agent_response
          if (!afterMessageId) {
            for (const msg of messages) {
              if (msg.sourceType === 'agent_response' && !seenMessageIds.has(msg.id)) {
                const messageAge = Date.now() - new Date(msg.createdAt).getTime();
                if (messageAge < CONFIG.RECENT_MESSAGE_THRESHOLD_MS) {
                  const content = msg.content || msg.rawMessage?.text;
                  if (content) {
                    console.log(`✅ Found recent agent response: ${msg.id}`);
                    collectedResponses.push({
                      id: msg.id,
                      content,
                      createdAt: msg.createdAt
                    });
                    seenMessageIds.add(msg.id);
                    if (firstResponseTime === 0) {
                      firstResponseTime = Date.now();
                    }
                  }
                }
              }
            }
          }

          // If we have responses, wait a bit more for additional messages
          if (collectedResponses.length > 0 && firstResponseTime > 0) {
            const timeSinceFirstResponse = Date.now() - firstResponseTime;
            if (timeSinceFirstResponse >= ADDITIONAL_WAIT_MS) {
              // Sort by creation time and concatenate
              collectedResponses.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
              const concatenated = collectedResponses.map(r => r.content).join('\n\n');
              console.log(`✅ Returning ${collectedResponses.length} concatenated response(s)`);
              return concatenated;
            }
          }
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
      } catch (error) {
        console.error('Error polling for agent response:', error);
      }
    }

    // Return whatever we collected if we hit timeout
    if (collectedResponses.length > 0) {
      collectedResponses.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const concatenated = collectedResponses.map(r => r.content).join('\n\n');
      console.log(`⏰ Timeout reached, returning ${collectedResponses.length} collected response(s)`);
      return concatenated;
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

  /**
   * Get message history for an agent
   */
  async getMessageHistory(agentId: string, userId: string, limit: number = 50) {
    // Verify agent exists and belongs to user
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId },
    });

    if (!agent) {
      throw new Error('Agent not found or access denied');
    }

    // Get message history
    return prisma.message.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Restore all agents to ElizaOS on server startup
   * This ensures agents persist across restarts with conversation history
   */
  async restoreAgentsToElizaOS() {
    console.log('🔄 Restoring agents to ElizaOS...');

    // Get all active agents from database
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
    });

    if (agents.length === 0) {
      console.log('📭 No agents to restore');
      return;
    }

    console.log(`📦 Found ${agents.length} agents to restore`);

    for (const agent of agents) {
      try {
        // Create agent in ElizaOS
        const elizaResponse = await fetch(`${this.elizaOsUrl}/internal/agents/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: agent.type }),
        });

        if (!elizaResponse.ok) {
          console.error(`❌ Failed to restore agent ${agent.id}: ${await elizaResponse.text()}`);
          continue;
        }

        const elizaData = await elizaResponse.json() as { agentId: string };
        const elizaAgentId = elizaData.agentId;

        let channelId = agent.channelId;

        // Reuse existing channel if available, otherwise create new one
        if (channelId) {
          console.log(`📡 Reusing existing channel ${channelId} for agent ${agent.name}`);

          // Try to recreate the channel with the same ID
          const channelPayload = {
            id: channelId, // Use existing channel ID
            serverId: this.elizaOsServerId,
            name: agent.name,
            type: 'direct',
            participants: [agent.userId, elizaAgentId]
          };

          const channelResponse = await fetch(`${this.elizaOsUrl}/api/messaging/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(channelPayload),
          });

          if (!channelResponse.ok) {
            // Channel might already exist or creation failed, log but continue
            console.warn(`⚠️ Could not recreate channel ${channelId}, trying with new channel`);
            // Clear invalid channelId in database
            await prisma.agent.update({
              where: { id: agent.id },
              data: { channelId: null },
            });
            channelId = null;
          }
        }

        // Create new channel if no existing channel or recreation failed
        if (!channelId) {
          const channelPayload = {
            id: elizaAgentId,
            serverId: this.elizaOsServerId,
            name: agent.name,
            type: 'direct',
            participants: [agent.userId, elizaAgentId]
          };

          const channelResponse = await fetch(`${this.elizaOsUrl}/api/messaging/channels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(channelPayload),
          });

          if (!channelResponse.ok) {
            console.error(`❌ Failed to create channel for agent ${agent.id}`);
            continue;
          }

          const channelResult = await channelResponse.json() as { success: boolean; data: { channel: { id: string } } };
          channelId = channelResult.data.channel.id;

          // Update agent record with new channel ID
          await prisma.agent.update({
            where: { id: agent.id },
            data: { channelId },
          });
        }

        // Add agent as participant
        await fetch(
          `${this.elizaOsUrl}/api/messaging/central-channels/${channelId}/agents`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: elizaAgentId }),
          }
        );

        // Add user as participant
        await fetch(
          `${this.elizaOsUrl}/api/messaging/central-channels/${channelId}/agents`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agent.userId }),
          }
        );

        // Log message history count (context will be injected on first message)
        const messageCount = await prisma.message.count({ where: { agentId: agent.id } });
        if (messageCount > 0) {
          console.log(`📜 Agent has ${messageCount} messages in history`);
        }

        console.log(`✅ Restored agent ${agent.name} (${agent.id}) -> ElizaOS: ${elizaAgentId}, Channel: ${channelId}`);
      } catch (error) {
        console.error(`❌ Error restoring agent ${agent.id}:`, error);
      }
    }

    console.log('✅ Agent restoration complete');
  }

  /**
   * Check if this is the first message after agent restoration
   * by checking if there are messages in ElizaOS channel
   */
  private async checkIfNeedsContextInjection(agentId: string, channelId: string): Promise<boolean> {
    try {
      // Check if we have stored messages but ElizaOS channel is empty/new
      const storedMessageCount = await prisma.message.count({ where: { agentId } });

      if (storedMessageCount <= 1) {
        // No previous history or just the current message
        return false;
      }

      // Check ElizaOS channel for messages
      const messagesResponse = await fetch(
        `${this.elizaOsUrl}/api/messaging/central-channels/${channelId}/messages?limit=5`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json() as {
          data?: { messages?: Array<{ sourceType: string }> }
        };
        const messages = messagesData.data?.messages || [];

        // Count non-history messages (actual conversation in ElizaOS)
        const realMessages = messages.filter(m => m.sourceType !== 'history');

        // If stored messages > real messages in ElizaOS, need context injection
        return realMessages.length < 2 && storedMessageCount > 1;
      }
    } catch (error) {
      console.warn('Error checking context injection need:', error);
    }
    return false;
  }

  /**
   * Get a summary of previous conversation for context injection
   */
  private async getConversationContextSummary(agentId: string): Promise<string | null> {
    try {
      // Get recent messages excluding the current one
      const messages = await prisma.message.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: CONFIG.CONTEXT_MESSAGE_LIMIT,
        skip: 1,  // Skip the current message
      });

      if (messages.length === 0) {
        return null;
      }

      // Reverse to chronological order
      messages.reverse();

      // Format as conversation summary
      const summary = messages.map(m => {
        const role = m.role === 'user' ? 'User' : 'Agent';
        const truncated = m.content.length > CONFIG.CONTEXT_CHAR_LIMIT;
        return `${role}: ${m.content.substring(0, CONFIG.CONTEXT_CHAR_LIMIT)}${truncated ? '...' : ''}`;
      }).join('\n');

      return `Previous conversation (${messages.length} messages):\n${summary}`;
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return null;
    }
  }
}

export const agentService = new AgentService();