import { Router, Response } from 'express';
import { db } from '../storage/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Test suites
router.get('/suites', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const suites = await db.getTestSuites(projectId);
  return res.json(suites);
});

router.post('/suites', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, title, name, description } = req.body;
  const resolvedTitle = (title || name || '').trim();
  if (!project_id || !resolvedTitle) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }
  const suite = await db.createTestSuite({
    project_id,
    title: resolvedTitle,
    description: description || ''
  });
  return res.status(201).json(suite);
});

// Test cases
router.get('/cases', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const suiteId = req.query.suite_id as string | undefined;
  const cases = await db.getTestCases(projectId, suiteId);
  return res.json(cases);
});

router.post('/cases', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, suite_id, title, description, preconditions, steps, expected_result, priority } = req.body;
  if (!project_id || !suite_id || !title) {
    return res.status(400).json({ error: true, message: 'project_id, suite_id, and title are required' });
  }
  const testCase = await db.createTestCase({
    project_id,
    suite_id,
    title: title.trim(),
    description: description || '',
    preconditions: preconditions || '',
    steps: steps || '',
    expected_result: expected_result || '',
    priority: priority || 'medium'
  });
  return res.status(201).json(testCase);
});

// Test runs
router.get('/runs', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const runs = await db.getTestRuns(projectId);
  return res.json(runs);
});

router.post('/runs', async (req: AuthenticatedRequest, res: Response) => {
  const { project_id, title } = req.body;
  if (!project_id || !title) {
    return res.status(400).json({ error: true, message: 'project_id and title are required' });
  }
  const run = await db.createTestRun(project_id, title);
  return res.status(201).json(run);
});

// Test executions for a run
router.get('/executions', async (req: AuthenticatedRequest, res: Response) => {
  const testRunId = req.query.test_run_id as string;
  if (!testRunId) {
    return res.status(400).json({ error: true, message: 'test_run_id query param is required' });
  }
  const executions = await db.getTestExecutions(testRunId);
  return res.json(executions);
});

// Record test execution (supports 1-click defect creation on failure)
router.post('/execute', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'Authentication required' });
  }
  const { test_run_id, test_case_id, status, actual_result, create_defect } = req.body;
  if (!test_run_id || !test_case_id || !status) {
    return res.status(400).json({ error: true, message: 'test_run_id, test_case_id, and status are required' });
  }
  const execution = await db.recordTestExecution(
    test_run_id,
    test_case_id,
    status,
    actual_result || '',
    req.user!.id,
    create_defect ? {
      title: create_defect.title || '',
      priority: create_defect.priority || 'high',
      description: create_defect.description || ''
    } : undefined
  );
  return res.status(201).json(execution);
});

// QA Metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  const projectId = req.query.project_id as string;
  if (!projectId) {
    return res.status(400).json({ error: true, message: 'project_id query param is required' });
  }
  const metrics = await db.getQAMetrics(projectId);
  return res.json(metrics);
});

export default router;
