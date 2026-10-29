import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get sprints for project
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const sprints = await db.getSprints(projectId);
  return res.json(sprints);
});

// Create sprint
router.post('/', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { project_id, name, goal, start_date, end_date, capacity_points, status } = req.body;
    if (!project_id || !name || !start_date || !end_date) {
      return res.status(400).json({
        error: true,
        message: 'project_id, name, start_date, and end_date are required'
      });
    }

    const newSprint = await db.createSprint({
      project_id,
      name: name.trim(),
      goal: goal || '',
      start_date,
      end_date,
      capacity_points: capacity_points ? Number(capacity_points) : null,
      status: status || 'planning'
    });

    return res.status(201).json(newSprint);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

// Get single sprint
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const sprint = await db.getSprintById(String(req.params.id));
  if (!sprint) {
    return res.status(404).json({ error: true, message: 'Sprint not found' });
  }
  return res.json(sprint);
});

// Update sprint
router.put('/:id', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, goal, start_date, end_date, capacity_points, status } = req.body;
    const updated = await db.updateSprint(String(req.params.id), {
      ...(name && { name: name.trim() }),
      ...(goal !== undefined && { goal }),
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
      ...(capacity_points !== undefined && { capacity_points: capacity_points ? Number(capacity_points) : null }),
      ...(status && { status })
    });

    if (!updated) {
      return res.status(404).json({ error: true, message: 'Sprint not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

// Activate sprint
router.post('/:id/activate', requireRole('WorkspaceAdmin', 'ScrumMaster', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateSprint(String(req.params.id), { status: 'active' });
    if (!updated) {
      return res.status(404).json({ error: true, message: 'Sprint not found' });
    }
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

// Complete sprint with rollover handling
router.post('/:id/complete', requireRole('WorkspaceAdmin', 'ScrumMaster', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rolloverAction, targetSprintId } = req.body;
    const action = rolloverAction === 'next_sprint' ? 'next_sprint' : 'backlog';

    const result = await db.completeSprint(String(req.params.id), action, targetSprintId);
    return res.json({
      success: true,
      message: `Sprint completed. ${result.rolledOverCount} incomplete item(s) moved to ${action === 'next_sprint' ? 'next sprint' : 'backlog'}.`,
      ...result
    });
  } catch (error: any) {
    return res.status(400).json({ error: true, message: error.message });
  }
});

export default router;
