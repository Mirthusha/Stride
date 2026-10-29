import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get automation rules
router.get('/rules', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const rules = await db.getAutomationRules(projectId);
  return res.json(rules);
});

// Create automation rule
router.post('/rules', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, name, description, trigger, condition, action } = req.body;
  if (!project_id || !name || !trigger || !action) {
    return res.status(400).json({ error: true, message: 'project_id, name, trigger, and action are required' });
  }
  const rule = await db.createAutomationRule({
    project_id,
    name: name.trim(),
    description: description || '',
    trigger,
    condition: condition || undefined,
    action,
    enabled: true
  });
  return res.status(201).json(rule);
});

// Toggle rule enabled state
router.patch('/rules/:id/toggle', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const rule = await db.toggleAutomationRule(String(req.params.id));
  if (!rule) {
    return res.status(404).json({ error: true, message: 'Automation rule not found' });
  }
  return res.json(rule);
});

export default router;
