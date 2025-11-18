import express from 'express';
import { agentService } from '../services/agent.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Create a new agent
 * POST /agents
 * Body: { type: 'give' | 'want', name: string, description?: string }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, name, description } = req.body;
    const userId = req.user!.userId;

    if (!type || !name) {
      return res.status(400).json({ error: 'type and name are required' });
    }

    if (type !== 'give' && type !== 'want') {
      return res.status(400).json({ error: 'type must be "give" or "want"' });
    }

    const agent = await agentService.createAgent({
      userId,
      type,
      name,
      description,
    });

    res.status(201).json(agent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

/**
 * Get all agents for the current user
 * GET /agents
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agents = await agentService.getUserAgents(userId);
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * Get a specific agent
 * GET /agents/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agentId = req.params.id;

    const agent = await agentService.getAgent(agentId, userId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

/**
 * Send message to an agent
 * POST /agents/:id/message
 * Body: { message: string }
 */
router.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agentId = req.params.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const response = await agentService.sendMessage({
      agentId,
      message,
      userId,
    });

    res.json(response);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send message' });
  }
});

/**
 * Update agent status
 * PATCH /agents/:id/status
 * Body: { status: 'active' | 'paused' }
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agentId = req.params.id;
    const { status } = req.body;

    if (!status || (status !== 'active' && status !== 'paused')) {
      return res.status(400).json({ error: 'status must be "active" or "paused"' });
    }

    const agent = await agentService.updateAgentStatus(agentId, userId, status);
    res.json(agent);
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update agent status' });
  }
});

/**
 * Delete an agent
 * DELETE /agents/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agentId = req.params.id;

    await agentService.deleteAgent(agentId, userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete agent' });
  }
});

/**
 * Get message history for an agent
 * GET /agents/:id/messages
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const agentId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await agentService.getMessageHistory(agentId, userId, limit);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching message history:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch message history'
    });
  }
});

export default router;
