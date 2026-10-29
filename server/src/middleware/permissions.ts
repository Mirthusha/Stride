import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { UserRole } from '../types/index.js';
import { db } from '../storage/db.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'Authentication required' });
    }

    let userRole = req.userRole || req.user.role;
    // Universal admin clearance
    if (userRole === 'WorkspaceAdmin' || allowedRoles.includes(userRole)) {
      return next();
    }

    // Check workspace-scoped role
    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      req.body?.workspace_id ||
      req.query?.workspace_id ||
      req.params?.workspaceId ||
      (req.baseUrl.includes('workspaces') && req.params?.id ? req.params.id : undefined);

    if (workspaceId) {
      const wsRole = await db.getUserWorkspaceRole(req.user.id, String(workspaceId));
      if (wsRole === 'WorkspaceAdmin' || (wsRole && allowedRoles.includes(wsRole))) {
        return next();
      }
      if (wsRole) {
        userRole = wsRole;
      }
    }

    // Check project-scoped role
    const projectId =
      (req.headers['x-project-id'] as string) ||
      req.body?.project_id ||
      req.query?.project_id ||
      (req.baseUrl.includes('projects') && req.params?.id ? req.params.id : undefined);

    if (projectId) {
      const projRole = await db.getUserProjectRole(req.user.id, String(projectId));
      if (projRole === 'WorkspaceAdmin' || (projRole && allowedRoles.includes(projRole))) {
        return next();
      }
      if (projRole) {
        userRole = projRole;
      }
    }

    // Check if user is the owner of any workspace
    const userWorkspaces = await db.getWorkspaces(req.user.id);
    const isOwner = userWorkspaces.some((w) => w.owner_id === req.user!.id);
    if (isOwner && (allowedRoles.includes('WorkspaceAdmin') || allowedRoles.includes('ProductOwner'))) {
      return next();
    }

    return res.status(403).json({
      error: true,
      message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${userRole}.`
    });
  };
}
