import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import { WorkItemStatus, WorkItemPriority, WorkItemType } from '../types/index.js';

const router = Router();

// Get work items with filtering
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }

  if (req.user) {
    const isAuth = await db.isUserAuthorizedForProject(req.user.id, projectId);
    if (!isAuth) {
      return res.status(403).json({ error: true, message: 'Access denied to this project' });
    }
  } else {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }

  const sprint_id = req.query.sprint_id !== undefined ? (req.query.sprint_id === 'null' ? null : req.query.sprint_id as string) : undefined;
  const backlog_only = req.query.backlog_only === 'true';
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  const type = req.query.type as string;
  const assignee_id = req.query.assignee_id as string;
  const search = req.query.search as string;

  const items = await db.getWorkItems(projectId, {
    sprint_id,
    backlog_only,
    status,
    priority,
    type,
    assignee_id,
    search
  });

  return res.json(items);
});

// Create work item
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const {
    project_id,
    epic_id,
    parent_id,
    title,
    description,
    type,
    status,
    priority,
    assignee_id,
    story_points,
    start_date,
    due_date,
    labels,
    sprint_id
  } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }

  if (!project_id || !title || !title.trim()) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const validTypes: WorkItemType[] = ['task', 'story', 'bug'];
  const validStatus: WorkItemStatus[] = ['todo', 'in_progress', 'qa', 'done'];
  const validPriority: WorkItemPriority[] = ['low', 'medium', 'high', 'critical'];

  const resolvedType = validTypes.includes(type) ? type : 'task';
  const resolvedStatus = validStatus.includes(status) ? status : 'todo';
  const resolvedPriority = validPriority.includes(priority) ? priority : 'medium';

  const newItem = await db.createWorkItem({
    project_id,
    epic_id: epic_id || null,
    parent_id: parent_id || null,
    title: title.trim(),
    description: description || '',
    type: resolvedType,
    status: resolvedStatus,
    priority: resolvedPriority,
    assignee_id: assignee_id || null,
    reporter_id: req.user!.id,
    story_points: story_points !== undefined && story_points !== null ? Number(story_points) : null,
    start_date: start_date || null,
    due_date: due_date || null,
    sort_order: 0,
    labels: Array.isArray(labels) ? labels : [],
    sprint_id: sprint_id || null
  });

  return res.status(201).json(newItem);
});

// Get single work item
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const item = await db.getWorkItemById(String(req.params.id));
  if (!item) {
    return res.status(404).json({ error: true, message: 'Work item not found' });
  }
  return res.json(item);
});

// Update work item
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    type,
    status,
    priority,
    assignee_id,
    story_points,
    start_date,
    due_date,
    labels,
    sprint_id,
    epic_id,
    parent_id,
    sort_order
  } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (type !== undefined) updates.type = type;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assignee_id !== undefined) updates.assignee_id = assignee_id;
  if (story_points !== undefined) updates.story_points = story_points === null ? null : Number(story_points);
  if (start_date !== undefined) updates.start_date = start_date;
  if (due_date !== undefined) updates.due_date = due_date;
  if (labels !== undefined) updates.labels = Array.isArray(labels) ? labels : [];
  if (sprint_id !== undefined) updates.sprint_id = sprint_id;
  if (epic_id !== undefined) updates.epic_id = epic_id;
  if (parent_id !== undefined) updates.parent_id = parent_id;
  if (sort_order !== undefined) updates.sort_order = Number(sort_order);

  const updated = await db.updateWorkItem(String(req.params.id), updates, req.user?.id);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Work item not found' });
  }
  return res.json(updated);
});

// Quick status change for drag and drop
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  const { status, sort_order } = req.body;
  if (!status) {
    return res.status(400).json({ error: true, message: 'status is required' });
  }

  const updated = await db.updateWorkItem(
    String(req.params.id),
    {
      status,
      ...(sort_order !== undefined && { sort_order: Number(sort_order) })
    },
    req.user?.id
  );

  if (!updated) {
    return res.status(404).json({ error: true, message: 'Work item not found' });
  }
  return res.json(updated);
});

// Batch reorder endpoint for Kanban and Backlog drag-and-drop
router.post('/reorder', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, items } = req.body;
  if (!project_id || !Array.isArray(items)) {
    return res.status(400).json({ error: true, message: 'project_id and items array are required' });
  }

  await db.reorderWorkItems(project_id, items);
  return res.json({ success: true, message: 'Order and statuses updated successfully' });
});

// Bulk update work items
router.post('/bulk-update', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { project_id, item_ids, updates } = req.body;
  if (!project_id || !Array.isArray(item_ids) || !updates) {
    return res.status(400).json({ error: true, message: 'project_id, item_ids array, and updates are required' });
  }
  const result = await db.bulkUpdateWorkItems(project_id, item_ids, updates, req.user.id);
  return res.json(result);
});

// Checklist items
router.post('/:id/checklists', async (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: true, message: 'text is required' });
  }
  const item = await db.addChecklistItem(String(req.params.id), text);
  return res.status(201).json(item);
});

router.patch('/checklists/:chkId/toggle', async (req: AuthenticatedRequest, res: Response) => {
  const updated = await db.toggleChecklistItem(String(req.params.chkId));
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Checklist item not found' });
  }
  return res.json(updated);
});

router.delete('/checklists/:chkId', async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.deleteChecklistItem(String(req.params.chkId));
  return res.json({ success });
});

// Dependencies
router.post('/:id/dependencies', async (req: AuthenticatedRequest, res: Response) => {
  const { depends_on_id, type } = req.body;
  if (!depends_on_id || !type) {
    return res.status(400).json({ error: true, message: 'depends_on_id and type are required' });
  }
  try {
    const dep = await db.addDependency(String(req.params.id), depends_on_id, type);
    return res.status(201).json(dep);
  } catch (err: any) {
    return res.status(400).json({ error: true, message: err.message });
  }
});

router.delete('/dependencies/:depId', async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.deleteDependency(String(req.params.depId));
  return res.json({ success });
});

// Watcher toggle
router.post('/:id/watch', async (req: AuthenticatedRequest, res: Response) => {
  const result = await db.toggleWatcher(String(req.params.id), req.user!.id);
  return res.json(result);
});

// Delete work item
router.delete('/:id', requireRole('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'), async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.deleteWorkItem(String(req.params.id), req.user?.id);
  if (!success) {
    return res.status(404).json({ error: true, message: 'Work item not found' });
  }
  return res.json({ success: true, message: 'Work item deleted successfully' });
});

export default router;
