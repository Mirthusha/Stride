import { Request, Response, NextFunction } from 'express';
import { db } from '../storage/db.js';
import { UserProfile, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  userRole?: UserRole;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const customUserId = req.headers['x-user-id'] as string;

    // Check custom user ID header (useful for role-switching in development/demo)
    if (customUserId) {
      const user = await db.getUserById(customUserId);
      if (user) {
        req.user = user;
        req.userRole = user.role;
        return next();
      }
    }

    // Check Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // If token is a known mock user ID or demo token
      if (token.startsWith('usr_')) {
        const user = await db.getUserById(token);
        if (user) {
          req.user = user;
          req.userRole = user.role;
          return next();
        }
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
