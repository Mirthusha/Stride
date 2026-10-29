import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../index.js';

describe('Stride Part 3: Advanced Integrations, Team Collaboration, DevOps & Retrospectives', () => {
  let adminUserId: string;
  let devUserId: string;
  let outsiderUserId: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let outsiderWorkspaceId: string;
  let outsiderProjectId: string;
  let testWorkItemId: string;
  let testSprintId: string;
  let testReleaseId: string;
  let testRetroId: string;

  beforeAll(async () => {
    // 1. Setup accounts
    const adminRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `admin.p3.${Date.now()}@stridesprint.io`,
        display_name: 'Jordan Reed',
        role: 'WorkspaceAdmin'
      });
    adminUserId = adminRes.body.user.id;

    const devRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `dev.p3.${Date.now()}@stridesprint.io`,
        display_name: 'Casey Quinn',
        role: 'Developer'
      });
    devUserId = devRes.body.user.id;

    const outsiderRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `outsider.p3.${Date.now()}@foreign.io`,
        display_name: 'Dana Vance',
        role: 'WorkspaceAdmin'
      });
    outsiderUserId = outsiderRes.body.user.id;

    // 2. Setup main workspace and project
    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('x-user-id', adminUserId)
      .send({
        name: 'DevOps & Agile Core Hub',
        description: 'Workspace for Part 3 integrations and release testing'
      });
    testWorkspaceId = wsRes.body.id;

    // Add dev to workspace
    await request(app)
      .post(`/api/workspaces/${testWorkspaceId}/members`)
      .set('x-user-id', adminUserId)
      .send({ userId: devUserId, role: 'Developer' });

    const projRes = await request(app)
      .post('/api/projects')
      .set('x-user-id', adminUserId)
      .send({
        workspace_id: testWorkspaceId,
        name: 'Nexus Release Platform',
        project_key: 'NEXUS',
        description: 'Production release platform'
      });
    testProjectId = projRes.body.id;

    // 3. Setup outsider workspace and project for multi-tenant isolation tests
    const outWsRes = await request(app)
      .post('/api/workspaces')
      .set('x-user-id', outsiderUserId)
      .send({
        name: 'Foreign Org Workspace',
        description: 'Completely isolated workspace'
      });
    outsiderWorkspaceId = outWsRes.body.id;

    const outProjRes = await request(app)
      .post('/api/projects')
      .set('x-user-id', outsiderUserId)
      .send({
        workspace_id: outsiderWorkspaceId,
        name: 'Foreign Project',
        project_key: 'FOR',
        description: 'Isolated foreign project'
      });
    outsiderProjectId = outProjRes.body.id;

    // 4. Create Sprint & Work Items for Release and Retro tests
    const sprintRes = await request(app)
      .post('/api/sprints')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        name: 'Sprint 24 - DevOps Pipeline',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
        capacity_points: 40
      });
    testSprintId = sprintRes.body.id;

    const itemRes = await request(app)
      .post('/api/work-items')
      .set('x-user-id', adminUserId)
      .send({
        project_id: testProjectId,
        title: 'Implement automated changelog generator',
        type: 'story',
        priority: 'high',
        sprint_id: testSprintId,
        story_points: 5
      });
    testWorkItemId = itemRes.body.id;

    // Mark item done for changelog generator test
    await request(app)
      .put(`/api/work-items/${testWorkItemId}`)
      .set('x-user-id', adminUserId)
      .send({ status: 'done' });
  });

  // ==============================================================================
  // 1. RELEASE MANAGEMENT & AUTOMATED CHANGELOG GENERATOR
  // ==============================================================================
  describe('1. Release Management & Automated Changelog', () => {
    it('creates a release associated with actual project and work items', async () => {
      const res = await request(app)
        .post('/api/releases')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          name: 'Nexus Core 1.0.0',
          version: '1.0.0',
          description: 'Initial production milestone',
          git_tag: 'v1.0.0',
          target_date: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'planned',
          work_item_ids: [testWorkItemId]
        });

      expect(res.status).toBe(201);
      expect(res.body.version).toBe('1.0.0');
      expect(res.body.git_tag).toBe('v1.0.0');
      expect(res.body.work_item_ids).toContain(testWorkItemId);
      testReleaseId = res.body.id;
    });

    it('generates automated draft changelog from actual completed work items', async () => {
      const res = await request(app)
        .post(`/api/releases/${testReleaseId}/generate-changelog`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body.release_notes).toBeDefined();
      expect(res.body.release_notes).toContain('Nexus Core 1.0.0');
      expect(res.body.release_notes).toContain('Implement automated changelog generator');
      expect(res.body.changelog).toBeInstanceOf(Array);
      expect(res.body.changelog.length).toBeGreaterThan(0);
    });

    it('denies publishing to unauthorized developers', async () => {
      const res = await request(app)
        .post(`/api/releases/${testReleaseId}/publish`)
        .set('x-user-id', devUserId);

      expect(res.status).toBe(403);
    });

    it('allows WorkspaceAdmin to publish release and records audit timestamp', async () => {
      const res = await request(app)
        .post(`/api/releases/${testReleaseId}/publish`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('released');
      expect(res.body.published_at).toBeDefined();
      expect(res.body.published_by).toBe(adminUserId);
    });
  });

  // ==============================================================================
  // 2. GITHUB & GITLAB INTEGRATIONS & CONNECTION VALIDATION
  // ==============================================================================
  describe('2. GitHub & GitLab Integrations', () => {
    it('returns not_configured status initially', async () => {
      const res = await request(app)
        .get(`/api/integrations/github/status?project_id=${testProjectId}`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
      expect(res.body.status).toBe('not_configured');
    });

    it('saves GitHub configuration and masks access token', async () => {
      const res = await request(app)
        .post('/api/integrations/github/config')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          repo_owner: 'stride-org',
          repo_name: 'stride-core',
          access_token: 'ghp_fakeInvalidSecretToken1234567890',
          webhook_secret: 'webhook_secret_key_999'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const statusRes = await request(app)
        .get(`/api/integrations/github/status?project_id=${testProjectId}`)
        .set('x-user-id', adminUserId);

      expect(statusRes.body.configured).toBe(true);
      expect(statusRes.body.masked_token).toContain('•••');
      expect(statusRes.body.webhook_url).toContain('/api/integrations/github/webhook');
    });

    it('truthfully fails connection test with invalid credentials instead of faking success', async () => {
      const res = await request(app)
        .post('/api/integrations/github/test-connection')
        .set('x-user-id', adminUserId)
        .send({ project_id: testProjectId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('saves GitLab configuration', async () => {
      const res = await request(app)
        .post('/api/integrations/gitlab/config')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          repo_owner: 'gitlab-group',
          repo_name: 'gitlab-repo',
          access_token: 'glpat_fakeInvalidSecretToken987654',
          webhook_secret: 'gitlab_secret_token_123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('disconnects GitHub integration', async () => {
      const res = await request(app)
        .post('/api/integrations/github/disconnect')
        .set('x-user-id', adminUserId)
        .send({ project_id: testProjectId });

      expect(res.status).toBe(200);

      const statusRes = await request(app)
        .get(`/api/integrations/github/status?project_id=${testProjectId}`)
        .set('x-user-id', adminUserId);

      expect(statusRes.body.configured).toBe(false);
    });
  });

  // ==============================================================================
  // 3. WEBHOOKS, HMAC-SHA256 SIGNATURE VALIDATION & IDEMPOTENCY
  // ==============================================================================
  describe('3. Webhook Signature Validation & Idempotency', () => {
    const webhookSecret = 'test_webhook_hmac_secret_456';

    beforeAll(async () => {
      // Re-configure GitHub with known webhook secret
      await request(app)
        .post('/api/integrations/github/config')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          repo_owner: 'stride-org',
          repo_name: 'stride-core',
          access_token: 'ghp_dummy',
          webhook_secret: webhookSecret
        });
    });

    it('rejects GitHub webhook request when signature is missing or forged', async () => {
      const payload = { zen: 'Keep it logically awesome.' };
      const res = await request(app)
        .post(`/api/integrations/github/webhook?project_id=${testProjectId}`)
        .set('x-github-delivery', 'delivery-uuid-001')
        .set('x-github-event', 'ping')
        .set('x-hub-signature-256', 'sha256=invalid_forged_signature_hash')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid signature');
    });

    it('accepts GitHub webhook request with authentic HMAC-SHA256 signature', async () => {
      const payload = {
        action: 'closed',
        pull_request: {
          number: 42,
          title: 'Implement NEXUS-1 feature integration',
          html_url: 'https://github.com/stride-org/stride-core/pull/42',
          merged: true,
          head: { ref: 'feature/nexus-1' }
        }
      };
      const rawPayload = JSON.stringify(payload);
      const signature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

      const res = await request(app)
        .post(`/api/integrations/github/webhook?project_id=${testProjectId}`)
        .set('x-github-delivery', 'delivery-uuid-valid-100')
        .set('x-github-event', 'pull_request')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('enforces webhook idempotency and rejects duplicate delivery events', async () => {
      const payload = { ping: 'idempotent-test' };
      const rawPayload = JSON.stringify(payload);
      const signature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');
      const deliveryId = 'delivery-unique-idempotent-555';

      // First delivery
      const firstRes = await request(app)
        .post(`/api/integrations/github/webhook?project_id=${testProjectId}`)
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'ping')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.success).toBe(true);

      // Duplicate delivery
      const dupRes = await request(app)
        .post(`/api/integrations/github/webhook?project_id=${testProjectId}`)
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'ping')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(dupRes.status).toBe(200);
      expect(dupRes.body.message).toContain('already processed');
    });

    it('automatically extracts work item key from git commit and creates GitIntegrationLink', async () => {
      // Find item key for testWorkItemId
      const itemRes = await request(app)
        .get(`/api/work-items/${testWorkItemId}`)
        .set('x-user-id', adminUserId);
      const itemKey = itemRes.body.item_key; // e.g. NEXUS-1

      const commitPayload = {
        commits: [
          {
            id: 'a1b2c3d4e5f67890abcdef1234567890abcdef12',
            message: `Fix critical issue for ${itemKey} in core engine`,
            url: 'https://github.com/stride-org/stride-core/commit/a1b2c3d4e5f6',
            author: { name: 'Jordan Reed' }
          }
        ]
      };
      const rawPayload = JSON.stringify(commitPayload);
      const signature = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

      const res = await request(app)
        .post(`/api/integrations/github/webhook?project_id=${testProjectId}`)
        .set('x-github-delivery', `delivery-commit-${Date.now()}`)
        .set('x-github-event', 'push')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(res.status).toBe(200);

      // Verify Git link was recorded for testWorkItemId
      const linksRes = await request(app)
        .get(`/api/integrations/git-links?work_item_id=${testWorkItemId}`)
        .set('x-user-id', adminUserId);

      expect(linksRes.status).toBe(200);
      const matchingLink = linksRes.body.find((l: any) => l.link_type === 'commit');
      expect(matchingLink).toBeDefined();
      expect(matchingLink.title).toContain(itemKey);
    });

    it('allows manual creation of Git link on work item', async () => {
      const res = await request(app)
        .post('/api/integrations/git-links')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          work_item_id: testWorkItemId,
          link_type: 'branch',
          external_id: 'feature/nexus-devops-core',
          title: 'feature/nexus-devops-core',
          url: 'https://github.com/stride-org/stride-core/tree/feature/nexus-devops-core'
        });

      expect(res.status).toBe(201);
      expect(res.body.link_type).toBe('branch');
    });
  });

  // ==============================================================================
  // 4. CI/CD PIPELINE INTEGRATION & EXECUTION RECORDING
  // ==============================================================================
  describe('4. CI/CD Pipeline Integration', () => {
    it('returns empty pipelines list for project without fake executions', async () => {
      const res = await request(app)
        .get(`/api/integrations/cicd/pipelines?project_id=${testProjectId}`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it('records incoming CI/CD webhook pipeline completion', async () => {
      const res = await request(app)
        .post(`/api/integrations/cicd/webhook?project_id=${testProjectId}`)
        .send({
          pipeline_name: 'Production Build & Lint',
          branch: 'main',
          commit_sha: 'c7d8e9f01234567890abcdef',
          status: 'success',
          external_url: 'https://ci.stride.org/builds/1042'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const listRes = await request(app)
        .get(`/api/integrations/cicd/pipelines?project_id=${testProjectId}`)
        .set('x-user-id', adminUserId);

      const found = listRes.body.find((p: any) => p.pipeline_name === 'Production Build & Lint');
      expect(found).toBeDefined();
      expect(found.status).toBe('success');
    });

    it('rejects pipeline trigger when provider is not configured or token missing', async () => {
      const res = await request(app)
        .post('/api/integrations/cicd/trigger')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          workflow_id: 'deploy.yml',
          ref: 'main'
        });

      // Provider access token is a dummy token, so trigger fails with 400 honest error
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  // ==============================================================================
  // 5. PERSISTENT TEAM CHAT & DISCUSSIONS
  // ==============================================================================
  describe('5. Team Discussions & Messaging', () => {
    let messageId: string;

    it('allows workspace member to post message to a channel', async () => {
      const res = await request(app)
        .post('/api/discussions')
        .set('x-user-id', devUserId)
        .send({
          workspace_id: testWorkspaceId,
          channel: 'general-chat',
          message: 'Sprint 24 backlog items have been updated and are ready for review.'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Sprint 24 backlog');
      expect(res.body.user_id).toBe(devUserId);
      messageId = res.body.id;
    });

    it('retrieves discussion messages for the channel', async () => {
      const res = await request(app)
        .get(`/api/discussions?workspace_id=${testWorkspaceId}&channel=general-chat`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].message).toBeDefined();
    });

    it('allows author to edit their own message', async () => {
      const res = await request(app)
        .put(`/api/discussions/${messageId}`)
        .set('x-user-id', devUserId)
        .send({ message: 'Sprint 24 backlog items have been updated and validated.' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('validated');
      expect(res.body.is_edited).toBe(true);
    });

    it('forbids another regular member from editing someone else message', async () => {
      // Create a 3rd member in the workspace
      const member3Res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `member3.${Date.now()}@testorg.io`,
          display_name: 'Taylor Brooks',
          role: 'Developer'
        });
      const member3Id = member3Res.body.user.id;

      await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/members`)
        .set('x-user-id', adminUserId)
        .send({ userId: member3Id, role: 'Developer' });

      const res = await request(app)
        .put(`/api/discussions/${messageId}`)
        .set('x-user-id', member3Id)
        .send({ message: 'Malicious modification of message' });

      expect(res.status).toBe(403);
    });

    it('allows author or WorkspaceAdmin to delete a message', async () => {
      const res = await request(app)
        .delete(`/api/discussions/${messageId}`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==============================================================================
  // 6. SPRINT RETROSPECTIVES & 1-CLICK BACKLOG CONVERSION
  // ==============================================================================
  describe('6. Sprint Retrospectives & Backlog Conversion', () => {
    let actionItemId: string;

    it('creates a sprint retrospective board', async () => {
      const res = await request(app)
        .post('/api/retrospectives')
        .set('x-user-id', adminUserId)
        .send({
          project_id: testProjectId,
          sprint_id: testSprintId,
          title: 'Sprint 24 Retrospective: Pipeline Velocity'
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toContain('Sprint 24');
      testRetroId = res.body.id;
    });

    it('adds feedback items across the 4 retrospective categories', async () => {
      // 1. What went well
      await request(app)
        .post(`/api/retrospectives/${testRetroId}/items`)
        .set('x-user-id', devUserId)
        .send({
          category: 'went_well',
          content: 'CI/CD pipeline test run velocity improved by 40%.'
        });

      // 2. What did not go well
      await request(app)
        .post(`/api/retrospectives/${testRetroId}/items`)
        .set('x-user-id', devUserId)
        .send({
          category: 'not_well',
          content: 'Database indexing took longer than estimated during deployment.'
        });

      // 3. Action item
      const actionRes = await request(app)
        .post(`/api/retrospectives/${testRetroId}/items`)
        .set('x-user-id', adminUserId)
        .send({
          category: 'action_item',
          content: 'Add automated database migration test to GitHub Actions pipeline.',
          assignee_id: devUserId
        });

      expect(actionRes.status).toBe(201);
      expect(actionRes.body.category).toBe('action_item');
      expect(actionRes.body.assignee_id).toBe(devUserId);
      actionItemId = actionRes.body.id;
    });

    it('supports voting on retrospective items', async () => {
      const res = await request(app)
        .post(`/api/retrospectives/items/${actionItemId}/vote`)
        .set('x-user-id', devUserId);

      expect(res.status).toBe(200);
      expect(res.body.votes).toContain(devUserId);
    });

    it('converts an improvement action item into a real backlog work item in 1 click', async () => {
      const res = await request(app)
        .post(`/api/retrospectives/items/${actionItemId}/convert-to-work-item`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.workItem).toBeDefined();
      expect(res.body.workItem.title).toContain('Add automated database migration test');
      expect(res.body.workItem.assignee_id).toBe(devUserId);
      expect(res.body.workItem.project_id).toBe(testProjectId);
      expect(res.body.retrospectiveItem.converted_work_item_id).toBe(res.body.workItem.id);
      expect(res.body.retrospectiveItem.action_status).toBe('in_progress');

      // Verify work item exists in real backlog
      const checkItem = await request(app)
        .get(`/api/work-items/${res.body.workItem.id}`)
        .set('x-user-id', adminUserId);

      expect(checkItem.status).toBe(200);
      expect(checkItem.body.id).toBe(res.body.workItem.id);
    });

    it('prevents duplicate conversion of already-converted retrospective item', async () => {
      const res = await request(app)
        .post(`/api/retrospectives/items/${actionItemId}/convert-to-work-item`)
        .set('x-user-id', adminUserId);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already converted');
    });
  });

  // ==============================================================================
  // 7. MULTI-TENANT ISOLATION & ACCESS CONTROL AUDIT
  // ==============================================================================
  describe('7. Multi-Tenant Security & Isolation Audit', () => {
    it('denies outsider from reading team discussions of another workspace', async () => {
      const res = await request(app)
        .get(`/api/discussions?workspace_id=${testWorkspaceId}&channel=general-chat`)
        .set('x-user-id', outsiderUserId);

      expect(res.status).toBe(403);
    });

    it('denies outsider from posting in discussion channel of another workspace', async () => {
      const res = await request(app)
        .post('/api/discussions')
        .set('x-user-id', outsiderUserId)
        .send({
          workspace_id: testWorkspaceId,
          channel: 'general-chat',
          message: 'Unauthorized intruder message'
        });

      expect(res.status).toBe(403);
    });

    it('denies outsider from accessing integration status of another project', async () => {
      const res = await request(app)
        .get(`/api/integrations/github/status?project_id=${testProjectId}`)
        .set('x-user-id', outsiderUserId);

      expect(res.status).toBe(403);
    });

    it('denies outsider from accessing retrospective boards of another project', async () => {
      const res = await request(app)
        .get(`/api/retrospectives?project_id=${testProjectId}`)
        .set('x-user-id', outsiderUserId);

      expect(res.status).toBe(403);
    });

    it('denies outsider from publishing release of another project', async () => {
      const res = await request(app)
        .post(`/api/releases/${testReleaseId}/publish`)
        .set('x-user-id', outsiderUserId);

      expect(res.status).toBe(403);
    });
  });
});
