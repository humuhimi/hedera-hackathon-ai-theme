/**
 * A2A Server Setup for ElizaOS
 * Creates A2A endpoints for each agent
 */

import { AgentCard } from '@a2a-js/sdk';
import { DefaultRequestHandler, JsonRpcTransportHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import { ElizaTaskStore } from './task-store.js';
import { ElizaAgentExecutor } from './executor.js';
import type { IAgentRuntime, UUID } from '@elizaos/core';
import type { Express } from 'express';

/**
 * Create Agent Card for an ElizaOS agent
 */
function createAgentCard(runtime: IAgentRuntime, baseUrl: string, agentPath: string): AgentCard {
  const character = runtime.character;

  return {
    protocolVersion: '0.3.0',
    name: character.name || 'ElizaOS Agent',
    description: character.bio?.[0] || 'AI agent powered by ElizaOS and Hedera blockchain',
    url: `${baseUrl}${agentPath}`,
    version: '1.0.0',

    // Capabilities
    capabilities: {
      streaming: true,
      pushNotifications: false,
      // TODO: Implement state transition history tracking to enable this capability.
      // Currently only stores the latest task state, not the full history of transitions.
      // When implementing:
      // 1. Store each state change with timestamp in task history array
      // 2. Modify ElizaTaskStore to append state changes instead of overwriting
      // 3. Add TaskStatus with sequence numbers as per A2A v0.3.0 spec
      // 4. Consider implementing pagination/indexing for efficient history retrieval
      stateTransitionHistory: false,
    },

    // Input/Output modes
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],

    // Skills based on character capabilities
    skills: [
      {
        id: 'general-conversation',
        name: 'General Conversation',
        description: 'Engage in natural conversation and provide assistance',
        tags: ['chat', 'conversation', 'assistance'],
        examples: character.messageExamples?.map((ex) => {
          const userMsg = ex.find((msg) => msg.name === 'user');
          return userMsg?.content?.text || '';
        }).filter(Boolean) || [
          'Hello, how can you help me?',
          'Tell me about yourself',
        ],
        inputModes: ['text/plain'],
        outputModes: ['text/plain'],
      },
    ],

    // TODO: Implement API key authentication when exposing A2A endpoints externally.
    // For internal agent-to-agent communication, authentication is not required.
    // When implementing for external access:
    // 1. Add securitySchemes to Agent Card:
    //    securitySchemes: {
    //      apiKey: {
    //        type: 'apiKey',
    //        in: 'header',
    //        name: 'X-API-Key',
    //      },
    //    },
    // 2. Implement authentication middleware in A2AExpressApp or custom Express middleware
    // 3. Generate and manage API keys per agent or per client organization
    // 4. Add key validation and rate limiting per A2A Protocol v0.3.0 §4.4
    // Note: Declaring securitySchemes without implementation violates A2A spec.

    // Provider information
    provider: {
      organization: 'Jimo Market',
      url: baseUrl,
    },
  };
}

/**
 * Setup A2A server for a single agent
 */
export function setupAgentA2A(
  app: Express,
  runtime: IAgentRuntime,
  roomId: UUID,
  basePath: string
): void {
  const agentPath = `/agents/${runtime.agentId}/a2a`;

  // Base URL for Agent Card - must be set in .env
  if (!process.env.SERVER_PORT) {
    throw new Error('SERVER_PORT environment variable is required');
  }
  if (!process.env.A2A_PUBLIC_URL) {
    throw new Error('A2A_PUBLIC_URL environment variable is required');
  }
  const baseUrl = process.env.A2A_PUBLIC_URL;

  console.log(`🤖 Setting up A2A for agent: ${runtime.character.name}`);
  console.log(`   Path: ${agentPath}`);
  console.log(`   Public URL: ${baseUrl}${agentPath}`);

  // Create components
  const agentCard = createAgentCard(runtime, baseUrl, agentPath);
  const taskStore = new ElizaTaskStore(runtime, roomId);
  const agentExecutor = new ElizaAgentExecutor(runtime, roomId);
  const requestHandler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor);
  const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

  // WORKAROUND: Manually add A2A routes BEFORE calling A2AExpressApp
  // This ensures they appear at the TOP of the router stack, before SPA fallback

  // Agent Card endpoint
  app.get(`${agentPath}/.well-known/agent-card.json`, (req, res) => {
    console.log(`📇 Agent Card requested for ${runtime.character.name}: ${req.path}`);
    res.json(agentCard);
  });

  // JSON-RPC endpoint
  app.post(`${agentPath}/`, async (req, res) => {
    try {
      const result = await jsonRpcHandler.handle(req.body);

      // Handle streaming responses
      if (Symbol.asyncIterator in Object(result)) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of result as AsyncGenerator) {
          res.write(JSON.stringify(chunk) + '\n');
        }
        res.end();
      } else {
        // Non-streaming response
        res.json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message,
        },
        id: req.body.id || null,
      });
    }
  });

  console.log(`✅ A2A ready for ${runtime.character.name} at ${agentPath}`);
  console.log(`   - Agent Card: GET ${agentPath}/.well-known/agent-card.json`);
  console.log(`   - JSON-RPC Endpoint: POST ${agentPath}/`);
  console.log(`     Available methods: message.send, message.stream, task.get, task.list, task.cancel`);
}

/**
 * Setup A2A for all agents in ElizaOS
 */
export function setupMultiAgentA2A(
  app: Express,
  agents: IAgentRuntime[]
): void {
  console.log(`🚀 Setting up A2A for ${agents.length} agents`);

  // Store initial stack length to identify newly added routes
  const initialStackLength = app._router?.stack?.length || 0;
  console.log(`📊 Initial router stack length: ${initialStackLength}`);

  // First, setup all A2A routes normally
  for (const runtime of agents) {
    // Create a room for A2A interactions
    // In ElizaOS, roomId represents a conversation space
    const roomId = runtime.agentId; // Use agent's own ID as room

    setupAgentA2A(app, runtime, roomId, '');
  }

  // CRITICAL: Move newly added A2A routes to the FRONT of the middleware stack
  // This ensures they are processed BEFORE the SPA fallback
  if (app._router && app._router.stack) {
    const stack = app._router.stack;
    const newStackLength = stack.length;
    console.log(`📊 New router stack length: ${newStackLength} (+${newStackLength - initialStackLength} routes)`);

    // Get the newly added layers (A2A routes)
    const newLayers = stack.slice(initialStackLength);
    const existingLayers = stack.slice(0, initialStackLength);

    console.log(`📍 Found ${newLayers.length} newly added A2A routes`);
    for (const layer of newLayers) {
      if (layer.route && layer.route.path) {
        console.log(`   - ${layer.route.methods ? Object.keys(layer.route.methods).join(',').toUpperCase() : '?'} ${layer.route.path}`);
      }
    }

    // Rebuild stack with A2A routes FIRST, then existing routes (including SPA fallback)
    app._router.stack = [...newLayers, ...existingLayers];
    console.log(`✅ Moved ${newLayers.length} A2A routes to FRONT of ${stack.length} total layers`);
  }

  console.log(`✅ A2A setup complete for all agents`);
}
