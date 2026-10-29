import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes from './routes/projects.js';
import epicRoutes from './routes/epics.js';
import workItemRoutes from './routes/work-items.js';
import sprintRoutes from './routes/sprints.js';
import dashboardRoutes from './routes/dashboard.js';
import teamRoutes from './routes/team.js';
import collaborateRoutes from './routes/collaborate.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';
import timeTrackingRoutes from './routes/timetracking.js';
import financeRoutes from './routes/finance.js';
import qaRoutes from './routes/qa.js';
import riskRoutes from './routes/risks.js';
import releaseRoutes from './routes/releases.js';
import okrRoutes from './routes/okrs.js';
import reportRoutes from './routes/reports.js';
import automationRoutes from './routes/automation.js';
import customizationRoutes from './routes/customization.js';
import integrationRoutes from './routes/integrations.js';
import discussionRoutes from './routes/discussions.js';
import retrospectiveRoutes from './routes/retrospectives.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { db } from './storage/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Request logger for development
app.use((req, _res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${req.method} ${req.path}`);
  }
  next();
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'stride-api',
    mode: db.isCloudMode ? 'supabase_cloud' : 'local_storage_engine',
    timestamp: new Date().toISOString()
  });
});

// Global authentication middleware for API
app.use('/api', authMiddleware);

// Mount core routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/epics', epicRoutes);
app.use('/api/work-items', workItemRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/collaborate', collaborateRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/releases', releaseRoutes);
app.use('/api/okrs', okrRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/customization', customizationRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/retrospectives', retrospectiveRoutes);

// Centralized error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  STRIDE AGILE BACKEND SERVER`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Mode: ${db.isCloudMode ? 'Supabase Cloud (PostgreSQL)' : 'Stride Local Engine (JSON File Persistence)'}`);
    console.log(`  URL:  http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

export default app;
