// Load environment variables FIRST before any other imports
import 'dotenv/config';

import express, { Request } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { IncomingMessage, ClientRequest, ServerResponse } from 'http';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import { verifyToken } from './services/jwt.service.js';
import { agentService } from './services/agent.service.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ELIZAOS_URL = process.env.ELIZAOS_URL || 'http://localhost:3333';

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

// A2A Protocol Proxy - Forward /agents/*/a2a/** requests to ElizaOS server
// IMPORTANT: Must be registered AFTER /agents routes to avoid conflicts
app.use('/agents/:agentId/a2a', createProxyMiddleware({
  target: ELIZAOS_URL,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Reconstruct the full path including the agentId
    const expressReq = req as Request;
    return expressReq.originalUrl || path;
  },
  on: {
    proxyReq: (proxyReq: ClientRequest, req: IncomingMessage): void => {
      const targetUrl = new URL(ELIZAOS_URL);
      proxyReq.setHeader('Host', targetUrl.host);
      const expressReq = req as Request;
      console.log(`🔄 Proxying A2A: ${req.method} ${expressReq.originalUrl} -> ${ELIZAOS_URL}${expressReq.originalUrl}`);
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



// Socket.IO Server (for frontend connections)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
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

  socket.on('disconnect', () => {
    console.log(`👤 User disconnected: ${socket.data.userId}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO server ready`);
  console.log(`🤖 ElizaOS HTTP API: ${ELIZAOS_URL}`);
});