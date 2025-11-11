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

// Global agent map for dynamic agent management
const globalAgentMap = new Map<string, { runtime: IAgentRuntime; roomId: UUID; handlers: any }>();

/**
 * Initialize A2A middleware (call once at server startup)
 * This registers the route handler but doesn't require any agents yet
 */
export function initializeA2AMiddleware(app: Express): void {
  if (!process.env.A2A_PUBLIC_URL) {
    throw new Error('A2A_PUBLIC_URL environment variable is required');
  }

  console.log('🔗 Initializing A2A middleware (dynamic agent support)...');

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

    const agent = globalAgentMap.get(agentId);
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

  console.log(`✅ A2A middleware initialized (ready for dynamic agents)`);
}

/**
 * Add an agent to A2A dynamically (called when agent is created)
 */
export function addAgentToA2A(runtime: IAgentRuntime): void {
  const roomId = runtime.agentId;
  const agentPath = `/agents/${runtime.agentId}/a2a`;
  const baseUrl = process.env.A2A_PUBLIC_URL!;

  const agentCard = createAgentCard(runtime, baseUrl, agentPath);
  const taskStore = new ElizaTaskStore(runtime, roomId);
  const agentExecutor = new ElizaAgentExecutor(runtime, roomId);
  const requestHandler = new DefaultRequestHandler(agentCard, taskStore, agentExecutor);
  const jsonRpcHandler = new JsonRpcTransportHandler(requestHandler);

  globalAgentMap.set(runtime.agentId, {
    runtime,
    roomId,
    handlers: { agentCard, jsonRpcHandler },
  });

  console.log(`✅ Added ${runtime.character.name} to A2A (ID: ${runtime.agentId})`);
  console.log(`   Agent Card: GET ${agentPath}/.well-known/agent-card.json`);
  console.log(`   JSON-RPC: POST ${agentPath}/`);
}

/**
 * Remove an agent from A2A (called when agent is deleted)
 */
export function removeAgentFromA2A(agentId: UUID): void {
  const agent = globalAgentMap.get(agentId);
  if (agent) {
    globalAgentMap.delete(agentId);
    console.log(`🗑️ Removed ${agent.runtime.character.name} from A2A (ID: ${agentId})`);
  }
}
