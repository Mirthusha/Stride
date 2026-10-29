import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get comments for a work item
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const workItemId = req.query.work_item_id as string;
  if (!workItemId) {
    return res.status(400).json({ error: true, message: 'work_item_id query param is required' });
  }
  const comments = await db.getComments(workItemId);
  return res.json(comments);
});

// Add comment to a work item
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { work_item_id, text } = req.body;
  if (!work_item_id || !text || !text.trim()) {
    return res.status(400).json({ error: true, message: 'work_item_id and non-empty text are required' });
  }
  const comment = await db.addComment(work_item_id, req.user!.id, text);
  return res.status(201).json(comment);
});

// Delete comment
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteComment(String(req.params.id), req.user!.id);
    if (!success) {
      return res.status(404).json({ error: true, message: 'Comment not found' });
    }
    return res.json({ success: true, message: 'Comment deleted' });
  } catch (err: any) {
    return res.status(403).json({ error: true, message: err.message || 'Forbidden' });
  }
});

export default router;
