import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get retrospectives for project / sprint
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const projectId = req.query.project_id as string;
  const sprintId = req.query.sprint_id as string;

  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id is required' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, projectId);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const retros = await db.getRetrospectives(projectId, sprintId);
  return res.json(retros);
});

// Create retrospective for sprint
router.post('/', requireRole('WorkspaceAdmin', 'ScrumMaster', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const { project_id, sprint_id, title } = req.body;

  if (!project_id || !sprint_id || !title) {
    return res.status(400).json({ error: true, message: 'project_id, sprint_id, and title are required' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const retro = await db.createRetrospective({
    project_id,
    sprint_id,
    title: title.trim(),
    status: 'active'
  });

  return res.status(201).json(retro);
});

// Get single retrospective with items
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const retro = await db.getRetrospectiveById(String(req.params.id));
  if (!retro) {
    return res.status(404).json({ error: true, message: 'Retrospective not found' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, retro.project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const items = await db.getRetrospectiveItems(retro.id);
  return res.json({
    ...retro,
    items
  });
});

// Update retrospective status (e.g. mark completed)
router.put('/:id', requireRole('WorkspaceAdmin', 'ScrumMaster', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const updated = await db.updateRetrospective(String(req.params.id), req.body);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Retrospective not found' });
  }
  return res.json(updated);
});

// Add item to retrospective
router.post('/:id/items', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const { category, content } = req.body;
  const action_assignee_id = req.body.action_assignee_id || req.body.assignee_id;

  if (!category || !content || !content.trim()) {
    return res.status(400).json({ error: true, message: 'category and non-empty content are required' });
  }

  const retro = await db.getRetrospectiveById(String(req.params.id));
  if (!retro) {
    return res.status(404).json({ error: true, message: 'Retrospective not found' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, retro.project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const isActionItem = category === 'action_items' || category === 'action_item';
  const item = await db.createRetrospectiveItem({
    retrospective_id: retro.id,
    category: isActionItem ? 'action_items' : category,
    user_id: req.user.id,
    content: content.trim(),
    action_assignee_id: action_assignee_id || undefined,
    action_status: isActionItem ? 'open' : undefined
  });

  return res.status(201).json({
    ...item,
    assignee_id: item.action_assignee_id,
    category
  });
});

// Vote / unvote item
router.post('/items/:itemId/vote', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const item = await db.voteRetrospectiveItem(String(req.params.itemId), req.user.id);
  if (!item) {
    return res.status(404).json({ error: true, message: 'Retrospective item not found' });
  }
  return res.json({
    ...item,
    votes: item.voted_user_ids || [],
    vote_count: item.votes
  });
});

// Update retrospective item (status, assignee, content)
router.patch('/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const item = await db.updateRetrospectiveItem(String(req.params.itemId), req.body);
  if (!item) {
    return res.status(404).json({ error: true, message: 'Retrospective item not found' });
  }
  return res.json(item);
});

// Delete retrospective item
router.delete('/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const isAdmin = req.userRole === 'WorkspaceAdmin' || req.user.role === 'WorkspaceAdmin' || req.user.role === 'ScrumMaster';
  const deleted = await db.deleteRetrospectiveItem(String(req.params.itemId), req.user.id, isAdmin);
  if (!deleted) {
    return res.status(403).json({ error: true, message: 'Cannot delete item or item not found' });
  }
  return res.json({ success: true, message: 'Item deleted' });
});

// Convert action item directly into a real backlog WorkItem
router.post('/items/:itemId/convert-to-work-item', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const items = await (db as any).state.retrospective_items;
  const item = items.find((i: any) => i.id === String(req.params.itemId));
  if (!item) {
    return res.status(404).json({ error: true, message: 'Retrospective item not found' });
  }

  if (item.converted_work_item_id) {
    return res.status(400).json({ error: 'Retrospective item is already converted to a work item', message: 'Retrospective item is already converted to a work item' });
  }

  const retro = await db.getRetrospectiveById(item.retrospective_id);
  if (!retro) {
    return res.status(404).json({ error: true, message: 'Retrospective not found' });
  }

  const { type = 'task', priority = 'medium' } = req.body;

  // Create real work item
  const workItem = await db.createWorkItem({
    project_id: retro.project_id,
    title: item.content.split('\n')[0].substring(0, 80),
    description: `Created from Sprint Retrospective "${retro.title}":\n\n${item.content}`,
    type,
    priority,
    status: 'todo',
    assignee_id: item.action_assignee_id || req.user.id,
    reporter_id: req.user.id
  });

  // Link converted work item to retrospective item
  item.converted_work_item_id = workItem.id;
  item.action_status = 'in_progress';
  await (db as any).saveToFile();

  return res.status(201).json({
    success: true,
    message: 'Action item converted to backlog work item',
    workItem,
    work_item: workItem,
    retrospectiveItem: item,
    retrospective_item: item
  });
});

export default router;
