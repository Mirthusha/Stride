import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Stride Agile Backend API & Workflows', () => {
  let adminToken: string;
  let adminUserId: string;
  let devUserId: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let createdWorkItemId: string;
  let createdSprintId: string;
  let createdEpicId: string;

  beforeAll(async () => {
    // 1. Create a genuine test admin user
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `admin.test.${Date.now()}@testcompany.org`,
        display_name: 'Jordan Miller',
        role: 'WorkspaceAdmin'
      });
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id;

    // 2. Create a genuine test developer user
    const devRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `dev.test.${Date.now()}@testcompany.org`,
        display_name: 'Taylor Reed',
        role: 'Developer'
      });
    devUserId = devRes.body.user.id;

    // 3. Create a test workspace owned by admin
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('x-user-id', adminUserId)
      .send({
        name: 'Enterprise Cloud Solutions',
        description: 'Primary workspace for engineering deliverables'
      });
    testWorkspaceId = wsRes.body.id;

    // 4. Create a test project under that workspace
    const projRes = await request(app)
      .post('/api/projects')
      .set('x-user-id', adminUserId)
      .send({
        workspace_id: testWorkspaceId,
        name: 'Cloud Infrastructure Engine',
        project_key: 'CIE',
        description: 'Agile deliverables and sprints'
      });
    testProjectId = projRes.body.id;
  });

  it('GET /api/health should return ok and storage engine status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('stride-api');
  });

  it('GET /api/auth/me returns authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('x-user-id', adminUserId);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe(adminUserId);
    expect(res.body.role).toBe('WorkspaceAdmin');
  });

  it('GET /api/workspaces returns authorized workspaces for user', async () => {
    const res = await request(app)
      .get('/api/workspaces')
      .set('x-user-id', adminUserId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe('Enterprise Cloud Solutions');
  });

  it('GET /api/projects returns projects in workspace', async () => {
    const res = await request(app)
      .get(`/api/projects?workspace_id=${testWorkspaceId}`)
      .set('x-user-id', adminUserId);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].project_key).toBe('CIE');
  });

  it('POST /api/epics creates an epic and calculates 0% initial progress', async () => {
    const res = await request(app)
      .post('/api/epics')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        title: 'CI/CD Pipeline Automation',
        description: 'Automated test suite and deployment pipelines'
      });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('CI/CD Pipeline Automation');
    expect(res.body.progress_percentage).toBe(0);
    createdEpicId = res.body.id;
  });

  it('POST /api/work-items creates a user story with auto-incremented item key', async () => {
    const res = await request(app)
      .post('/api/work-items')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        title: 'Add automated smoke tests',
        description: 'Verify all critical paths before merge',
        type: 'story',
        priority: 'high',
        story_points: 5,
        epic_id: createdEpicId,
        labels: ['test', 'ci']
      });
    expect(res.status).toBe(201);
    expect(res.body.item_key).toMatch(/^CIE-\d+$/);
    expect(res.body.title).toBe('Add automated smoke tests');
    expect(res.body.story_points).toBe(5);
    createdWorkItemId = res.body.id;
  });

  it('PATCH /api/work-items/:id/status updates Kanban column', async () => {
    const res = await request(app)
      .patch(`/api/work-items/${createdWorkItemId}/status`)
      .set('x-user-id', adminUserId)
      .send({ status: 'done', sort_order: 10 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });

  it('GET /api/epics calculates epic progress based on linked done items', async () => {
    const res = await request(app)
      .get(`/api/epics?project_id=${testProjectId}`)
      .set('x-user-id', adminUserId);
    expect(res.status).toBe(200);
    const epic = res.body.find((e: any) => e.id === createdEpicId);
    expect(epic).toBeDefined();
    expect(epic.total_items).toBe(1);
    expect(epic.completed_items).toBe(1);
    expect(epic.progress_percentage).toBe(100);
  });

  it('POST /api/sprints validates start and end dates', async () => {
    const invalidRes = await request(app)
      .post('/api/sprints')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        name: 'Invalid Sprint Dates',
        start_date: '2026-11-20',
        end_date: '2026-11-10' // End before start
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toContain('end date must not precede start date');
  });

  it('POST /api/sprints creates a planning sprint successfully', async () => {
    const res = await request(app)
      .post('/api/sprints')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        name: 'Sprint 1 — Core Delivery',
        goal: 'Verify end-to-end performance',
        start_date: '2026-11-01',
        end_date: '2026-11-14',
        capacity_points: 30
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Sprint 1 — Core Delivery');
    expect(res.body.status).toBe('planning');
    createdSprintId = res.body.id;
  });

  it('POST /api/sprints/:id/complete rolls over incomplete items to backlog', async () => {
    const res = await request(app)
      .post(`/api/sprints/${createdSprintId}/complete`)
      .set('x-user-id', adminUserId)
      .send({ rolloverAction: 'backlog' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sprint.status).toBe('completed');
  });

  it('GET /api/dashboard/metrics computes real values from DB records', async () => {
    const res = await request(app)
      .get(`/api/dashboard/metrics?project_id=${testProjectId}`)
      .set('x-user-id', adminUserId);
    expect(res.status).toBe(200);
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics.total_work_items).toBe('number');
    expect(typeof res.body.metrics.completed_work_items).toBe('number');
    expect(res.body.metrics.total_work_items).toBeGreaterThan(0);
    expect(res.body.metrics.type_distribution).toBeDefined();
    expect(res.body.metrics.priority_distribution).toBeDefined();
  });

  it('Role permissions reject unauthorized actions when user has developer role', async () => {
    // A developer who is not WorkspaceAdmin cannot modify workspace settings
    const res = await request(app)
      .put(`/api/workspaces/${testWorkspaceId}`)
      .set('x-user-id', devUserId)
      .send({ name: 'Unauthorized Name Change' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Access denied');
  });
});
