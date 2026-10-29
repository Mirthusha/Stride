import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('Stride Part 2: Collaboration, Advanced Agile, QA, Finance, & Governance', () => {
  let adminUserId: string;
  let collabUserId: string;
  let testWorkspaceId: string;
  let testProjectId: string;

  beforeAll(async () => {
    // 1. Genuine admin account
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `admin.p2.${Date.now()}@testorg.io`,
        display_name: 'Morgan Avery',
        role: 'WorkspaceAdmin'
      });
    adminUserId = adminRes.body.user.id;

    // 2. Genuine collaborator account
    const collabRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `collab.p2.${Date.now()}@testorg.io`,
        display_name: 'Alex Harper',
        role: 'Developer'
      });
    collabUserId = collabRes.body.user.id;

    // 3. Genuine test workspace
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('x-user-id', adminUserId)
      .send({
        name: 'Quality Engineering Lab',
        description: 'Advanced testing, metrics, and automation workspace'
      });
    testWorkspaceId = wsRes.body.id;

    // 4. Genuine test project
    const projRes = await request(app)
      .post('/api/projects')
      .set('x-user-id', adminUserId)
      .send({
        workspace_id: testWorkspaceId,
        name: 'Agile Delivery Core',
        project_key: 'ADC',
        description: 'Quality and delivery management'
      });
    testProjectId = projRes.body.id;

    // Add collaborator to workspace
    await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/members`)
      .set('x-user-id', adminUserId)
      .send({ userId: collabUserId, role: 'Developer' });
  });

  const authReq = {
    get: (url: string) => request(app).get(url).set('x-user-id', adminUserId),
    post: (url: string) => request(app).post(url).set('x-user-id', adminUserId),
    put: (url: string) => request(app).put(url).set('x-user-id', adminUserId),
    patch: (url: string) => request(app).patch(url).set('x-user-id', adminUserId),
    delete: (url: string) => request(app).delete(url).set('x-user-id', adminUserId)
  };


  let createdWorkItemId: string;
  let createdInvitationId: string;
  let createdCommentId: string;
  let createdNotificationId: string;
  let createdTimeEntryId: string;
  let createdExpenseId: string;
  let createdSuiteId: string;
  let createdCaseId: string;
  let createdRunId: string;
  let createdRiskId: string;
  let createdReleaseId: string;
  let createdObjectiveId: string;
  let createdKeyResultId: string;
  let createdRuleId: string;
  let createdChecklistId: string;
  let createdDependencyId: string;

  // 1. Multi-User Collaboration & Invitations
  describe('4. Real Multi-User Collaboration & Team Membership', () => {
    it('GET /api/collaborate/members returns active workspace members', async () => {
      const res = await authReq.get(`/api/collaborate/members?workspace_id=${testWorkspaceId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('POST /api/collaborate/invitations creates pending invitation', async () => {
      const res = await authReq.post('/api/collaborate/invitations')
        .send({
          workspace_id: testWorkspaceId,
          email: 'new.collaborator@stride.dev',
          role: 'Developer'
        });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('new.collaborator@stride.dev');
      expect(res.body.status).toBe('pending');
      createdInvitationId = res.body.id;
    });

    it('POST /api/collaborate/invitations/:id/respond accepts invitation', async () => {
      const res = await authReq.post(`/api/collaborate/invitations/${createdInvitationId}/respond`)
        .send({ action: 'accept' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 2. Setup a work item for Part 2 tests
  describe('Work Item Setup for Collaboration Tests', () => {
    it('POST /api/work-items creates test item', async () => {
      const res = await authReq.post('/api/work-items')
        .send({
          project_id: testProjectId,
          title: 'Implement Multi-User Real-time Sync',
          description: 'Enable cross-user collaboration via WebSockets/Supabase',
          type: 'story',
          priority: 'high',
          story_points: 8
        });
      expect(res.status).toBe(201);
      createdWorkItemId = res.body.id;
    });
  });

  // 3. Comments & @Mentions
  describe('5. Comments, Discussions and Mentions', () => {
    it('POST /api/comments adds a comment with @mention that generates notification', async () => {
      const res = await authReq.post('/api/comments')
        .send({
          work_item_id: createdWorkItemId,
          text: 'Great work! Hey @Alex Harper, please review this test specification.'
        });
      expect(res.status).toBe(201);
      expect(res.body.text).toContain('@Alex Harper');
      expect(res.body.mentions.length).toBeGreaterThan(0);
      createdCommentId = res.body.id;
    });

    it('GET /api/comments retrieves comments for work item', async () => {
      const res = await authReq.get(`/api/comments?work_item_id=${createdWorkItemId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === createdCommentId)).toBe(true);
    });
  });

  // 4. Notifications
  describe('6. Notifications', () => {
    it('GET /api/notifications returns user notifications', async () => {
      const res = await authReq.get('/api/notifications');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        createdNotificationId = res.body[0].id;
      }
    });

    it('PATCH /api/notifications/:id/read marks notification as read', async () => {
      if (createdNotificationId) {
        const res = await authReq.patch(`/api/notifications/${createdNotificationId}/read`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it('POST /api/notifications/mark-all-read marks all notifications read', async () => {
      const res = await authReq.post('/api/notifications/mark-all-read');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // 5. Time Tracking & Timers
  describe('10 & 11. Time Tracking and Timers', () => {
    it('POST /api/time-tracking/timer/start starts active timer', async () => {
      const res = await authReq.post('/api/time-tracking/timer/start')
        .send({
          project_id: testProjectId,
          work_item_id: createdWorkItemId,
          description: 'Live test implementation session'
        });
      expect(res.status).toBe(201);
      expect(res.body.project_id).toBe(testProjectId);
      expect(res.body.start_time).toBeDefined();
    });

    it('POST /api/time-tracking/timer/start rejects duplicate running timer for same user', async () => {
      const res = await authReq.post('/api/time-tracking/timer/start')
        .send({
          project_id: testProjectId,
          work_item_id: createdWorkItemId,
          description: 'Second timer'
        });
      expect(res.status).toBe(400);
    });

    it('POST /api/time-tracking/timer/stop stops active timer and records entry', async () => {
      const res = await authReq.post('/api/time-tracking/timer/stop');
      expect(res.status).toBe(200);
      expect(res.body.entry).toBeDefined();
      expect(res.body.durationMinutes).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/time-tracking logs manual time entry and validates positive duration', async () => {
      const invalidRes = await authReq.post('/api/time-tracking')
        .send({
          project_id: testProjectId,
          duration_minutes: 0
        });
      expect(invalidRes.status).toBe(400);

      const validRes = await authReq.post('/api/time-tracking')
        .send({
          project_id: testProjectId,
          work_item_id: createdWorkItemId,
          duration_minutes: 120,
          description: 'Engineered full-stack security and auth'
        });
      expect(validRes.status).toBe(201);
      expect(validRes.body.duration_minutes).toBe(120);
      createdTimeEntryId = validRes.body.id;
    });

    it('GET /api/time-tracking returns filtered project time entries', async () => {
      const res = await authReq.get(`/api/time-tracking?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((e: any) => e.id === createdTimeEntryId)).toBe(true);
    });
  });

  // 6. Budgets and Expenses
  describe('12. Budgets and Expenses', () => {
    it('GET /api/finance/budget returns project budget and hourly rate', async () => {
      const res = await authReq.get(`/api/finance/budget?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.total_budget).toBeGreaterThan(0);
      expect(res.body.hourly_rate).toBeGreaterThan(0);
    });

    it('POST /api/finance/expenses creates pending expense and validates positive amount', async () => {
      const res = await authReq.post('/api/finance/expenses')
        .send({
          project_id: testProjectId,
          amount: 500,
          category: 'Software Licenses',
          description: 'Performance monitoring tool license'
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.amount).toBe(500);
      createdExpenseId = res.body.id;
    });

    it('GET /api/finance/summary excludes pending expenses from approved costs', async () => {
      const res = await authReq.get(`/api/finance/summary?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.total_labor_cost).toBeGreaterThan(0);
      expect(res.body.total_pending_expenses).toBeGreaterThanOrEqual(500);
    });

    it('PATCH /api/finance/expenses/:id/status approves expense and updates financial summary', async () => {
      const patchRes = await authReq.patch(`/api/finance/expenses/${createdExpenseId}/status`)
        .send({ status: 'approved' });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('approved');

      const sumRes = await authReq.get(`/api/finance/summary?project_id=${testProjectId}`);
      expect(sumRes.status).toBe(200);
      expect(sumRes.body.total_approved_expenses).toBeGreaterThanOrEqual(500);
    });
  });

  // 7. QA and Test Management
  describe('13 & 14. QA and Test Management with Defect Linking', () => {
    it('POST /api/qa/suites creates test suite', async () => {
      const res = await authReq.post('/api/qa/suites')
        .send({
          project_id: testProjectId,
          title: 'Security & Access Control Suite',
          description: 'Regression tests for role-based permissions'
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Security & Access Control Suite');
      createdSuiteId = res.body.id;
    });

    it('POST /api/qa/cases creates test case with expected result', async () => {
      const res = await authReq.post('/api/qa/cases')
        .send({
          project_id: testProjectId,
          suite_id: createdSuiteId,
          title: 'Verify unauthorized user cannot delete projects',
          description: 'Check that HTTP 403 Forbidden is returned for Developer role',
          preconditions: 'User authenticated with Developer role',
          steps: '1. Send DELETE /api/projects/:id',
          expected_result: 'Response status is 403 Forbidden',
          priority: 'critical'
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toContain('Verify unauthorized user');
      createdCaseId = res.body.id;
    });

    it('POST /api/qa/runs creates test run', async () => {
      const res = await authReq.post('/api/qa/runs')
        .send({
          project_id: testProjectId,
          title: 'Release 1.0 Acceptance Cycle'
        });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Release 1.0 Acceptance Cycle');
      createdRunId = res.body.id;
    });

    it('POST /api/qa/execute records failed test with 1-click defect creation', async () => {
      const res = await authReq.post('/api/qa/execute')
        .send({
          test_run_id: createdRunId,
          test_case_id: createdCaseId,
          status: 'fail',
          actual_result: 'Expected 403 Forbidden, but received 200 OK',
          create_defect: {
            title: '[Defect]: Security bypass on delete route',
            priority: 'critical',
            description: 'Permissions middleware failed to reject unauthorized user'
          }
        });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('fail');
      expect(res.body.defect_id).toBeDefined();
    });

    it('GET /api/qa/metrics calculates accurate QA metrics', async () => {
      const res = await authReq.get(`/api/qa/metrics?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.total_test_cases).toBeGreaterThan(0);
      expect(res.body.fail_count).toBeGreaterThan(0);
      expect(res.body.open_defects_count).toBeGreaterThan(0);
    });
  });

  // 8. Risk Management
  describe('15. Risk Management', () => {
    it('POST /api/risks creates risk and accurately calculates severity score (P x I)', async () => {
      const res = await authReq.post('/api/risks')
        .send({
          project_id: testProjectId,
          title: 'Third-party notification service rate limit exhaustion',
          description: 'High volume of events might exhaust email quotas',
          category: 'technical',
          probability: 4,
          impact: 5,
          mitigation_plan: 'Implement queue buffering and backoff'
        });
      expect(res.status).toBe(201);
      expect(res.body.probability).toBe(4);
      expect(res.body.impact).toBe(5);
      expect(res.body.severity_score).toBe(20); // 4 * 5 = 20
      createdRiskId = res.body.id;
    });

    it('PUT /api/risks/:id updates risk and recalculates severity', async () => {
      const res = await authReq.put(`/api/risks/${createdRiskId}`)
        .send({
          probability: 2,
          impact: 3,
          status: 'mitigated'
        });
      expect(res.status).toBe(200);
      expect(res.body.severity_score).toBe(6); // 2 * 3 = 6
      expect(res.body.status).toBe('mitigated');
    });
  });

  // 9. Release Management
  describe('16. Release Management Foundation', () => {
    it('POST /api/releases creates release linking deliverables', async () => {
      const res = await authReq.post('/api/releases')
        .send({
          project_id: testProjectId,
          version: '1.2.0',
          name: 'Sprint 14 Feature Release',
          description: 'Includes multi-user collaboration and QA management',
          target_date: '2026-11-15',
          work_item_ids: [createdWorkItemId]
        });
      expect(res.status).toBe(201);
      expect(res.body.version).toBe('1.2.0');
      createdReleaseId = res.body.id;
    });

    it('GET /api/releases returns releases with populated work items', async () => {
      const res = await authReq.get(`/api/releases?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      const rel = res.body.find((r: any) => r.id === createdReleaseId);
      expect(rel).toBeDefined();
      expect(rel.work_items.length).toBeGreaterThan(0);
    });
  });

  // 10. OKR Management
  describe('9. OKR and Goal Management', () => {
    it('POST /api/okrs creates objective', async () => {
      const res = await authReq.post('/api/okrs')
        .send({
          project_id: testProjectId,
          title: 'Achieve 99.9% Test Automation Coverage',
          description: 'Ensure regression stability before production cutover',
          category: 'Engineering'
        });
      expect(res.status).toBe(201);
      createdObjectiveId = res.body.id;
    });

    it('POST /api/okrs/:id/key-results adds key result with progress', async () => {
      const res = await authReq.post(`/api/okrs/${createdObjectiveId}/key-results`)
        .send({
          title: 'Automate 50 integration test cases',
          target_value: 50,
          current_value: 25,
          unit: 'cases'
        });
      expect(res.status).toBe(201);
      createdKeyResultId = res.body.id;
    });

    it('GET /api/okrs returns objectives with calculated progress percentage', async () => {
      const res = await authReq.get(`/api/okrs?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      const obj = res.body.find((o: any) => o.id === createdObjectiveId);
      expect(obj).toBeDefined();
      expect(obj.progress_percentage).toBe(50); // 25 / 50 = 50%
    });
  });

  // 11. Automation Rules
  describe('20. Automation Rules', () => {
    it('POST /api/automation/rules creates an automation rule', async () => {
      const res = await authReq.post('/api/automation/rules')
        .send({
          project_id: testProjectId,
          name: 'Notify Tech Lead on Test Failure',
          description: 'Sends high priority alert when automated run fails',
          trigger: 'test_failed',
          action: {
            type: 'create_notification',
            value: 'Alert: Automated regression test failed.'
          }
        });
      expect(res.status).toBe(201);
      expect(res.body.enabled).toBe(true);
      createdRuleId = res.body.id;
    });

    it('PATCH /api/automation/rules/:id/toggle toggles rule state', async () => {
      const res = await authReq.patch(`/api/automation/rules/${createdRuleId}/toggle`);
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });

  // 12. Checklists, Dependencies, Watchers & Bulk Updates
  describe('8. Checklists, Dependencies, and Bulk Actions', () => {
    it('POST /api/work-items/:id/checklists adds a checklist item', async () => {
      const res = await authReq.post(`/api/work-items/${createdWorkItemId}/checklists`)
        .send({ text: 'Write integration test specification' });
      expect(res.status).toBe(201);
      expect(res.body.completed).toBe(false);
      createdChecklistId = res.body.id;
    });

    it('PATCH /api/work-items/checklists/:id/toggle toggles checklist completion', async () => {
      const res = await authReq.patch(`/api/work-items/checklists/${createdChecklistId}/toggle`);
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
    });

    it('POST /api/work-items/:id/dependencies prevents self-dependency', async () => {
      const res = await authReq.post(`/api/work-items/${createdWorkItemId}/dependencies`)
        .send({
          depends_on_id: createdWorkItemId,
          type: 'blocks'
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('itself');
    });

    it('POST /api/work-items/:id/watch toggles watch status', async () => {
      const res = await authReq.post(`/api/work-items/${createdWorkItemId}/watch`);
      expect(res.status).toBe(200);
      expect(typeof res.body.watching).toBe('boolean');
    });

    it('POST /api/work-items/bulk-update updates multiple items atomically', async () => {
      const res = await authReq.post('/api/work-items/bulk-update')
        .send({
          project_id: testProjectId,
          item_ids: [createdWorkItemId],
          updates: { priority: 'critical' }
        });
      expect(res.status).toBe(200);
      expect(res.body.updatedCount).toBe(1);
    });
  });

  // 13. CSV Export and Import
  describe('18. CSV Export and Import', () => {
    it('GET /api/customization/export/work-items returns CSV attachment with security headers', async () => {
      const res = await authReq.get(`/api/customization/export/work-items?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Key,Title,Type,Status,Priority');
    });

    it('POST /api/customization/import/work-items previews valid rows and flags errors', async () => {
      const res = await authReq.post('/api/customization/import/work-items')
        .send({
          project_id: testProjectId,
          preview: true,
          rows: [
            { Title: 'Valid Import Task', Type: 'task', Status: 'todo', Priority: 'high' },
            { Title: '', Type: 'bug' } // Missing title
          ]
        });
      expect(res.status).toBe(200);
      expect(res.body.valid_count).toBe(1);
      expect(res.body.error_count).toBe(1);
    });
  });

  // 14. Reports Data
  describe('17. Reports and Analytics Data', () => {
    it('GET /api/reports/data returns aggregated reports and velocity metrics', async () => {
      const res = await authReq.get(`/api/reports/data?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(res.body.finance).toBeDefined();
      expect(res.body.qa).toBeDefined();
      expect(res.body.memberTime).toBeDefined();
    });

    it('GET /api/reports/activity returns audit events', async () => {
      const res = await authReq.get(`/api/reports/activity?project_id=${testProjectId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
});
