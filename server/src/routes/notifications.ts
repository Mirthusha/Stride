import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get current user's notifications
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json([]);
  }
  const notifications = await db.getNotifications(req.user.id);
  return res.json(notifications);
});

// Mark single notification as read
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const success = await db.markNotificationAsRead(String(req.params.id), req.user.id);
  if (!success) {
    return res.status(404).json({ error: true, message: 'Notification not found' });
  }
  return res.json({ success: true });
});

// Mark all notifications as read
router.post('/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const count = await db.markAllNotificationsAsRead(req.user.id);
  return res.json({ success: true, count });
});

export default router;
