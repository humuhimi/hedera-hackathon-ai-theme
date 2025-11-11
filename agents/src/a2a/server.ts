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
      console.log(`\n🚨🚨🚨 CUSTOM A2A HANDLER CALLED FOR ${runtime.character.name} 🚨🚨🚨\n`);
      console.log(`📨 A2A JSON-RPC Request for ${runtime.character.name}:`, JSON.stringify(req.body));
      const result = await jsonRpcHandler.handle(req.body);
      console.log(`📤 A2A JSON-RPC Response:`, JSON.stringify(result).substring(0, 200));

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

  // Create agent map for quick lookup
  const agentMap = new Map<string, { runtime: IAgentRuntime; roomId: UUID; handlers: any }>();

  // Setup handlers for each agent
  for (const runtime of agents) {
    const roomId = runtime.agentId;
    const agentPath = `/agents/${runtime.agentId}/a2a`;

    if (!process.env.A2A_PUBLIC_URL) {
      throw new Error('A2A_PUBLIC_URL environment variable is required');
    }
    const baseUrl = process.env.A2A_PUBLIC_URL;

    const agentCard = createAgentCard(runtime, baseUrl, agentPath);
    const taskStore = new ElizaTaskStore(runtime, roomId);
    const agentExecutor = new ElizaAgentExecutor(runtime, roomId);
    const requestHandler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor);
    const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

    agentMap.set(runtime.agentId, {
      runtime,
      roomId,
      handlers: { agentCard, jsonRpcHandler },
    });

    console.log(`✅ Prepared A2A handlers for ${runtime.character.name} at ${agentPath}`);
  }

  // CRITICAL: Register A2A middleware BEFORE any other routes
  // This intercepts ALL requests to /agents/*/a2a/** and processes them
  app.use((req, res, next) => {
    const path = req.path;

    // Check if this is an A2A request
    const a2aMatch = path.match(/^\/agents\/([^\/]+)\/a2a(\/.*)?$/);
    if (!a2aMatch) {
      return next(); // Not an A2A request, pass to next handler
    }

    const agentId = a2aMatch[1];
    const subpath = a2aMatch[2] || '/';

    console.log(`🔍 A2A Middleware intercepted: ${req.method} ${path}`);

    const agent = agentMap.get(agentId);
    if (!agent) {
      console.error(`❌ Agent not found: ${agentId}`);
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Handle Agent Card request
    if (req.method === 'GET' && subpath === '/.well-known/agent-card.json') {
      console.log(`📇 Agent Card requested for ${agent.runtime.character.name}`);
      return res.json(agent.handlers.agentCard);
    }

    // Handle JSON-RPC request
    if (req.method === 'POST' && subpath === '/') {
      console.log(`\n🚨🚨🚨 A2A JSON-RPC REQUEST INTERCEPTED FOR ${agent.runtime.character.name} 🚨🚨🚨\n`);
      console.log(`📨 Request body:`, JSON.stringify(req.body));

      agent.handlers.jsonRpcHandler
        .handle(req.body)
        .then((result: any) => {
          console.log(`📤 A2A Response:`, JSON.stringify(result).substring(0, 200));

          if (Symbol.asyncIterator in Object(result)) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Transfer-Encoding', 'chunked');

            (async () => {
              for await (const chunk of result as AsyncGenerator) {
                res.write(JSON.stringify(chunk) + '\n');
              }
              res.end();
            })();
          } else {
            res.json(result);
          }
        })
        .catch((error: any) => {
          console.error(`❌ A2A Error:`, error);
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: error.message,
            },
            id: req.body.id || null,
          });
        });

      return; // Don't call next() - we've handled the request
    }

    // Unknown A2A subpath
    console.error(`❌ Unknown A2A path: ${subpath}`);
    return res.status(404).json({ error: 'Not found' });
  });

  console.log(`✅ A2A middleware registered for all ${agents.length} agents`);
}
