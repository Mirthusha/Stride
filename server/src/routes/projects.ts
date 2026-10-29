import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get projects for workspace
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const workspaceId = req.query.workspace_id as string;
  if (workspaceId) {
    const isAuth = await db.isUserAuthorizedForWorkspace(req.user.id, workspaceId);
    if (!isAuth) {
      return res.status(403).json({ error: true, message: 'Access denied to this workspace' });
    }
    const projects = await db.getProjects(workspaceId);
    return res.json(projects);
  }
  const userWorkspaces = await db.getWorkspaces(req.user.id);
  const wsIds = userWorkspaces.map((w) => w.id);
  const allProjects = await Promise.all(wsIds.map((wsId) => db.getProjects(wsId)));
  return res.json(allProjects.flat());
});

// Create project
router.post('/', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { workspace_id, name, description, project_key, start_date, target_date } = req.body;

  if (!workspace_id || !name || !project_key) {
    return res.status(400).json({
      error: true,
      message: 'workspace_id, name, and project_key are required'
    });
  }

  const cleanKey = project_key.trim().toUpperCase().slice(0, 10);
  const today = new Date().toISOString().split('T')[0];
  const defaultTarget = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const project = await db.createProject({
    workspace_id,
    name: name.trim(),
    description: description || '',
    project_key: cleanKey,
    owner_id: req.user!.id,
    start_date: start_date || today,
    target_date: target_date || defaultTarget,
    status: 'active'
  });

  return res.status(201).json(project);
});

// Get single project
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const project = await db.getProjectById(String(req.params.id));
  if (!project) {
    return res.status(404).json({ error: true, message: 'Project not found' });
  }
  return res.json(project);
});

// Update project
router.put('/:id', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, status, target_date, start_date } = req.body;
  const updated = await db.updateProject(String(req.params.id), {
    ...(name && { name: name.trim() }),
    ...(description !== undefined && { description }),
    ...(status && { status }),
    ...(start_date && { start_date }),
    ...(target_date && { target_date })
  });

  if (!updated) {
    return res.status(404).json({ error: true, message: 'Project not found' });
  }
  return res.json(updated);
});

// Get project members
router.get('/:id/members', async (req: AuthenticatedRequest, res: Response) => {
  const members = await db.getProjectMembers(String(req.params.id));
  return res.json(members);
});

export default router;
