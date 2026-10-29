import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get active timer for current user
router.get('/timer', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json(null);
  }
  const timer = await db.getActiveTimer(req.user.id);
  return res.json(timer);
});

// Start timer
router.post('/timer/start', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { project_id, work_item_id, description } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: true, message: 'project_id is required to start a timer' });
  }
  try {
    const timer = await db.startTimer(req.user.id, project_id, work_item_id || null, description || '');
    return res.status(201).json(timer);
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err.message });
  }
});

// Stop timer
router.post('/timer/stop', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  try {
    const result = await db.stopTimer(req.user.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err.message });
  }
});

// Get time entries with filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const userId = req.query.user_id as string;
  const workItemId = req.query.work_item_id as string;
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;

  const entries = await db.getTimeEntries(projectId, {
    userId,
    workItemId,
    startDate,
    endDate
  });
  return res.json(entries);
});

// Log manual time entry
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, work_item_id, date, duration_minutes, description } = req.body;
  if (!project_id || !duration_minutes) {
    return res.status(400).json({ error: true, message: 'project_id and duration_minutes are required' });
  }
  try {
    const entry = await db.createTimeEntry({
      project_id,
      work_item_id: work_item_id || null,
      user_id: req.user!.id,
      date: date || new Date().toISOString().split('T')[0],
      duration_minutes: Number(duration_minutes),
      description: description || ''
    });
    return res.status(201).json(entry);
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err.message });
  }
});

// Delete time entry
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteTimeEntry(String(req.params.id), req.user!.id);
    if (!success) {
      return res.status(404).json({ error: true, message: 'Time entry not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(403).json({ error: true, message: err.message });
  }
});

export default router;
