import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { UserRole } from '../types/index.js';

const router = Router();

router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Not authenticated' });
  }
  return res.json({
    user: req.user,
    role: req.userRole || req.user.role,
    mode: db.isCloudMode ? 'cloud' : 'local'
  });
});

router.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  const users = await db.getUsers();
  return res.json(users);
});

router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: true, message: 'Email is required' });
  }

  const user = await db.getUserByEmail(email);
  if (!user) {
    return res.status(404).json({ error: true, message: 'Account not found with this email. Please sign up first.' });
  }

  return res.json({
    token: user.id,
    user,
    mode: db.isCloudMode ? 'cloud' : 'local'
  });
});

router.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  const { email, display_name, role } = req.body;
  if (!email || !display_name) {
    return res.status(400).json({ error: true, message: 'Email and display name are required' });
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: true, message: 'User with this email already exists' });
  }

  const user = await db.createUser({
    id: `usr_${Date.now()}`,
    email,
    display_name,
    role: (role as UserRole) || 'Developer',
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(display_name)}`
  });

  return res.status(201).json({
    token: user.id,
    user,
    mode: db.isCloudMode ? 'cloud' : 'local'
  });
});

router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Not authenticated' });
  }
  const { display_name, avatar_url, role } = req.body;
  const updated = await db.updateUser(req.user.id, {
    ...(display_name && { display_name }),
    ...(avatar_url && { avatar_url }),
    ...(role && { role })
  });
  return res.json(updated);
});

export default router;
