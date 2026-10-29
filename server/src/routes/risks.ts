import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get risks
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const risks = await db.getRisks(projectId);
  return res.json(risks);
});

// Create risk
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, title, description, category, probability, impact, mitigation_plan, contingency_plan, status, owner_id, review_date } = req.body;
  if (!project_id || !title) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }
  const risk = await db.createRisk({
    project_id,
    title: title.trim(),
    description: description || '',
    category: category || 'technical',
    probability: Number(probability) || 1,
    impact: Number(impact) || 1,
    mitigation_plan: mitigation_plan || '',
    contingency_plan: contingency_plan || '',
    status: status || 'identified',
    owner_id: owner_id || null,
    review_date: review_date || null
  });
  return res.status(201).json(risk);
});

// Update risk
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const updated = await db.updateRisk(String(req.params.id), req.body);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Risk not found' });
  }
  return res.json(updated);
});

// Delete risk
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.deleteRisk(String(req.params.id));
  if (!success) {
    return res.status(404).json({ error: true, message: 'Risk not found' });
  }
  return res.json({ success: true });
});

export default router;
