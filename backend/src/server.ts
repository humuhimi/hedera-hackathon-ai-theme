import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import { verifyToken } from './services/jwt.service.js';
import { agentService } from './services/agent.service.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ELIZAOS_URL = process.env.ELIZAOS_URL || 'http://localhost:3333';

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/agents', agentRoutes);

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
  } catch (error) {
    console.error('❌ Authentication error:', error);
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
    } catch (error) {
      console.error('Error joining agent channel:', error);
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
    } catch (error) {
      console.error('Error sending message:', error);
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
