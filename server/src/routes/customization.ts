import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// ==========================================
// WORKFLOW STATUSES & WIP LIMITS
// ==========================================
router.get('/statuses', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const statuses = await db.getWorkflowStatuses(projectId);
  return res.json(statuses);
});

router.post('/statuses', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, name, category, color, wip_limit, sort_order, is_done_state } = req.body;
  if (!project_id || !name || !category) {
    return res.status(400).json({ error: true, message: 'project_id, name, and category are required' });
  }
  const status = await db.createWorkflowStatus({
    project_id,
    name: name.trim(),
    category,
    color: color || '#22c55e',
    wip_limit: wip_limit !== undefined && wip_limit !== null ? Number(wip_limit) : null,
    sort_order: sort_order !== undefined ? Number(sort_order) : 0,
    is_done_state: Boolean(is_done_state)
  });
  return res.status(201).json(status);
});

router.patch('/statuses/:id', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const updated = await db.updateWorkflowStatus(String(req.params.id), req.body);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Status not found' });
  }
  return res.json(updated);
});

// ==========================================
// SAVED VIEWS
// ==========================================
router.get('/views', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const views = await db.getSavedViews(projectId, req.user!.id);
  return res.json(views);
});

router.post('/views', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, name, is_shared, grouping, filters } = req.body;
  if (!project_id || !name) {
    return res.status(400).json({ error: true, message: 'project_id and name are required' });
  }
  const view = await db.createSavedView({
    project_id,
    name: name.trim(),
    is_shared: Boolean(is_shared),
    grouping: grouping || 'none',
    filters: filters || {},
    user_id: req.user!.id
  });
  return res.status(201).json(view);
});

router.delete('/views/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteSavedView(String(req.params.id), req.user!.id);
    if (!success) {
      return res.status(404).json({ error: true, message: 'Saved view not found' });
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(403).json({ error: true, message: err.message });
  }
});

// ==========================================
// CUSTOM FIELDS
// ==========================================
router.get('/fields', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const fields = await db.getCustomFields(projectId);
  return res.json(fields);
});

router.post('/fields', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, name, field_type, options, required } = req.body;
  if (!project_id || !name || !field_type) {
    return res.status(400).json({ error: true, message: 'project_id, name, and field_type are required' });
  }
  const field = await db.createCustomField({
    project_id,
    name: name.trim(),
    field_type,
    options: Array.isArray(options) ? options : [],
    required: Boolean(required)
  });
  return res.status(201).json(field);
});

// ==========================================
// WORK ITEM TEMPLATES
// ==========================================
router.get('/templates', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const templates = await db.getTemplates(projectId);
  return res.json(templates);
});

router.post('/templates', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, name, type, default_title, default_description, default_labels, default_checklist } = req.body;
  if (!project_id || !name || !type) {
    return res.status(400).json({ error: true, message: 'project_id, name, and type are required' });
  }
  const tmpl = await db.createTemplate({
    project_id,
    name: name.trim(),
    type,
    default_title: default_title || '',
    default_description: default_description || '',
    default_labels: Array.isArray(default_labels) ? default_labels : [],
    default_checklist: Array.isArray(default_checklist) ? default_checklist : []
  });
  return res.status(201).json(tmpl);
});

// ==========================================
// CSV EXPORT & IMPORT
// ==========================================

// Safe escape to prevent CSV injection (=, +, -, @)
function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Export work items to CSV
router.get('/export/work-items', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const items = await db.getWorkItems(projectId);

  const headers = ['Key', 'Title', 'Type', 'Status', 'Priority', 'Story Points', 'Assignee', 'Reporter', 'Created At'];
  const rows = items.map((i) => [
    sanitizeCsvValue(i.item_key),
    sanitizeCsvValue(i.title),
    sanitizeCsvValue(i.type),
    sanitizeCsvValue(i.status),
    sanitizeCsvValue(i.priority),
    sanitizeCsvValue(i.story_points),
    sanitizeCsvValue(i.assignee?.display_name || ''),
    sanitizeCsvValue(i.reporter?.display_name || ''),
    sanitizeCsvValue(i.created_at)
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=stride-work-items-${projectId}.csv`);
  return res.send(csv);
});

// Import work items from CSV records
router.post('/import/work-items', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, rows, preview } = req.body;
  if (!project_id || !Array.isArray(rows)) {
    return res.status(400).json({ error: true, message: 'project_id and rows array are required' });
  }

  const validTypes = ['task', 'story', 'bug'];
  const validStatuses = ['todo', 'in_progress', 'qa', 'done'];
  const validPriorities = ['low', 'medium', 'high', 'critical'];

  const results: { valid: any[]; errors: { row: number; reason: string }[] } = {
    valid: [],
    errors: []
  };

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;
    const title = row.title || row.Title;
    if (!title || !String(title).trim()) {
      results.errors.push({ row: rowNum, reason: 'Title is required and cannot be empty' });
      return;
    }

    const rawType = (row.type || row.Type || 'task').toLowerCase();
    const rawStatus = (row.status || row.Status || 'todo').toLowerCase();
    const rawPriority = (row.priority || row.Priority || 'medium').toLowerCase();
    const points = row.story_points || row['Story Points'] || null;

    results.valid.push({
      title: String(title).trim(),
      type: validTypes.includes(rawType) ? rawType : 'task',
      status: validStatuses.includes(rawStatus) ? rawStatus : 'todo',
      priority: validPriorities.includes(rawPriority) ? rawPriority : 'medium',
      story_points: points ? Number(points) : null,
      description: row.description || row.Description || 'Imported via CSV'
    });
  });

  if (preview) {
    return res.json({
      preview: true,
      total_rows: rows.length,
      valid_count: results.valid.length,
      error_count: results.errors.length,
      errors: results.errors,
      sample_valid: results.valid.slice(0, 5)
    });
  }

  // Commit valid rows to DB
  const createdItems = [];
  for (const item of results.valid) {
    const created = await db.createWorkItem({
      project_id,
      epic_id: null,
      parent_id: null,
      title: item.title,
      description: item.description,
      type: item.type,
      status: item.status,
      priority: item.priority,
      assignee_id: null,
      reporter_id: req.user!.id,
      story_points: item.story_points,
      start_date: null,
      due_date: null,
      sort_order: 0,
      labels: ['csv-import'],
      sprint_id: null
    });
    createdItems.push(created);
  }

  return res.json({
    success: true,
    imported_count: createdItems.length,
    errors: results.errors
  });
});

export default router;
