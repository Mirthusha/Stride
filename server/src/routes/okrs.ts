import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get objectives with key results and calculated progress
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const objectives = await db.getObjectives(projectId);
  return res.json(objectives);
});

// Create objective
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { project_id, title, description, category, status, start_date, due_date, target_date, owner_id } = req.body;
  if (!project_id || !title) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }
  const objective = await db.createObjective({
    project_id,
    title: title.trim(),
    description: description || '',
    category: category || 'product',
    status: status || 'on_track',
    start_date: start_date || new Date().toISOString().split('T')[0],
    due_date: due_date || target_date || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    owner_id: owner_id || req.user!.id
  });
  return res.status(201).json(objective);
});

// Add key result to objective
router.post('/:id/key-results', async (req: AuthenticatedRequest, res: Response) => {
  const { title, target_value, current_value, unit } = req.body;
  const objectiveId = String(req.params.id);
  if (!title || target_value === undefined) {
    return res.status(400).json({ error: true, message: 'title and target_value are required' });
  }
  const kr = await db.addKeyResult(objectiveId, {
    title: title.trim(),
    target_value: Number(target_value),
    current_value: Number(current_value) || 0,
    unit: unit || '%'
  });
  return res.status(201).json(kr);
});

// Update key result progress
router.patch('/key-results/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { current_value } = req.body;
  if (current_value === undefined) {
    return res.status(400).json({ error: true, message: 'current_value is required' });
  }
  const updated = await db.updateKeyResult(String(req.params.id), Number(current_value));
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Key result not found' });
  }
  return res.json(updated);
});

export default router;
