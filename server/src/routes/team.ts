import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { RolePermissionMatrix } from '../types/index.js';

const router = Router();

const PERMISSIONS_MATRIX: RolePermissionMatrix[] = [
  {
    role: 'WorkspaceAdmin',
    title: 'Workspace Administrator',
    description: 'Universal administrative governance over workspaces, projects, billing, and membership.',
    canManageWorkspace: true,
    canManageMembers: true,
    canManageProjects: true,
    canPlanBacklog: true,
    canManageSprints: true,
    canEditAnyWorkItem: true,
    canDeleteWorkItem: true,
    canConfigureWorkflows: true
  },
  {
    role: 'ProductOwner',
    title: 'Product Owner',
    description: 'Steers product vision, prioritizes backlog, creates epics, and aligns scope with business goals.',
    canManageWorkspace: false,
    canManageMembers: false,
    canManageProjects: true,
    canPlanBacklog: true,
    canManageSprints: true,
    canEditAnyWorkItem: true,
    canDeleteWorkItem: true,
    canConfigureWorkflows: false
  },
  {
    role: 'ScrumMaster',
    title: 'Scrum Master',
    description: 'Facilitates Agile rituals, manages sprint lifecycles, monitors capacity, and unblocks developers.',
    canManageWorkspace: false,
    canManageMembers: false,
    canManageProjects: false,
    canPlanBacklog: true,
    canManageSprints: true,
    canEditAnyWorkItem: true,
    canDeleteWorkItem: false,
    canConfigureWorkflows: true
  },
  {
    role: 'Developer',
    title: 'Developer',
    description: 'Implements tasks, updates work status on Kanban boards, adds estimates, and reports bugs.',
    canManageWorkspace: false,
    canManageMembers: false,
    canManageProjects: false,
    canPlanBacklog: false,
    canManageSprints: false,
    canEditAnyWorkItem: true,
    canDeleteWorkItem: false,
    canConfigureWorkflows: false
  }
];

router.get('/permissions-matrix', async (_req: AuthenticatedRequest, res: Response) => {
  return res.json(PERMISSIONS_MATRIX);
});

router.get('/members', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const members = await db.getProjectMembers(projectId);
  return res.json(members);
});

export default router;
