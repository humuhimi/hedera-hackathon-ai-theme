import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { getUserActivity } from '../services/user.service';

const router = Router();

/**
 * GET /api/user/activity
 * Get user's listings and buy requests with negotiation status
 */
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const activity = await getUserActivity(userId);

    res.json(activity);
  } catch (error: any) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      error: 'Failed to fetch user activity',
      message: error.message
    });
  }
});

export default router;
