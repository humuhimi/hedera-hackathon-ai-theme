import { Router } from 'express';
import {
  getNegotiationRoom,
  getRoomsForAgent,
  getMessages,
  sendMessage,
} from '../services/negotiation.service';

const router = Router();

/**
 * GET /api/negotiation/rooms/:roomId
 * Get negotiation room details
 */
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await getNegotiationRoom(req.params.roomId);
    res.json(room);
  } catch (error: any) {
    console.error('Error getting negotiation room:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * GET /api/negotiation/agent/:agentId/rooms
 * Get all rooms for a specific agent
 */
router.get('/agent/:agentId/rooms', async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId);
    if (isNaN(agentId)) {
      res.status(400).json({ error: 'Invalid agent ID' });
      return;
    }

    const rooms = await getRoomsForAgent(agentId);
    res.json({ rooms });
  } catch (error: any) {
    console.error('Error getting agent rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/negotiation/rooms/:roomId/messages
 * Get messages for a room
 */
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await getMessages(req.params.roomId, limit, offset);
    res.json({ messages });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/negotiation/rooms/:roomId/messages
 * Send a message in a room
 */
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { senderAgentId, content, messageType, metadata } = req.body;

    if (!senderAgentId || !content) {
      res.status(400).json({ error: 'senderAgentId and content are required' });
      return;
    }

    const message = await sendMessage({
      roomId: req.params.roomId,
      senderAgentId: parseInt(senderAgentId),
      content,
      messageType,
      metadata,
    });

    res.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
