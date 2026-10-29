import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get workspaces authorized for current user
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const workspaces = await db.getWorkspaces(req.user?.id);
  return res.json(workspaces);
});

// Create workspace - any authenticated user can create their workspace
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: true, message: 'Workspace name is required' });
  }

  const workspace = await db.createWorkspace({
    name: name.trim(),
    description: description || '',
    owner_id: req.user.id
  });

  return res.status(201).json(workspace);
});

// Get single workspace
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const workspace = await db.getWorkspaceById(String(req.params.id));
  if (!workspace) {
    return res.status(404).json({ error: true, message: 'Workspace not found' });
  }
  return res.json(workspace);
});

// Update workspace
router.put('/:id', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  const updated = await db.updateWorkspace(String(req.params.id), {
    ...(name && { name: name.trim() }),
    ...(description !== undefined && { description })
  });
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Workspace not found' });
  }
  return res.json(updated);
});

// Get workspace members
router.get('/:id/members', async (req: AuthenticatedRequest, res: Response) => {
  const members = await db.getWorkspaceMembers(String(req.params.id));
  return res.json(members);
});

// Add member to workspace
router.post('/:id/members', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: true, message: 'userId and role are required' });
  }
  const member = await db.addWorkspaceMember(String(req.params.id), userId, role);
  return res.status(201).json(member);
});

// Update member role
router.put('/:id/members/:userId', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: true, message: 'Role is required' });
  }
  const member = await db.updateWorkspaceMemberRole(String(req.params.id), String(req.params.userId), role);
  if (!member) {
    return res.status(404).json({ error: true, message: 'Member not found in workspace' });
  }
  return res.json(member);
});

// Remove member
router.delete('/:id/members/:userId', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const success = await db.removeWorkspaceMember(String(req.params.id), String(req.params.userId));
  if (!success) {
    return res.status(404).json({ error: true, message: 'Member not found' });
  }
  return res.json({ success: true, message: 'Member removed from workspace' });
});

export default router;
