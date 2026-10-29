import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get discussion messages for a channel
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const workspaceId = (req.query.workspace_id as string) || (req.headers['x-workspace-id'] as string);
  const channelId = (req.query.channel_id as string) || (req.query.channel as string);
  const channelType = req.query.channel_type as string;

  if (!workspaceId) {
    return res.status(400).json({ error: true, message: 'workspace_id is required' });
  }

  const isAuth = await db.isUserAuthorizedForWorkspace(req.user.id, workspaceId);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this workspace' });
  }

  const messages = await db.getDiscussions(workspaceId, channelId, channelType);
  return res.json(messages.map((m) => ({ ...m, message: m.content, is_edited: m.edited })));
});

// Post a discussion message
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const workspace_id = req.body.workspace_id || (req.headers['x-workspace-id'] as string);
  const channel_id = req.body.channel_id || req.body.channel;
  const content = req.body.content || req.body.message;
  const { project_id, channel_type } = req.body;

  if (!workspace_id || !channel_id || !content || !content.trim()) {
    return res.status(400).json({ error: true, message: 'workspace_id, channel_id, and non-empty content are required' });
  }

  const isAuth = await db.isUserAuthorizedForWorkspace(req.user.id, workspace_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this workspace' });
  }

  const message = await db.createDiscussionMessage({
    workspace_id,
    project_id,
    channel_type: channel_type || 'project',
    channel_id,
    user_id: req.user.id,
    content: content.trim()
  });

  return res.status(201).json({ ...message, message: message.content, is_edited: message.edited });
});

// Edit a discussion message (Author only)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });
  const content = req.body.content || req.body.message;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: true, message: 'content is required' });
  }

  const msg = (db as any).state.discussions.find((d: any) => d.id === String(req.params.id));
  if (!msg) {
    return res.status(404).json({ error: true, message: 'Message not found' });
  }
  if (msg.user_id !== req.user.id) {
    return res.status(403).json({ error: true, message: 'Only author can edit this message' });
  }

  const updated = await db.updateDiscussionMessage(String(req.params.id), req.user.id, content.trim());
  if (!updated) {
    return res.status(403).json({ error: true, message: 'Cannot edit message' });
  }
  return res.json({ ...updated, message: updated.content, is_edited: updated.edited });
});

// Delete a discussion message (Author or WorkspaceAdmin)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: true, message: 'Authentication required' });

  const msg = (db as any).state.discussions.find((d: any) => d.id === String(req.params.id));
  if (!msg) {
    return res.status(404).json({ error: true, message: 'Message not found' });
  }

  const isAuthor = msg.user_id === req.user.id;
  const isWorkspaceAdmin = req.userRole === 'WorkspaceAdmin' || req.user.role === 'WorkspaceAdmin';
  
  if (!isAuthor && !isWorkspaceAdmin) {
    return res.status(403).json({ error: true, message: 'Only author or workspace admin can delete this message' });
  }

  const deleted = await db.deleteDiscussionMessage(String(req.params.id), req.user.id, true);
  if (!deleted) {
    return res.status(403).json({ error: true, message: 'Cannot delete message' });
  }
  return res.json({ success: true, message: 'Message deleted' });
});

export default router;
