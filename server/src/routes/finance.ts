import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get project budget
router.get('/budget', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const budget = await db.getProjectBudget(projectId);
  return res.json(budget);
});

// Update project budget
router.put('/budget', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, total_budget, currency, hourly_rate } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: true, message: 'project_id is required' });
  }
  const updates: any = {};
  if (total_budget !== undefined) updates.total_budget = Number(total_budget);
  if (currency !== undefined) updates.currency = currency;
  if (hourly_rate !== undefined) updates.hourly_rate = Number(hourly_rate);

  const updated = await db.updateProjectBudget(project_id, updates);
  return res.json(updated);
});

// Get expenses for a project
router.get('/expenses', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const expenses = await db.getExpenses(projectId);
  return res.json(expenses);
});

// Submit an expense
router.post('/expenses', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, amount, currency, category, description, date, receipt_url } = req.body;
  if (!project_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: true, message: 'project_id and positive amount are required' });
  }
  try {
    const expense = await db.createExpense({
      project_id,
      amount: Number(amount),
      currency: currency || 'USD',
      category: category || 'Other',
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
      submitter_id: req.user!.id,
      receipt_url: receipt_url || null
    });
    return res.status(201).json(expense);
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err.message });
  }
});

// Update expense status (approve / reject)
router.patch('/expenses/:id/status', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (status !== 'approved' && status !== 'rejected') {
    return res.status(400).json({ error: true, message: 'status must be "approved" or "rejected"' });
  }
  const updated = await db.updateExpenseStatus(String(req.params.id), status, req.user!.id);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Expense not found' });
  }
  return res.json(updated);
});

// Get financial summary
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const summary = await db.getFinancialSummary(projectId);
  return res.json(summary);
});

export default router;
