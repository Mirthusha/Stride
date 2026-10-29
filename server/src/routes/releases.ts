import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';

const router = Router();

// Get releases for a project with optional status/version filters
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const isAuth = await db.isUserAuthorizedForProject(req.user.id, projectId);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  let releases = await db.getReleases(projectId);
  if (req.query.status) {
    releases = releases.filter((r) => r.status === req.query.status);
  }
  if (req.query.version) {
    releases = releases.filter((r) => r.version === req.query.version);
  }
  return res.json(releases);
});

// Create release
router.post('/', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { project_id, name, version, version_name, description, target_date, status, work_item_ids, git_tag } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: true, message: 'project_id is required' });
  }
  const isAuth = await db.isUserAuthorizedForProject(req.user.id, project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const resolvedName = (name || version_name || `Release v${version || '1.0.0'}`).trim();
  const resolvedVersion = (version || version_name || '1.0.0').trim();

  const release = await db.createRelease({
    project_id,
    name: resolvedName,
    version: resolvedVersion,
    description: description || '',
    target_date: target_date || new Date().toISOString().split('T')[0],
    status: status || 'planned',
    git_tag: git_tag || `v${resolvedVersion}`,
    work_item_ids: Array.isArray(work_item_ids) ? work_item_ids : []
  });

  return res.status(201).json(release);
});

// Update release
router.put('/:id', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const updated = await db.updateRelease(String(req.params.id), req.body);
  if (!updated) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }
  return res.json(updated);
});

// Generate automated changelog and release notes from completed work items
router.post('/:id/generate-changelog', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const rel = (db as any).state.releases.find((r: any) => r.id === String(req.params.id));
  if (!rel) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }

  if (req.user) {
    const isAuth = await db.isUserAuthorizedForProject(req.user.id, rel.project_id);
    if (!isAuth) {
      return res.status(403).json({ error: true, message: 'Access denied to this project' });
    }
  }

  const release = await db.generateReleaseChangelog(String(req.params.id));
  if (!release) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }
  return res.json(release);
});

// Publish release
router.post('/:id/publish', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const rel = (db as any).state.releases.find((r: any) => r.id === String(req.params.id));
  if (!rel) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }

  const isAuth = await db.isUserAuthorizedForProject(req.user.id, rel.project_id);
  if (!isAuth) {
    return res.status(403).json({ error: true, message: 'Access denied to this project' });
  }

  const release = await db.publishRelease(String(req.params.id), req.user.id);
  if (!release) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }
  return res.json(release);
});

// Delete release
router.delete('/:id', requireRole('WorkspaceAdmin', 'ProductOwner'), async (req: AuthenticatedRequest, res: Response) => {
  const rel = (db as any).state.releases.find((r: any) => r.id === String(req.params.id));
  if (!rel) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }

  if (req.user) {
    const isAuth = await db.isUserAuthorizedForProject(req.user.id, rel.project_id);
    if (!isAuth) {
      return res.status(403).json({ error: true, message: 'Access denied to this project' });
    }
  }

  const success = await db.deleteRelease(String(req.params.id));
  if (!success) {
    return res.status(404).json({ error: true, message: 'Release not found' });
  }
  return res.json({ success: true, message: 'Release deleted successfully' });
});

export default router;
