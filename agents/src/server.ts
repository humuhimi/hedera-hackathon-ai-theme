/**
 * Custom ElizaOS Server with A2A Protocol Support
 * Extends standard ElizaOS server to include A2A endpoints
 */

// Polyfill CustomEvent for Node.js environment
if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends Event {
    detail: any;
    constructor(event: string, params?: any) {
      super(event, params);
      this.detail = params?.detail;
    }
  } as any;
}

import { AgentServer } from '@elizaos/server';
import { sellerAgent, buyerAgent } from './index.js';
import { setupMultiAgentA2A } from './a2a/index.js';

async function startServer() {
  const server = new AgentServer();

  console.log('🚀 Starting ElizaOS server (REST API + Socket.IO + A2A)...');

  await server.start({
    port: parseInt(process.env.SERVER_PORT || '3333'),
    dataDir: process.env.DATA_DIR,
    agents: [sellerAgent, buyerAgent],
  });

  const agents = server.getAllAgents();

  console.log(`✅ Started ${agents.length} agents`);
  for (const agent of agents) {
    console.log(`   - ${agent.character.name} (ID: ${agent.agentId})`);
  }

  // Setup A2A Protocol endpoints with custom handlers
  console.log('🔗 Setting up A2A Protocol endpoints...');
  setupMultiAgentA2A(server.app, agents);

  console.log('✅ Server ready!');
  console.log(`📡 Server: http://localhost:${process.env.SERVER_PORT || '3333'}`);
  console.log(`💬 REST API + Socket.IO + A2A Protocol available`);

  // Show A2A endpoints for each agent
  console.log('\nA2A Endpoints:');
  for (const agent of agents) {
    const agentPath = `/agents/${agent.agentId}/a2a`;
    console.log(`\n  🤖 ${agent.character.name}`);
    console.log(`     Agent Card: GET ${agentPath}/.well-known/agent-card.json`);
    console.log(`     JSON-RPC: POST ${agentPath}/`);
  }
}

// Start server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
