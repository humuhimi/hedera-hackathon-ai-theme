// Load environment variables FIRST before any other imports
// IMPORTANT: override=true makes .env values take precedence over shell env vars
import dotenv from 'dotenv';
dotenv.config({ override: true });

import express, { Request } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { IncomingMessage, ClientRequest, ServerResponse } from 'http';
import { app, httpServer, io } from './socket';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import negotiationRoutes from './routes/negotiation.routes.js';
import { verifyToken } from './services/jwt.service.js';
import { agentService } from './services/agent.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ELIZAOS_URL = process.env.ELIZAOS_URL;

// Middleware
// CORS: Allow frontend only
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// JSON body parser
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/agents', agentRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/negotiation', negotiationRoutes);

// A2A Protocol Proxy - Forward /agents/*/a2a/** requests to ElizaOS server
// Maps erc8004AgentId (on-chain) to elizaAgentId (ElizaOS runtime)
// IMPORTANT: Must be registered AFTER /agents routes to avoid conflicts
app.use('/agents/:agentId/a2a', async (req, res, next) => {
  const erc8004AgentId = parseInt(req.params.agentId, 10);

  if (isNaN(erc8004AgentId)) {
    res.status(400).json({ error: 'Invalid agent ID' });
    return;
  }

  try {
    // Look up elizaAgentId from database using erc8004AgentId
    const agent = await prisma.agent.findFirst({
      where: { erc8004AgentId: erc8004AgentId },
      select: { elizaAgentId: true }
    });

    if (!agent || !agent.elizaAgentId) {
      res.status(404).json({ error: 'Agent not found or not registered with ElizaOS' });
      return;
    }

    // Store elizaAgentId for proxy to use
    (req as any).elizaAgentId = agent.elizaAgentId;
    next();
  } catch (error) {
    console.error('❌ A2A Proxy DB Error:', error);
    res.status(500).json({ error: 'Failed to resolve agent' });
  }
}, createProxyMiddleware({
  target: ELIZAOS_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Replace erc8004AgentId with elizaAgentId in the path
    const expressReq = req as Request;
    const elizaAgentId = (expressReq as any).elizaAgentId;
    const erc8004AgentId = expressReq.params.agentId;

    // Rewrite: /agents/{erc8004AgentId}/a2a/... -> /agents/{elizaAgentId}/a2a/...
    const originalUrl = expressReq.originalUrl || path;
    const newPath = originalUrl.replace(`/agents/${erc8004AgentId}/`, `/agents/${elizaAgentId}/`);
    return newPath;
  },
  on: {
    proxyReq: (proxyReq: ClientRequest, req: IncomingMessage): void => {
      const targetUrl = new URL(ELIZAOS_URL!);
      proxyReq.setHeader('Host', targetUrl.host);
      const expressReq = req as Request;
      const elizaAgentId = (expressReq as any).elizaAgentId;
      const erc8004AgentId = expressReq.params.agentId;
      console.log(`🔄 Proxying A2A: erc8004#${erc8004AgentId} -> eliza#${elizaAgentId}`);
    },
    proxyRes: (proxyRes: IncomingMessage): void => {
      console.log(`✅ A2A Response: ${proxyRes.statusCode}`);
    },
    error: (err: Error, _req: IncomingMessage, res: ServerResponse): void => {
      console.error('❌ A2A Proxy Error:', err.message);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Proxy failed' }));
      }
    }
  }
} as Parameters<typeof createProxyMiddleware>[0]));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Frontend Socket.IO authentication middleware
io.use(async (socket, next) => {
  console.log('🔐 Socket.IO authentication attempt');
  console.log('Auth data:', socket.handshake.auth);

  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.error('❌ No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    console.log('🔑 Token received, verifying...');
    const decoded = verifyToken(token);
    console.log('✅ Token verified:', decoded);

    socket.data.userId = decoded.userId;
    socket.data.hederaAccountId = decoded.hederaAccountId;
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Authentication error:', errorMessage);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Frontend Socket.IO connection handlers
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.data.userId}`);

  // Join agent channel
  socket.on('agent:join', async ({ agentId }) => {
    try {
      // Verify user owns this agent
      const agent = await agentService.getAgent(agentId, socket.data.userId);

      if (!agent) {
        socket.emit('error', { message: 'Agent not found or access denied' });
        return;
      }

      if (!agent.channelId) {
        socket.emit('error', { message: 'Agent has no channel configured' });
        return;
      }

      // Join Socket.IO room for this channel
      socket.join(`channel:${agent.channelId}`);
      
      socket.emit('agent:joined', { agentId, channelId: agent.channelId });

      console.log(`📢 User ${socket.data.userId} joined channel ${agent.channelId} for agent ${agentId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error joining agent channel:', errorMessage);
      socket.emit('error', { message: 'Failed to join agent channel' });
    }
  });

  // Send message to agent
  socket.on('agent:sendMessage', async ({ agentId, message }) => {
    try {
      // Verify user owns this agent
      const agent = await agentService.getAgent(agentId, socket.data.userId);

      if (!agent || !agent.channelId) {
        socket.emit('error', { message: 'Agent not found or not configured' });
        return;
      }

      // Echo user message back to frontend
      socket.emit('user:message', {
        content: message,
        timestamp: new Date().toISOString(),
      });

      // Send message to ElizaOS via HTTP API (using agentService)
      console.log(`📤 Sending message to ElizaOS via HTTP API for agent ${agentId}:`, message);
      
      const response = await agentService.sendMessage({
        agentId,
        message,
        userId: socket.data.userId,
      });

      // Send agent response back to frontend
      console.log(`📤 Emitting 'agent:message' event to socket ${socket.id}`);
      console.log(`📦 Payload:`, { content: response.message.substring(0, 100), timestamp: response.timestamp, agentId });
      
      socket.emit('agent:message', {
        content: response.message,
        timestamp: response.timestamp,
        agentId,
      });

      console.log(`✅ Agent ${agentId} responded:`, response.message.substring(0, 50) + '...');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending message:', errorMessage);
      socket.emit('error', { message: 'Failed to send message' });
      // Remove "Thinking..." message on error
      socket.emit('agent:error', { error: 'Failed to get agent response' });
    }
  });

  // Leave agent channel
  socket.on('agent:leave', ({ channelId }) => {
    socket.leave(`channel:${channelId}`);
    console.log(`👋 User ${socket.data.userId} left channel ${channelId}`);
  });

  // Join buyRequest room to receive progress updates
  socket.on('buyRequest:join', ({ buyRequestId }) => {
    socket.join(`buyRequest:${buyRequestId}`);
    console.log(`📦 User ${socket.data.userId} joined buyRequest ${buyRequestId}`);
  });

  // Leave buyRequest room
  socket.on('buyRequest:leave', ({ buyRequestId }) => {
    socket.leave(`buyRequest:${buyRequestId}`);
    console.log(`👋 User ${socket.data.userId} left buyRequest ${buyRequestId}`);
  });

  // Join negotiation room to receive messages
  socket.on('negotiation:join', ({ roomId }) => {
    socket.join(`negotiation:${roomId}`);
    console.log(`🤝 User ${socket.data.userId} joined negotiation ${roomId}`);
  });

  // Leave negotiation room
  socket.on('negotiation:leave', ({ roomId }) => {
    socket.leave(`negotiation:${roomId}`);
    console.log(`👋 User ${socket.data.userId} left negotiation ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log(`👤 User disconnected: ${socket.data.userId}`);
  });
});

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO server ready`);
  console.log(`🤖 ElizaOS HTTP API: ${ELIZAOS_URL}`);

  // Wait for ElizaOS to be ready, then restore agents
  setTimeout(async () => {
    try {
      await agentService.restoreAgentsToElizaOS();
    } catch (error) {
      console.error('❌ Failed to restore agents:', error);
    }
  }, 5000); // Wait 5 seconds for ElizaOS to initialize
});