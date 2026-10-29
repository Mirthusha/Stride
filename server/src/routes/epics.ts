import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get epics for a project
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const epics = await db.getEpics(projectId);
  return res.json(epics);
});

// Create epic
router.post('/', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, title, description, start_date, target_date, owner_id } = req.body;
  if (!project_id || !title || !title.trim()) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }

  const epic = await db.createEpic({
    project_id,
    title: title.trim(),
    description: description || '',
    status: 'todo',
    owner_id: owner_id || req.user!.id,
    start_date,
    target_date
  });

  return res.status(201).json(epic);
});

// Get single epic
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const epic = await db.getEpicById(String(req.params.id));
  if (!epic) {
    return res.status(404).json({ error: true, message: 'Epic not found' });
  }
  return res.json(epic);
});

// Update epic
router.put('/:id', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, status, start_date, target_date, owner_id } = req.body;
  const updated = await db.updateEpic(String(req.params.id), {
    ...(title && { title: title.trim() }),
    ...(description !== undefined && { description }),
    ...(status && { status }),
    ...(start_date !== undefined && { start_date }),
    ...(target_date !== undefined && { target_date }),
    ...(owner_id !== undefined && { owner_id })
  });

  if (!updated) {
    return res.status(404).json({ error: true, message: 'Epic not found' });
  }
  return res.json(updated);
});

// Delete epic
router.delete('/:id', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.deleteEpic(String(req.params.id));
  if (!success) {
    return res.status(404).json({ error: true, message: 'Epic not found' });
  }
  return res.json({ success: true, message: 'Epic deleted and associated items unlinked' });
});

export default router;
