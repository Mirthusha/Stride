import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get real dashboard metrics calculated from database records
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
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

  const project = await db.getProjectById(projectId);
  const metrics = await db.getDashboardMetrics(projectId, req.user?.id);
  return res.json({
    metrics,
    project,
    mode: db.isCloudMode ? 'cloud' : 'local'
  });
});

// Get recent project activity logs
router.get('/activity', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }

  const activity = await db.getActivityLogs(projectId);
  return res.json(activity);
});

export default router;
