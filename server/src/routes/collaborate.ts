import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get workspace members
router.get('/members', async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.query.workspace_id as string;
  if (!workspaceId) {
    return res.status(400).json({ error: true, message: 'workspace_id query param is required' });
  }
  const members = await db.getWorkspaceMembers(workspaceId);
  return res.json(members);
});

// Update member role
router.patch('/members/:userId/role', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const { workspace_id, role } = req.body;
  const userId = String(req.params.userId);
  if (!workspace_id || !role) {
    return res.status(400).json({ error: true, message: 'workspace_id and role are required' });
  }
  const updated = await db.updateWorkspaceMemberRole(workspace_id, userId, role);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Member not found' });
  }
  return res.json(updated);
});

// Remove member
router.delete('/members/:userId', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.query.workspace_id as string;
  const userId = String(req.params.userId);
  if (!workspaceId) {
    return res.status(400).json({ error: true, message: 'workspace_id is required' });
  }
  const success = await db.removeWorkspaceMember(workspaceId, userId);
  return res.json({ success });
});

// Get workspace invitations
router.get('/invitations', async (req: AuthenticatedRequest, res: Response) => {
  const workspaceId = req.query.workspace_id as string;
  if (!workspaceId) {
    return res.status(400).json({ error: true, message: 'workspace_id query param is required' });
  }
  const invitations = await db.getInvitations(workspaceId);
  return res.json(invitations);
});

// Create invitation
router.post('/invitations', requireRole('WorkspaceAdmin'), async (req: AuthenticatedRequest, res: Response) => {
  const { workspace_id, email, role } = req.body;
  if (!workspace_id || !email) {
    return res.status(400).json({ error: true, message: 'workspace_id and email are required' });
  }
  const invitation = await db.createInvitation(workspace_id, email, role || 'Developer', req.user!.id);
  return res.status(201).json(invitation);
});

// Respond to invitation (accept / reject)
router.post('/invitations/:id/respond', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { action } = req.body;
  if (action !== 'accept' && action !== 'reject') {
    return res.status(400).json({ error: true, message: 'action must be "accept" or "reject"' });
  }
  const success = await db.respondToInvitation(String(req.params.id), action, req.user.id);
  if (!success) {
    return res.status(404).json({ error: true, message: 'Invitation not found or not pending' });
  }
  return res.json({ success, action });
});

export default router;
