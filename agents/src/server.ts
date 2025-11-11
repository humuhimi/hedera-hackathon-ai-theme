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
import type { UUID } from '@elizaos/core';
import { sellerCharacter, buyerCharacter } from './index.js';
import { initializeA2AMiddleware, addAgentToA2A, removeAgentFromA2A } from './a2a/index.js';

async function startServer() {
  const server = new AgentServer();

  console.log('🚀 Starting ElizaOS server (REST API + Socket.IO + A2A)...');

  // Start with NO agents - agents will be created dynamically via API
  await server.start({
    port: parseInt(process.env.SERVER_PORT || '3333'),
    dataDir: process.env.DATA_DIR,
    agents: [],
  });

  // Initialize A2A middleware (routes registered, but no agents yet)
  initializeA2AMiddleware(server.app);

  console.log('✅ Server ready (0 agents - will be created via API)');
  console.log(`📡 Server: http://localhost:${process.env.SERVER_PORT || '3333'}`);
  console.log(`💬 REST API + Socket.IO + A2A Protocol available`);

  // Dynamic agent creation API
  server.app.post('/api/internal/agents/create', async (req, res) => {
    try {
      const { type } = req.body;

      if (!type || (type !== 'give' && type !== 'want')) {
        return res.status(400).json({ error: 'Invalid type. Must be "give" or "want"' });
      }

      // Select character based on type
      const character = type === 'give' ? sellerCharacter : buyerCharacter;

      console.log(`🔨 Creating new ${character.name} agent...`);

      // Start agent in ElizaOS
      const [runtime] = await server.startAgents([{
        character,
        plugins: character.plugins,
      }]);

      // Add to A2A
      addAgentToA2A(runtime);

      console.log(`✅ Created agent: ${runtime.character.name} (ID: ${runtime.agentId})`);

      res.json({
        agentId: runtime.agentId,
        name: runtime.character.name,
        type,
      });
    } catch (error) {
      console.error('❌ Failed to create agent:', error);
      res.status(500).json({
        error: 'Failed to create agent',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Agent deletion API
  server.app.delete('/api/internal/agents/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;

      console.log(`🗑️ Deleting agent ${agentId}...`);

      await server.stopAgents([agentId as UUID]);
      removeAgentFromA2A(agentId as UUID);

      console.log(`✅ Deleted agent ${agentId}`);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to delete agent:', error);
      res.status(500).json({
        error: 'Failed to delete agent',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log('\n📝 Internal APIs:');
  console.log('   POST /api/internal/agents/create - Create new agent');
  console.log('   DELETE /api/internal/agents/:agentId - Delete agent');
}

// Start server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
