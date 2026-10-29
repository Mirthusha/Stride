import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  Project,
  ProjectMember,
  Epic,
  WorkItem,
  WorkItemStatus,
  WorkItemDependency,
  ChecklistItem,
  Sprint,
  Comment,
  Notification,
  ActivityLogItem,
  WorkflowStatus,
  SavedView,
  Objective,
  KeyResult,
  TimeEntry,
  ActiveTimer,
  ProjectBudget,
  Expense,
  FinancialSummary,
  TestSuite,
  TestCase,
  TestRun,
  TestExecution,
  QAMetrics,
  ProjectRisk,
  ProjectRelease,
  ChangelogSection,
  ChangelogItem,
  IntegrationConfig,
  IntegrationProvider,
  IntegrationStatus,
  GitIntegrationLink,
  ProcessedWebhookEvent,
  PipelineExecution,
  DiscussionMessage,
  SprintRetrospective,
  RetrospectiveItem,
  CustomFieldDefinition,
  WorkItemTemplate,
  AutomationRule,
  AutomationExecutionLog,
  DashboardMetrics,
  UserRole
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'stride-store.json');

export interface DatabaseState {
  users: UserProfile[];
  workspaces: Workspace[];
  workspace_members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  projects: Project[];
  project_members: ProjectMember[];
  epics: Epic[];
  sprints: Sprint[];
  work_items: WorkItem[];
  checklists: ChecklistItem[];
  dependencies: WorkItemDependency[];
  watchers: { id: string; work_item_id: string; user_id: string }[];
  comments: Comment[];
  notifications: Notification[];
  activity_logs: ActivityLogItem[];
  workflow_statuses: WorkflowStatus[];
  saved_views: SavedView[];
  objectives: Objective[];
  key_results: KeyResult[];
  time_entries: TimeEntry[];
  active_timers: ActiveTimer[];
  project_budgets: ProjectBudget[];
  expenses: Expense[];
  test_suites: TestSuite[];
  test_cases: TestCase[];
  test_runs: TestRun[];
  test_executions: TestExecution[];
  risks: ProjectRisk[];
  releases: ProjectRelease[];
  custom_fields: CustomFieldDefinition[];
  templates: WorkItemTemplate[];
  automation_rules: AutomationRule[];
  automation_logs: AutomationExecutionLog[];
  integration_configs: IntegrationConfig[];
  git_links: GitIntegrationLink[];
  processed_events: ProcessedWebhookEvent[];
  pipeline_executions: PipelineExecution[];
  discussions: DiscussionMessage[];
  retrospectives: SprintRetrospective[];
  retrospective_items: RetrospectiveItem[];
}

export class StorageEngine {
  private state: DatabaseState;
  private supabaseClient: SupabaseClient | null = null;
  public isCloudMode: boolean = false;

  constructor() {
    this.state = this.getInitialSeedState();
    this.initSupabase();
    if (!this.isCloudMode) {
      this.loadFromFile();
    }
  }

  private initSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
      try {
        this.supabaseClient = createClient(supabaseUrl, supabaseKey);
        this.isCloudMode = true;
        console.log('[Stride Database] Running in Cloud Mode with Supabase PostgreSQL');
      } catch (err) {
        console.warn('[Stride Database] Failed to initialize Supabase, falling back to Local Storage Engine:', err);
        this.isCloudMode = false;
      }
    } else {
      this.isCloudMode = false;
      console.log('[Stride Database] Running in Stride Local Engine Mode (Set SUPABASE_URL & keys in .env for Cloud Mode)');
    }
  }

  private loadFromFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.workspaces && parsed.projects && parsed.work_items) {
          // Merge with default seed arrays in case new collections were added in Part 2
          this.state = {
            ...this.getInitialSeedState(),
            ...parsed
          };
          return;
        }
      }
      this.saveToFile();
    } catch (err) {
      console.error('[Stride Database] Error reading local store, resetting to seed state:', err);
      this.state = this.getInitialSeedState();
      this.saveToFile();
    }
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Stride Database] Failed to save local state to file:', err);
    }
  }

  private getInitialSeedState(): DatabaseState {
    return {
      users: [],
      workspaces: [],
      workspace_members: [],
      invitations: [],
      projects: [],
      project_members: [],
      epics: [],
      sprints: [],
      work_items: [],
      checklists: [],
      dependencies: [],
      watchers: [],
      comments: [],
      notifications: [],
      activity_logs: [],
      workflow_statuses: [],
      saved_views: [],
      objectives: [],
      key_results: [],
      time_entries: [],
      active_timers: [],
      project_budgets: [],
      expenses: [],
      test_suites: [],
      test_cases: [],
      test_runs: [],
      test_executions: [],
      risks: [],
      releases: [],
      custom_fields: [],
      templates: [],
      automation_rules: [],
      automation_logs: [],
      integration_configs: [],
      git_links: [],
      processed_events: [],
      pipeline_executions: [],
      discussions: [],
      retrospectives: [],
      retrospective_items: []
    };
  }

  // ==========================================
  // USERS & PROFILES
  // ==========================================
  async getUsers(): Promise<UserProfile[]> {
    return this.state.users;
  }

  async getUserById(id: string): Promise<UserProfile | undefined> {
    return this.state.users.find((u) => u.id === id);
  }

  async getUserByEmail(email: string): Promise<UserProfile | undefined> {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(profile: Omit<UserProfile, 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const now = new Date().toISOString();
    const newUser: UserProfile = {
      ...profile,
      created_at: now,
      updated_at: now
    };
    this.state.users.push(newUser);
    this.saveToFile();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const user = this.state.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return user;
  }

  // ==========================================
  // WORKSPACES & INVITATIONS
  // ==========================================
  async getWorkspaces(userId?: string): Promise<Workspace[]> {
    if (!userId) return [];
    const memberWsIds = this.state.workspace_members
      .filter((m) => m.user_id === userId && m.membership_status === 'active')
      .map((m) => m.workspace_id);
    return this.state.workspaces.filter((w) => w.owner_id === userId || memberWsIds.includes(w.id));
  }

  async getWorkspaceById(id: string): Promise<Workspace | undefined> {
    return this.state.workspaces.find((w) => w.id === id);
  }

  async isUserAuthorizedForWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const ws = this.state.workspaces.find((w) => w.id === workspaceId);
    if (!ws) return false;
    if (ws.owner_id === userId) return true;
    return this.state.workspace_members.some(
      (m) => m.workspace_id === workspaceId && m.user_id === userId && m.membership_status === 'active'
    );
  }

  async isUserAuthorizedForProject(userId: string, projectId: string): Promise<boolean> {
    const proj = this.state.projects.find((p) => p.id === projectId);
    if (!proj) return false;
    return this.isUserAuthorizedForWorkspace(userId, proj.workspace_id);
  }

  async getUserWorkspaceRole(userId: string, workspaceId: string): Promise<UserRole | null> {
    const ws = this.state.workspaces.find((w) => w.id === workspaceId);
    if (!ws) return null;
    if (ws.owner_id === userId) return 'WorkspaceAdmin';
    const member = this.state.workspace_members.find(
      (m) => m.workspace_id === workspaceId && m.user_id === userId && m.membership_status === 'active'
    );
    return member ? member.role : null;
  }

  async getUserProjectRole(userId: string, projectId: string): Promise<UserRole | null> {
    const proj = this.state.projects.find((p) => p.id === projectId);
    if (!proj) return null;
    return this.getUserWorkspaceRole(userId, proj.workspace_id);
  }

  async createWorkspace(data: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Promise<Workspace> {
    const now = new Date().toISOString();
    const newWs: Workspace = {
      ...data,
      id: `ws_${Date.now()}`,
      created_at: now,
      updated_at: now
    };
    this.state.workspaces.push(newWs);
    this.state.workspace_members.push({
      id: `wsm_${Date.now()}`,
      workspace_id: newWs.id,
      user_id: newWs.owner_id,
      role: 'WorkspaceAdmin',
      membership_status: 'active',
      joined_at: now
    });
    // Ensure creator has WorkspaceAdmin status
    const user = this.state.users.find((u) => u.id === newWs.owner_id);
    if (user && user.role !== 'WorkspaceAdmin') {
      user.role = 'WorkspaceAdmin';
    }
    this.saveToFile();
    return newWs;
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const ws = this.state.workspaces.find((w) => w.id === id);
    if (!ws) return null;
    Object.assign(ws, updates, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return ws;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.state.workspace_members
      .filter((m) => m.workspace_id === workspaceId)
      .map((m) => ({
        ...m,
        user: this.state.users.find((u) => u.id === m.user_id)
      }));
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role: UserRole): Promise<WorkspaceMember> {
    const existing = this.state.workspace_members.find(
      (m) => m.workspace_id === workspaceId && m.user_id === userId
    );
    if (existing) {
      existing.role = role;
      existing.membership_status = 'active';
      this.saveToFile();
      return { ...existing, user: this.state.users.find((u) => u.id === userId) };
    }
    const newMember: WorkspaceMember = {
      id: `wsm_${Date.now()}`,
      workspace_id: workspaceId,
      user_id: userId,
      role,
      membership_status: 'active',
      joined_at: new Date().toISOString()
    };
    this.state.workspace_members.push(newMember);
    this.saveToFile();
    return { ...newMember, user: this.state.users.find((u) => u.id === userId) };
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: UserRole): Promise<WorkspaceMember | null> {
    const member = this.state.workspace_members.find(
      (m) => m.workspace_id === workspaceId && m.user_id === userId
    );
    if (!member) return null;
    member.role = role;
    this.saveToFile();
    return { ...member, user: this.state.users.find((u) => u.id === userId) };
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const initialLen = this.state.workspace_members.length;
    this.state.workspace_members = this.state.workspace_members.filter(
      (m) => !(m.workspace_id === workspaceId && m.user_id === userId)
    );
    this.saveToFile();
    return this.state.workspace_members.length < initialLen;
  }

  async getInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return this.state.invitations.filter((i) => i.workspace_id === workspaceId);
  }

  async createInvitation(workspaceId: string, email: string, role: UserRole, invitedBy: string): Promise<WorkspaceInvitation> {
    const existing = this.state.invitations.find(
      (i) => i.workspace_id === workspaceId && i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending'
    );
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const newInv: WorkspaceInvitation = {
      id: `inv_${Date.now()}`,
      workspace_id: workspaceId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
      status: 'pending',
      created_at: now,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
    };
    this.state.invitations.push(newInv);
    this.saveToFile();
    return newInv;
  }

  async respondToInvitation(invitationId: string, action: 'accept' | 'reject', userId: string): Promise<boolean> {
    const inv = this.state.invitations.find((i) => i.id === invitationId);
    if (!inv || inv.status !== 'pending') return false;

    if (action === 'accept') {
      inv.status = 'accepted';
      await this.addWorkspaceMember(inv.workspace_id, userId, inv.role);
    } else {
      inv.status = 'rejected';
    }
    this.saveToFile();
    return true;
  }

  // ==========================================
  // PROJECTS
  // ==========================================
  async getProjects(workspaceId?: string): Promise<Project[]> {
    if (!workspaceId) return this.state.projects;
    return this.state.projects.filter((p) => p.workspace_id === workspaceId);
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    return this.state.projects.find((p) => p.id === id);
  }

  async createProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...data,
      id: `proj_${Date.now()}`,
      created_at: now,
      updated_at: now
    };
    this.state.projects.push(newProject);
    this.state.project_members.push({
      id: `prm_${Date.now()}`,
      project_id: newProject.id,
      user_id: newProject.owner_id,
      role: 'ProductOwner',
      membership_status: 'active',
      created_at: now
    });
    // Create default budget
    this.state.project_budgets.push({
      project_id: newProject.id,
      total_budget: 50000,
      currency: 'USD',
      hourly_rate: 75
    });
    this.saveToFile();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const proj = this.state.projects.find((p) => p.id === id);
    if (!proj) return null;
    Object.assign(proj, updates, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return proj;
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.state.project_members
      .filter((m) => m.project_id === projectId)
      .map((m) => ({
        ...m,
        user: this.state.users.find((u) => u.id === m.user_id)
      }));
  }

  // ==========================================
  // EPICS
  // ==========================================
  async getEpics(projectId: string): Promise<Epic[]> {
    const epics = this.state.epics.filter((e) => e.project_id === projectId);
    return epics.map((epic) => {
      const linkedItems = this.state.work_items.filter((wi) => wi.epic_id === epic.id);
      const total_items = linkedItems.length;
      const completed_items = linkedItems.filter((wi) => wi.status === 'done').length;
      const progress_percentage = total_items > 0 ? Math.round((completed_items / total_items) * 100) : 0;
      return {
        ...epic,
        total_items,
        completed_items,
        progress_percentage
      };
    });
  }

  async getEpicById(id: string): Promise<Epic | undefined> {
    const epic = this.state.epics.find((e) => e.id === id);
    if (!epic) return undefined;
    const linkedItems = this.state.work_items.filter((wi) => wi.epic_id === epic.id);
    const total_items = linkedItems.length;
    const completed_items = linkedItems.filter((wi) => wi.status === 'done').length;
    const progress_percentage = total_items > 0 ? Math.round((completed_items / total_items) * 100) : 0;
    return {
      ...epic,
      total_items,
      completed_items,
      progress_percentage
    };
  }

  async createEpic(data: Omit<Epic, 'id' | 'created_at' | 'updated_at'>): Promise<Epic> {
    const now = new Date().toISOString();
    const newEpic: Epic = {
      ...data,
      id: `epic_${Date.now()}`,
      created_at: now,
      updated_at: now,
      total_items: 0,
      completed_items: 0,
      progress_percentage: 0
    };
    this.state.epics.push(newEpic);
    this.saveToFile();
    return newEpic;
  }

  async updateEpic(id: string, updates: Partial<Epic>): Promise<Epic | null> {
    const epic = this.state.epics.find((e) => e.id === id);
    if (!epic) return null;
    Object.assign(epic, updates, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return this.getEpicById(id) as Promise<Epic>;
  }

  async deleteEpic(id: string): Promise<boolean> {
    const initialLen = this.state.epics.length;
    this.state.epics = this.state.epics.filter((e) => e.id !== id);
    this.state.work_items.forEach((wi) => {
      if (wi.epic_id === id) wi.epic_id = null;
    });
    this.saveToFile();
    return this.state.epics.length < initialLen;
  }

  // ==========================================
  // SPRINTS
  // ==========================================
  async getSprints(projectId: string): Promise<Sprint[]> {
    const sprints = this.state.sprints.filter((s) => s.project_id === projectId);
    return sprints.map((sprint) => {
      const items = this.state.work_items.filter((wi) => wi.sprint_id === sprint.id);
      const total_points = items.reduce((sum, item) => sum + (item.story_points || 0), 0);
      const completedItems = items.filter((wi) => wi.status === 'done');
      const completed_points = completedItems.reduce((sum, item) => sum + (item.story_points || 0), 0);
      const work_items_count = items.length;
      const completed_items_count = completedItems.length;
      const progress_percentage = work_items_count > 0 ? Math.round((completed_items_count / work_items_count) * 100) : 0;
      return {
        ...sprint,
        total_points,
        completed_points,
        work_items_count,
        completed_items_count,
        progress_percentage
      };
    });
  }

  async getSprintById(id: string): Promise<Sprint | undefined> {
    const sprint = this.state.sprints.find((s) => s.id === id);
    if (!sprint) return undefined;
    const items = this.state.work_items.filter((wi) => wi.sprint_id === sprint.id);
    const total_points = items.reduce((sum, item) => sum + (item.story_points || 0), 0);
    const completedItems = items.filter((wi) => wi.status === 'done');
    const completed_points = completedItems.reduce((sum, item) => sum + (item.story_points || 0), 0);
    const work_items_count = items.length;
    const completed_items_count = completedItems.length;
    const progress_percentage = work_items_count > 0 ? Math.round((completed_items_count / work_items_count) * 100) : 0;
    return {
      ...sprint,
      total_points,
      completed_points,
      work_items_count,
      completed_items_count,
      progress_percentage
    };
  }

  async createSprint(data: Omit<Sprint, 'id' | 'created_at' | 'updated_at'>): Promise<Sprint> {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      throw new Error('Sprint end date must not precede start date.');
    }
    if (data.status === 'active') {
      const existingActive = this.state.sprints.find(
        (s) => s.project_id === data.project_id && s.status === 'active'
      );
      if (existingActive) {
        throw new Error(`Project already has an active sprint: "${existingActive.name}". Complete or stop it first.`);
      }
    }

    const now = new Date().toISOString();
    const newSprint: Sprint = {
      ...data,
      id: `sprint_${Date.now()}`,
      created_at: now,
      updated_at: now
    };
    this.state.sprints.push(newSprint);
    this.saveToFile();
    return newSprint;
  }

  async updateSprint(id: string, updates: Partial<Sprint>): Promise<Sprint | null> {
    const sprint = this.state.sprints.find((s) => s.id === id);
    if (!sprint) return null;

    if (updates.start_date && updates.end_date) {
      if (new Date(updates.end_date) < new Date(updates.start_date)) {
        throw new Error('Sprint end date must not precede start date.');
      }
    } else if (updates.end_date && new Date(updates.end_date) < new Date(sprint.start_date)) {
      throw new Error('Sprint end date must not precede start date.');
    }

    if (updates.status === 'active' && sprint.status !== 'active') {
      const existingActive = this.state.sprints.find(
        (s) => s.project_id === sprint.project_id && s.status === 'active' && s.id !== id
      );
      if (existingActive) {
        throw new Error(`Project already has an active sprint: "${existingActive.name}". Complete it before activating this one.`);
      }
    }

    Object.assign(sprint, updates, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return this.getSprintById(id) as Promise<Sprint>;
  }

  async completeSprint(
    sprintId: string,
    rolloverAction: 'backlog' | 'next_sprint',
    targetSprintId?: string
  ): Promise<{ sprint: Sprint; rolledOverCount: number }> {
    const sprint = this.state.sprints.find((s) => s.id === sprintId);
    if (!sprint) throw new Error('Sprint not found');
    if (sprint.status === 'completed') throw new Error('Sprint is already marked completed');

    sprint.status = 'completed';
    sprint.updated_at = new Date().toISOString();

    const incompleteItems = this.state.work_items.filter(
      (wi) => wi.sprint_id === sprintId && wi.status !== 'done'
    );

    let rolledOverCount = 0;
    if (incompleteItems.length > 0) {
      if (rolloverAction === 'next_sprint' && targetSprintId) {
        incompleteItems.forEach((item) => {
          item.sprint_id = targetSprintId;
          item.updated_at = new Date().toISOString();
        });
      } else {
        incompleteItems.forEach((item) => {
          item.sprint_id = null;
          item.updated_at = new Date().toISOString();
        });
      }
      rolledOverCount = incompleteItems.length;
    }

    this.saveToFile();
    const updatedSprint = await this.getSprintById(sprintId);
    return { sprint: updatedSprint!, rolledOverCount };
  }

  // ==========================================
  // WORK ITEMS, CHECKLISTS & DEPENDENCIES
  // ==========================================
  async getWorkItems(projectId: string, filters?: {
    sprint_id?: string | null;
    status?: string;
    priority?: string;
    type?: string;
    assignee_id?: string;
    search?: string;
    backlog_only?: boolean;
    release_id?: string;
  }): Promise<WorkItem[]> {
    let items = this.state.work_items.filter((wi) => wi.project_id === projectId);

    if (filters) {
      if (filters.backlog_only) {
        items = items.filter((wi) => wi.sprint_id === null);
      } else if (filters.sprint_id !== undefined) {
        items = items.filter((wi) => wi.sprint_id === filters.sprint_id);
      }
      if (filters.status) {
        items = items.filter((wi) => wi.status === filters.status);
      }
      if (filters.priority) {
        items = items.filter((wi) => wi.priority === filters.priority);
      }
      if (filters.type) {
        items = items.filter((wi) => wi.type === filters.type);
      }
      if (filters.assignee_id) {
        items = items.filter((wi) => wi.assignee_id === filters.assignee_id);
      }
      if (filters.release_id) {
        items = items.filter((wi) => wi.release_id === filters.release_id);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter((wi) =>
          wi.title.toLowerCase().includes(q) ||
          wi.item_key.toLowerCase().includes(q) ||
          wi.description.toLowerCase().includes(q) ||
          wi.labels.some((l: string) => l.toLowerCase().includes(q))
        );
      }
    }

    return items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        ...item,
        assignee: this.state.users.find((u) => u.id === item.assignee_id),
        reporter: this.state.users.find((u) => u.id === item.reporter_id),
        epic: item.epic_id ? this.state.epics.find((e) => e.id === item.epic_id) : undefined,
        checklists: this.state.checklists.filter((c) => c.work_item_id === item.id),
        dependencies: this.state.dependencies
          .filter((d) => d.work_item_id === item.id)
          .map((d) => ({
            ...d,
            target_item: this.state.work_items.find((wi) => wi.id === d.depends_on_id)
          })),
        watchers: this.state.watchers.filter((w) => w.work_item_id === item.id).map((w) => w.user_id)
      }));
  }

  async getWorkItemById(id: string): Promise<WorkItem | undefined> {
    const item = this.state.work_items.find((wi) => wi.id === id);
    if (!item) return undefined;
    return {
      ...item,
      assignee: this.state.users.find((u) => u.id === item.assignee_id),
      reporter: this.state.users.find((u) => u.id === item.reporter_id),
      epic: item.epic_id ? this.state.epics.find((e) => e.id === item.epic_id) : undefined,
      checklists: this.state.checklists.filter((c) => c.work_item_id === item.id),
      dependencies: this.state.dependencies
        .filter((d) => d.work_item_id === item.id)
        .map((d) => ({
          ...d,
          target_item: this.state.work_items.find((wi) => wi.id === d.depends_on_id)
        })),
      watchers: this.state.watchers.filter((w) => w.work_item_id === item.id).map((w) => w.user_id)
    };
  }

  async createWorkItem(data: Partial<WorkItem> & { project_id: string; title: string }): Promise<WorkItem> {
    const project = this.state.projects.find((p) => p.id === data.project_id);
    const prefix = project ? project.project_key : 'STR';

    const projectItems = this.state.work_items.filter((wi) => wi.project_id === data.project_id);
    let maxNumber = 100;
    projectItems.forEach((wi) => {
      const match = wi.item_key.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
    const nextKey = `${prefix}-${maxNumber + 1}`;
    const now = new Date().toISOString();

    const maxSort = projectItems.reduce((max, wi) => (wi.sort_order > max ? wi.sort_order : max), 0);

    const newItem: WorkItem = {
      project_id: data.project_id,
      title: data.title,
      description: data.description || '',
      type: data.type || 'story',
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      epic_id: data.epic_id || null,
      sprint_id: data.sprint_id || null,
      parent_id: data.parent_id || null,
      assignee_id: data.assignee_id || null,
      reporter_id: data.reporter_id || 'usr_system',
      story_points: data.story_points ?? null,
      labels: Array.isArray(data.labels) ? data.labels : [],
      due_date: data.due_date || null,
      start_date: data.start_date || null,
      release_id: data.release_id || null,
      custom_fields: data.custom_fields || {},
      id: `wi_${Date.now()}`,
      item_key: nextKey,
      sort_order: data.sort_order ?? maxSort + 1,
      created_at: now,
      updated_at: now
    };

    this.state.work_items.push(newItem);

    // Notify assignee if specified
    if (newItem.assignee_id && newItem.assignee_id !== newItem.reporter_id) {
      await this.createNotification({
        recipient_id: newItem.assignee_id,
        event_type: 'task_assigned',
        entity_type: 'work_item',
        entity_id: newItem.id,
        project_id: newItem.project_id,
        message: `You were assigned to ${newItem.item_key}: ${newItem.title}`
      });
    }

    // Record activity
    this.state.activity_logs.unshift({
      id: `act_${Date.now()}`,
      project_id: data.project_id,
      user_id: data.reporter_id || 'usr_system',
      action: 'created_work_item',
      entity_type: 'work_item',
      entity_id: newItem.id,
      details: `Created ${newItem.item_key}: ${newItem.title}`,
      created_at: now
    });

    // Check automation rules
    await this.evaluateAutomationRules(newItem.project_id, 'item_created', newItem);

    this.saveToFile();
    return this.getWorkItemById(newItem.id) as Promise<WorkItem>;
  }

  async updateWorkItem(id: string, updates: Partial<WorkItem>, modifierUserId?: string): Promise<WorkItem | null> {
    const item = this.state.work_items.find((wi) => wi.id === id);
    if (!item) return null;

    const prevStatus = item.status;
    const prevAssignee = item.assignee_id;
    Object.assign(item, updates, { updated_at: new Date().toISOString() });

    // Status change notification & activity
    if (updates.status && updates.status !== prevStatus && modifierUserId) {
      this.state.activity_logs.unshift({
        id: `act_${Date.now()}`,
        project_id: item.project_id,
        user_id: modifierUserId,
        action: 'status_changed',
        entity_type: 'work_item',
        entity_id: item.id,
        details: `Moved ${item.item_key} from "${prevStatus}" to "${updates.status}"`,
        created_at: new Date().toISOString()
      });

      // Automation check
      await this.evaluateAutomationRules(item.project_id, 'status_changed', item);
    }

    // Assignment change notification
    if (updates.assignee_id && updates.assignee_id !== prevAssignee && updates.assignee_id !== modifierUserId) {
      await this.createNotification({
        recipient_id: updates.assignee_id,
        event_type: 'task_assigned',
        entity_type: 'work_item',
        entity_id: item.id,
        project_id: item.project_id,
        message: `You were assigned to ${item.item_key}: ${item.title}`
      });
    }

    this.saveToFile();
    return this.getWorkItemById(id) as Promise<WorkItem>;
  }

  async bulkUpdateWorkItems(
    projectId: string,
    itemIds: string[],
    updates: Partial<WorkItem>,
    modifierUserId: string
  ): Promise<{ updatedCount: number }> {
    let count = 0;
    for (const id of itemIds) {
      const item = this.state.work_items.find((wi) => wi.id === id && wi.project_id === projectId);
      if (item) {
        Object.assign(item, updates, { updated_at: new Date().toISOString() });
        count++;
      }
    }
    this.saveToFile();
    return { updatedCount: count };
  }

  async reorderWorkItems(project_id: string, itemOrders: { id: string; sort_order: number; status?: WorkItemStatus }[]): Promise<void> {
    itemOrders.forEach(({ id, sort_order, status }) => {
      const item = this.state.work_items.find((wi) => wi.id === id && wi.project_id === project_id);
      if (item) {
        item.sort_order = sort_order;
        if (status) item.status = status;
        item.updated_at = new Date().toISOString();
      }
    });
    this.saveToFile();
  }

  async deleteWorkItem(id: string, deletedByUserId?: string): Promise<boolean> {
    const item = this.state.work_items.find((wi) => wi.id === id);
    if (!item) return false;

    this.state.work_items = this.state.work_items.filter((wi) => wi.id !== id);
    this.state.checklists = this.state.checklists.filter((c) => c.work_item_id !== id);
    this.state.comments = this.state.comments.filter((c) => c.work_item_id !== id);
    this.state.dependencies = this.state.dependencies.filter((d) => d.work_item_id !== id && d.depends_on_id !== id);

    if (deletedByUserId) {
      this.state.activity_logs.unshift({
        id: `act_${Date.now()}`,
        project_id: item.project_id,
        user_id: deletedByUserId,
        action: 'deleted_work_item',
        entity_type: 'work_item',
        entity_id: id,
        details: `Deleted work item ${item.item_key} (${item.title})`,
        created_at: new Date().toISOString()
      });
    }

    this.saveToFile();
    return true;
  }

  // Checklists
  async addChecklistItem(workItemId: string, text: string): Promise<ChecklistItem> {
    const item: ChecklistItem = {
      id: `chk_${Date.now()}`,
      work_item_id: workItemId,
      text: text.trim(),
      completed: false,
      created_at: new Date().toISOString()
    };
    this.state.checklists.push(item);
    this.saveToFile();
    return item;
  }

  async toggleChecklistItem(id: string): Promise<ChecklistItem | null> {
    const chk = this.state.checklists.find((c) => c.id === id);
    if (!chk) return null;
    chk.completed = !chk.completed;
    this.saveToFile();
    return chk;
  }

  async deleteChecklistItem(id: string): Promise<boolean> {
    const initialLen = this.state.checklists.length;
    this.state.checklists = this.state.checklists.filter((c) => c.id !== id);
    this.saveToFile();
    return this.state.checklists.length < initialLen;
  }

  // Dependencies
  async addDependency(workItemId: string, dependsOnId: string, type: 'blocks' | 'is_blocked_by' | 'relates_to'): Promise<WorkItemDependency> {
    if (workItemId === dependsOnId) {
      throw new Error('A work item cannot depend on itself.');
    }
    // Check circular dependency if blocking
    if (type === 'blocks') {
      const reverseExists = this.state.dependencies.some(
        (d) => d.work_item_id === dependsOnId && d.depends_on_id === workItemId && d.type === 'blocks'
      );
      if (reverseExists) {
        throw new Error('Circular blocking dependency detected.');
      }
    }
    const dep: WorkItemDependency = {
      id: `dep_${Date.now()}`,
      work_item_id: workItemId,
      depends_on_id: dependsOnId,
      type
    };
    this.state.dependencies.push(dep);
    this.saveToFile();
    return dep;
  }

  async deleteDependency(id: string): Promise<boolean> {
    const initialLen = this.state.dependencies.length;
    this.state.dependencies = this.state.dependencies.filter((d) => d.id !== id);
    this.saveToFile();
    return this.state.dependencies.length < initialLen;
  }

  // Watchers
  async toggleWatcher(workItemId: string, userId: string): Promise<{ watching: boolean }> {
    const existingIndex = this.state.watchers.findIndex(
      (w) => w.work_item_id === workItemId && w.user_id === userId
    );
    if (existingIndex >= 0) {
      this.state.watchers.splice(existingIndex, 1);
      this.saveToFile();
      return { watching: false };
    } else {
      this.state.watchers.push({
        id: `wat_${Date.now()}`,
        work_item_id: workItemId,
        user_id: userId
      });
      this.saveToFile();
      return { watching: true };
    }
  }

  // ==========================================
  // COMMENTS & NOTIFICATIONS
  // ==========================================
  async getComments(workItemId: string): Promise<Comment[]> {
    return this.state.comments
      .filter((c) => c.work_item_id === workItemId)
      .map((c) => ({
        ...c,
        author: this.state.users.find((u) => u.id === c.author_id)
      }));
  }

  async addComment(workItemId: string, authorId: string, text: string): Promise<Comment> {
    const now = new Date().toISOString();
    const item = this.state.work_items.find((wi) => wi.id === workItemId);
    const author = this.state.users.find((u) => u.id === authorId);

    // Extract @mentions
    const mentions: string[] = [];
    this.state.users.forEach((u) => {
      const mentionPattern = new RegExp(`@${u.display_name}`, 'i');
      if (mentionPattern.test(text)) {
        mentions.push(u.id);
      }
    });

    const newComment: Comment = {
      id: `com_${Date.now()}`,
      work_item_id: workItemId,
      author_id: authorId,
      text: text.trim(),
      mentions,
      created_at: now,
      updated_at: now
    };

    this.state.comments.push(newComment);

    // Send notifications to mentioned users
    for (const mentionedId of mentions) {
      if (mentionedId !== authorId) {
        await this.createNotification({
          recipient_id: mentionedId,
          event_type: 'mention',
          entity_type: 'comment',
          entity_id: newComment.id,
          project_id: item?.project_id,
          message: `${author?.display_name || 'Someone'} mentioned you on ${item?.item_key || 'a task'}.`
        });
      }
    }

    // Notify item assignee if different from author and not already mentioned
    if (item && item.assignee_id && item.assignee_id !== authorId && !mentions.includes(item.assignee_id)) {
      await this.createNotification({
        recipient_id: item.assignee_id,
        event_type: 'comment',
        entity_type: 'comment',
        entity_id: newComment.id,
        project_id: item.project_id,
        message: `${author?.display_name || 'Someone'} commented on your task ${item.item_key}.`
      });
    }

    this.saveToFile();
    return { ...newComment, author };
  }

  async deleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = this.state.comments.find((c) => c.id === commentId);
    if (!comment) return false;
    const user = this.state.users.find((u) => u.id === userId);
    // Only author or admin can delete
    if (comment.author_id !== userId && user?.role !== 'WorkspaceAdmin') {
      throw new Error('Not authorized to delete this comment');
    }
    this.state.comments = this.state.comments.filter((c) => c.id !== commentId);
    this.saveToFile();
    return true;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.state.notifications
      .filter((n) => n.recipient_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createNotification(data: Omit<Notification, 'id' | 'read' | 'created_at'>): Promise<Notification> {
    const notif: Notification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      read: false,
      created_at: new Date().toISOString()
    };
    this.state.notifications.unshift(notif);
    this.saveToFile();
    return notif;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    const notif = this.state.notifications.find((n) => n.id === id && n.recipient_id === userId);
    if (!notif) return false;
    notif.read = true;
    this.saveToFile();
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    let count = 0;
    this.state.notifications.forEach((n) => {
      if (n.recipient_id === userId && !n.read) {
        n.read = true;
        count++;
      }
    });
    this.saveToFile();
    return count;
  }

  // ==========================================
  // ADVANCED WORKFLOWS, WIP LIMITS & SAVED VIEWS
  // ==========================================
  async getWorkflowStatuses(projectId: string): Promise<WorkflowStatus[]> {
    return this.state.workflow_statuses
      .filter((s) => s.project_id === projectId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async createWorkflowStatus(data: Omit<WorkflowStatus, 'id' | 'created_at'>): Promise<WorkflowStatus> {
    const newStatus: WorkflowStatus = {
      ...data,
      id: `wfs_${Date.now()}`
    };
    this.state.workflow_statuses.push(newStatus);
    this.saveToFile();
    return newStatus;
  }

  async updateWorkflowStatus(id: string, updates: Partial<WorkflowStatus>): Promise<WorkflowStatus | null> {
    const st = this.state.workflow_statuses.find((s) => s.id === id);
    if (!st) return null;
    Object.assign(st, updates);
    this.saveToFile();
    return st;
  }

  async getSavedViews(projectId: string, userId: string): Promise<SavedView[]> {
    return this.state.saved_views.filter(
      (v) => v.project_id === projectId && (v.is_shared || v.user_id === userId)
    );
  }

  async createSavedView(data: Omit<SavedView, 'id' | 'created_at'>): Promise<SavedView> {
    const view: SavedView = {
      ...data,
      id: `sv_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.saved_views.push(view);
    this.saveToFile();
    return view;
  }

  async deleteSavedView(id: string, userId: string): Promise<boolean> {
    const view = this.state.saved_views.find((v) => v.id === id);
    if (!view) return false;
    if (view.user_id !== userId) {
      throw new Error('Not authorized to delete this saved view');
    }
    this.state.saved_views = this.state.saved_views.filter((v) => v.id !== id);
    this.saveToFile();
    return true;
  }

  // ==========================================
  // OKRs & GOALS
  // ==========================================
  async getObjectives(projectId: string): Promise<Objective[]> {
    const objs = this.state.objectives.filter((o) => o.project_id === projectId);
    return objs.map((obj) => {
      const krs = this.state.key_results
        .filter((kr) => kr.objective_id === obj.id)
        .map((kr) => {
          let progress = 0;
          if (kr.target_value > 0) {
            progress = Math.min(100, Math.round((kr.current_value / kr.target_value) * 100));
          } else if (kr.target_value === 0 && kr.current_value === 0) {
            progress = 100;
          }
          return { ...kr, progress_percentage: progress };
        });

      const avgProgress = krs.length > 0
        ? Math.round(krs.reduce((sum, kr) => sum + (kr.progress_percentage || 0), 0) / krs.length)
        : 0;

      return {
        ...obj,
        key_results: krs,
        progress_percentage: avgProgress
      };
    });
  }

  async createObjective(data: Omit<Objective, 'id' | 'created_at'>): Promise<Objective> {
    const newObj: Objective = {
      ...data,
      id: `obj_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.objectives.push(newObj);
    this.saveToFile();
    return newObj;
  }

  async addKeyResult(objectiveId: string, data: Omit<KeyResult, 'id' | 'objective_id'>): Promise<KeyResult> {
    const kr: KeyResult = {
      ...data,
      id: `kr_${Date.now()}`,
      objective_id: objectiveId
    };
    this.state.key_results.push(kr);
    this.saveToFile();
    return kr;
  }

  async updateKeyResult(id: string, currentValue: number): Promise<KeyResult | null> {
    const kr = this.state.key_results.find((k) => k.id === id);
    if (!kr) return null;
    kr.current_value = currentValue;
    this.saveToFile();
    return kr;
  }

  // ==========================================
  // TIME TRACKING & TIMERS
  // ==========================================
  async getTimeEntries(projectId: string, filters?: { userId?: string; workItemId?: string; startDate?: string; endDate?: string }): Promise<TimeEntry[]> {
    let entries = this.state.time_entries.filter((te) => te.project_id === projectId);
    if (filters) {
      if (filters.userId) entries = entries.filter((te) => te.user_id === filters.userId);
      if (filters.workItemId) entries = entries.filter((te) => te.work_item_id === filters.workItemId);
      if (filters.startDate) entries = entries.filter((te) => te.date >= filters.startDate!);
      if (filters.endDate) entries = entries.filter((te) => te.date <= filters.endDate!);
    }
    return entries.map((te) => ({
      ...te,
      user: this.state.users.find((u) => u.id === te.user_id),
      work_item: te.work_item_id ? this.state.work_items.find((wi) => wi.id === te.work_item_id) : undefined
    }));
  }

  async createTimeEntry(data: Omit<TimeEntry, 'id' | 'created_at'>): Promise<TimeEntry> {
    if (data.duration_minutes <= 0) {
      throw new Error('Duration must be greater than zero minutes.');
    }
    const entry: TimeEntry = {
      ...data,
      id: `te_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.time_entries.push(entry);
    this.saveToFile();
    return entry;
  }

  async deleteTimeEntry(id: string, userId: string): Promise<boolean> {
    const entry = this.state.time_entries.find((te) => te.id === id);
    if (!entry) return false;
    const user = this.state.users.find((u) => u.id === userId);
    if (entry.user_id !== userId && user?.role !== 'WorkspaceAdmin') {
      throw new Error('Not authorized to delete this time entry');
    }
    this.state.time_entries = this.state.time_entries.filter((te) => te.id !== id);
    this.saveToFile();
    return true;
  }

  async getActiveTimer(userId: string): Promise<ActiveTimer | null> {
    return this.state.active_timers.find((t) => t.user_id === userId) || null;
  }

  async startTimer(userId: string, projectId: string, workItemId: string | null, description: string): Promise<ActiveTimer> {
    // If timer already active, throw error
    const existing = this.state.active_timers.find((t) => t.user_id === userId);
    if (existing) {
      throw new Error('An active timer is already running for this user. Stop it first.');
    }
    const timer: ActiveTimer = {
      user_id: userId,
      projectId: projectId,
      project_id: projectId,
      work_item_id: workItemId,
      start_time: new Date().toISOString(),
      description: description || ''
    } as any;
    this.state.active_timers.push(timer);
    this.saveToFile();
    return timer;
  }

  async stopTimer(userId: string): Promise<{ entry: TimeEntry; durationMinutes: number }> {
    const timerIndex = this.state.active_timers.findIndex((t) => t.user_id === userId);
    if (timerIndex < 0) {
      throw new Error('No active timer running for this user.');
    }
    const timer = this.state.active_timers[timerIndex];
    this.state.active_timers.splice(timerIndex, 1);

    const now = Date.now();
    const startTime = new Date(timer.start_time).getTime();
    const diffMs = Math.max(0, now - startTime);
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000)); // Minimum 1 min

    const entry = await this.createTimeEntry({
      project_id: timer.project_id,
      work_item_id: timer.work_item_id,
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      duration_minutes: durationMinutes,
      description: timer.description || 'Tracked via live timer'
    });

    return { entry, durationMinutes };
  }

  // ==========================================
  // BUDGETS & EXPENSES
  // ==========================================
  async getProjectBudget(projectId: string): Promise<ProjectBudget> {
    let budget = this.state.project_budgets.find((b) => b.project_id === projectId);
    if (!budget) {
      budget = {
        project_id: projectId,
        total_budget: 50000,
        currency: 'USD',
        hourly_rate: 75
      };
      this.state.project_budgets.push(budget);
      this.saveToFile();
    }
    return budget;
  }

  async updateProjectBudget(projectId: string, updates: Partial<ProjectBudget>): Promise<ProjectBudget> {
    let budget = await this.getProjectBudget(projectId);
    Object.assign(budget, updates);
    this.saveToFile();
    return budget;
  }

  async getExpenses(projectId: string): Promise<Expense[]> {
    return this.state.expenses
      .filter((e) => e.project_id === projectId)
      .map((e) => ({
        ...e,
        submitter: this.state.users.find((u) => u.id === e.submitter_id)
      }));
  }

  async createExpense(data: Omit<Expense, 'id' | 'status' | 'created_at'>): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    const expense: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    this.state.expenses.push(expense);
    this.saveToFile();
    return expense;
  }

  async updateExpenseStatus(id: string, status: 'approved' | 'rejected', approverUserId: string): Promise<Expense | null> {
    const expense = this.state.expenses.find((e) => e.id === id);
    if (!expense) return null;
    expense.status = status;
    this.saveToFile();
    return expense;
  }

  async getFinancialSummary(projectId: string): Promise<FinancialSummary> {
    const budget = await this.getProjectBudget(projectId);
    const timeEntries = await this.getTimeEntries(projectId);
    const expenses = await this.getExpenses(projectId);

    const total_tracked_minutes = timeEntries.reduce((sum, te) => sum + te.duration_minutes, 0);
    const total_tracked_hours = parseFloat((total_tracked_minutes / 60).toFixed(2));
    const total_labor_cost = parseFloat((total_tracked_hours * budget.hourly_rate).toFixed(2));

    const approvedExpenses = expenses.filter((e) => e.status === 'approved');
    const pendingExpenses = expenses.filter((e) => e.status === 'pending');

    const total_approved_expenses = approvedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const total_pending_expenses = pendingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const combined_actual_cost = parseFloat((total_labor_cost + total_approved_expenses).toFixed(2));
    const remaining_budget = parseFloat((budget.total_budget - combined_actual_cost).toFixed(2));
    const utilization_percentage = budget.total_budget > 0
      ? Math.min(100, Math.round((combined_actual_cost / budget.total_budget) * 100))
      : 0;

    return {
      total_budget: budget.total_budget,
      currency: budget.currency,
      hourly_rate: budget.hourly_rate,
      total_tracked_hours,
      total_labor_cost,
      total_approved_expenses,
      total_pending_expenses,
      combined_actual_cost,
      remaining_budget,
      utilization_percentage
    };
  }

  // ==========================================
  // QA & TEST MANAGEMENT
  // ==========================================
  async getTestSuites(projectId: string): Promise<TestSuite[]> {
    return this.state.test_suites.filter((s) => s.project_id === projectId);
  }

  async createTestSuite(data: Omit<TestSuite, 'id' | 'created_at'>): Promise<TestSuite> {
    const suite: TestSuite = {
      ...data,
      id: `ts_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.test_suites.push(suite);
    this.saveToFile();
    return suite;
  }

  async getTestCases(projectId: string, suiteId?: string): Promise<TestCase[]> {
    let cases = this.state.test_cases.filter((c) => c.project_id === projectId);
    if (suiteId) cases = cases.filter((c) => c.suite_id === suiteId);
    return cases.map((c) => ({
      ...c,
      suite: this.state.test_suites.find((s) => s.id === c.suite_id)
    }));
  }

  async createTestCase(data: Omit<TestCase, 'id' | 'created_at'>): Promise<TestCase> {
    const testCase: TestCase = {
      ...data,
      id: `tc_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.test_cases.push(testCase);
    this.saveToFile();
    return testCase;
  }

  async getTestRuns(projectId: string): Promise<TestRun[]> {
    return this.state.test_runs.filter((r) => r.project_id === projectId);
  }

  async createTestRun(projectId: string, title: string): Promise<TestRun> {
    const run: TestRun = {
      id: `tr_${Date.now()}`,
      project_id: projectId,
      title: title.trim(),
      status: 'in_progress',
      created_at: new Date().toISOString()
    };
    this.state.test_runs.push(run);
    this.saveToFile();
    return run;
  }

  async getTestExecutions(testRunId: string): Promise<TestExecution[]> {
    return this.state.test_executions
      .filter((e) => e.test_run_id === testRunId)
      .map((e) => ({
        ...e,
        test_case: this.state.test_cases.find((c) => c.id === e.test_case_id),
        defect: e.defect_id ? this.state.work_items.find((wi) => wi.id === e.defect_id) : undefined
      }));
  }

  async recordTestExecution(
    testRunId: string,
    testCaseId: string,
    status: 'pass' | 'fail' | 'blocked' | 'not_run',
    actualResult: string,
    executedBy: string,
    createDefectBug?: { title: string; priority: any; description: string }
  ): Promise<TestExecution> {
    let defectId: string | null = null;
    const testCase = this.state.test_cases.find((tc) => tc.id === testCaseId);

    if (status === 'fail' && createDefectBug && testCase) {
      const bug = await this.createWorkItem({
        project_id: testCase.project_id,
        epic_id: null,
        parent_id: null,
        title: createDefectBug.title || `[Defect]: ${testCase.title}`,
        description: `Linked to failed test case: ${testCase.title}\n\nActual Result:\n${actualResult}\n\n${createDefectBug.description || ''}`,
        type: 'bug',
        status: 'todo',
        priority: createDefectBug.priority || 'high',
        assignee_id: null,
        reporter_id: executedBy,
        story_points: 3,
        start_date: null,
        due_date: null,
        sort_order: 0,
        labels: ['qa', 'defect', 'automated-test'],
        sprint_id: null
      });
      defectId = bug.id;

      // Trigger automation check
      await this.evaluateAutomationRules(testCase.project_id, 'test_failed', testCase);
    }

    const execution: TestExecution = {
      id: `tex_${Date.now()}`,
      test_run_id: testRunId,
      test_case_id: testCaseId,
      status,
      actual_result: actualResult,
      defect_id: defectId,
      executed_by: executedBy,
      executed_at: new Date().toISOString()
    };

    this.state.test_executions.push(execution);
    this.saveToFile();
    return execution;
  }

  async getQAMetrics(projectId: string): Promise<QAMetrics> {
    const testCases = this.state.test_cases.filter((tc) => tc.project_id === projectId);
    const testRuns = this.state.test_runs.filter((tr) => tr.project_id === projectId);
    const runIds = testRuns.map((r) => r.id);
    const executions = this.state.test_executions.filter((e) => runIds.includes(e.test_run_id));

    const total_test_cases = testCases.length;
    const total_executions = executions.length;
    const pass_count = executions.filter((e) => e.status === 'pass').length;
    const fail_count = executions.filter((e) => e.status === 'fail').length;
    const blocked_count = executions.filter((e) => e.status === 'blocked').length;
    const not_run_count = executions.filter((e) => e.status === 'not_run').length;

    const evaluatedRuns = pass_count + fail_count;
    const pass_rate_percentage = evaluatedRuns > 0 ? Math.round((pass_count / evaluatedRuns) * 100) : 0;

    const openDefects = this.state.work_items.filter(
      (wi) => wi.project_id === projectId && wi.type === 'bug' && wi.status !== 'done'
    );
    const open_defects_count = openDefects.length;

    const defects_by_severity: Record<string, number> = {
      critical: openDefects.filter((d) => d.priority === 'critical').length,
      high: openDefects.filter((d) => d.priority === 'high').length,
      medium: openDefects.filter((d) => d.priority === 'medium').length,
      low: openDefects.filter((d) => d.priority === 'low').length,
    };

    return {
      total_test_cases,
      total_executions,
      pass_count,
      fail_count,
      blocked_count,
      not_run_count,
      pass_rate_percentage,
      open_defects_count,
      defects_by_severity
    };
  }

  // ==========================================
  // RISK MANAGEMENT
  // ==========================================
  async getRisks(projectId: string): Promise<ProjectRisk[]> {
    return this.state.risks
      .filter((r) => r.project_id === projectId)
      .map((r) => ({
        ...r,
        owner: r.owner_id ? this.state.users.find((u) => u.id === r.owner_id) : undefined
      }));
  }

  async createRisk(data: Omit<ProjectRisk, 'id' | 'severity_score' | 'created_at'>): Promise<ProjectRisk> {
    const probability = Math.max(1, Math.min(5, Number(data.probability) || 1));
    const impact = Math.max(1, Math.min(5, Number(data.impact) || 1));
    const severity_score = probability * impact;

    const risk: ProjectRisk = {
      ...data,
      id: `risk_${Date.now()}`,
      probability,
      impact,
      severity_score,
      created_at: new Date().toISOString()
    };
    this.state.risks.push(risk);
    this.saveToFile();
    return risk;
  }

  async updateRisk(id: string, updates: Partial<ProjectRisk>): Promise<ProjectRisk | null> {
    const risk = this.state.risks.find((r) => r.id === id);
    if (!risk) return null;

    Object.assign(risk, updates);
    if (updates.probability !== undefined || updates.impact !== undefined) {
      risk.probability = Math.max(1, Math.min(5, Number(risk.probability)));
      risk.impact = Math.max(1, Math.min(5, Number(risk.impact)));
      risk.severity_score = risk.probability * risk.impact;
    }

    this.saveToFile();
    return risk;
  }

  async deleteRisk(id: string): Promise<boolean> {
    const initialLen = this.state.risks.length;
    this.state.risks = this.state.risks.filter((r) => r.id !== id);
    this.saveToFile();
    return this.state.risks.length < initialLen;
  }

  // ==========================================
  // RELEASE MANAGEMENT
  // ==========================================
  async getReleases(projectId: string): Promise<ProjectRelease[]> {
    return this.state.releases
      .filter((r) => r.project_id === projectId)
      .map((r) => ({
        ...r,
        work_items: this.state.work_items.filter((wi) => r.work_item_ids.includes(wi.id))
      }));
  }

  async createRelease(data: Omit<ProjectRelease, 'id' | 'created_at'>): Promise<ProjectRelease> {
    const release: ProjectRelease = {
      ...data,
      id: `rel_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.releases.push(release);
    // Link work items
    data.work_item_ids.forEach((wiId) => {
      const item = this.state.work_items.find((wi) => wi.id === wiId);
      if (item) item.release_id = release.id;
    });
    this.saveToFile();
    return release;
  }

  async updateRelease(id: string, updates: Partial<ProjectRelease>): Promise<ProjectRelease | null> {
    const rel = this.state.releases.find((r) => r.id === id);
    if (!rel) return null;
    Object.assign(rel, updates);
    if (updates.work_item_ids) {
      updates.work_item_ids.forEach((wiId) => {
        const item = this.state.work_items.find((wi) => wi.id === wiId);
        if (item) item.release_id = rel.id;
      });
    }
    this.saveToFile();
    return rel;
  }

  async deleteRelease(id: string): Promise<boolean> {
    const initialLen = this.state.releases.length;
    this.state.releases = this.state.releases.filter((r) => r.id !== id);
    this.state.work_items.forEach((wi) => {
      if (wi.release_id === id) {
        delete wi.release_id;
      }
    });
    this.saveToFile();
    return this.state.releases.length < initialLen;
  }

  async publishRelease(id: string, publishedBy: string): Promise<ProjectRelease | null> {
    const rel = this.state.releases.find((r) => r.id === id);
    if (!rel) return null;
    rel.status = 'released';
    rel.published_at = new Date().toISOString();
    rel.published_by = publishedBy;

    // Log in project activity
    const user = this.state.users.find((u) => u.id === publishedBy);
    this.state.activity_logs.push({
      id: `act_${Date.now()}`,
      project_id: rel.project_id,
      user_id: publishedBy,
      action: 'published_release',
      entity_type: 'release',
      entity_id: rel.id,
      details: `Published release ${rel.name} (v${rel.version})`,
      created_at: new Date().toISOString()
    });

    this.saveToFile();
    return rel;
  }

  async generateReleaseChangelog(id: string): Promise<ProjectRelease | null> {
    const rel = this.state.releases.find((r) => r.id === id);
    if (!rel) return null;

    // Get linked items or all completed items in project
    const items = rel.work_item_ids && rel.work_item_ids.length > 0
      ? this.state.work_items.filter((wi) => rel.work_item_ids.includes(wi.id))
      : this.state.work_items.filter((wi) => wi.project_id === rel.project_id && wi.status === 'done');

    const stories = items.filter((i) => i.type === 'story');
    const bugs = items.filter((i) => i.type === 'bug');
    const tasks = items.filter((i) => i.type === 'task');

    const changelog: ChangelogSection[] = [];
    if (stories.length > 0) {
      changelog.push({
        title: 'New Features & User Stories',
        items: stories.map((s) => ({
          id: s.id,
          item_key: s.item_key,
          title: s.title,
          type: s.type,
          priority: s.priority
        }))
      });
    }
    if (bugs.length > 0) {
      changelog.push({
        title: 'Bug Fixes & Quality Improvements',
        items: bugs.map((b) => ({
          id: b.id,
          item_key: b.item_key,
          title: b.title,
          type: b.type,
          priority: b.priority
        }))
      });
    }
    if (tasks.length > 0) {
      changelog.push({
        title: 'Tasks & Technical Enablers',
        items: tasks.map((t) => ({
          id: t.id,
          item_key: t.item_key,
          title: t.title,
          type: t.type,
          priority: t.priority
        }))
      });
    }

    let notes = `## Release Notes: ${rel.name} (v${rel.version})\n\n`;
    notes += `**Target Release Date:** ${rel.target_date}\n`;
    if (rel.description) {
      notes += `\n${rel.description}\n`;
    }
    notes += `\n### Deliverables Summary\n`;
    notes += `- **Total Deliverables:** ${items.length}\n`;
    notes += `- **Features/Stories:** ${stories.length}\n`;
    notes += `- **Bugs Resolved:** ${bugs.length}\n`;
    notes += `- **Tasks Completed:** ${tasks.length}\n\n`;

    changelog.forEach((sec) => {
      notes += `### ${sec.title}\n`;
      sec.items.forEach((item) => {
        notes += `- **[${item.item_key}]** ${item.title} (${item.priority})\n`;
      });
      notes += `\n`;
    });

    rel.changelog = changelog;
    rel.release_notes = notes;
    this.saveToFile();
    return rel;
  }

  // ==========================================
  // CUSTOM FIELDS & TEMPLATES
  // ==========================================
  async getCustomFields(projectId: string): Promise<CustomFieldDefinition[]> {
    return this.state.custom_fields.filter((cf) => cf.project_id === projectId);
  }

  async createCustomField(data: Omit<CustomFieldDefinition, 'id'>): Promise<CustomFieldDefinition> {
    const cf: CustomFieldDefinition = {
      ...data,
      id: `cf_${Date.now()}`
    };
    this.state.custom_fields.push(cf);
    this.saveToFile();
    return cf;
  }

  async getTemplates(projectId: string): Promise<WorkItemTemplate[]> {
    return this.state.templates.filter((t) => t.project_id === projectId);
  }

  async createTemplate(data: Omit<WorkItemTemplate, 'id'>): Promise<WorkItemTemplate> {
    const tmpl: WorkItemTemplate = {
      ...data,
      id: `tmpl_${Date.now()}`
    };
    this.state.templates.push(tmpl);
    this.saveToFile();
    return tmpl;
  }

  // ==========================================
  // AUTOMATION RULES ENGINE
  // ==========================================
  async getAutomationRules(projectId: string): Promise<AutomationRule[]> {
    return this.state.automation_rules.filter((r) => r.project_id === projectId);
  }

  async createAutomationRule(data: Omit<AutomationRule, 'id' | 'execution_count'>): Promise<AutomationRule> {
    const rule: AutomationRule = {
      ...data,
      id: `rule_${Date.now()}`,
      execution_count: 0
    };
    this.state.automation_rules.push(rule);
    this.saveToFile();
    return rule;
  }

  async toggleAutomationRule(id: string): Promise<AutomationRule | null> {
    const rule = this.state.automation_rules.find((r) => r.id === id);
    if (!rule) return null;
    rule.enabled = !rule.enabled;
    this.saveToFile();
    return rule;
  }

  async evaluateAutomationRules(projectId: string, trigger: 'item_created' | 'status_changed' | 'sprint_completed' | 'test_failed', context: any): Promise<void> {
    const activeRules = this.state.automation_rules.filter(
      (r) => r.project_id === projectId && r.trigger === trigger && r.enabled
    );

    for (const rule of activeRules) {
      try {
        rule.execution_count++;
        rule.last_executed_at = new Date().toISOString();

        // Perform configured action
        if (rule.action.type === 'create_notification') {
          await this.createNotification({
            recipient_id: 'usr_sm',
            event_type: 'status_change',
            entity_type: 'work_item',
            entity_id: context.id || 'rule_entity',
            project_id: projectId,
            message: `[Automation: ${rule.name}]: ${rule.action.value} for ${context.item_key || context.title || ''}`
          });
        }

        this.state.automation_logs.unshift({
          id: `log_${Date.now()}`,
          rule_id: rule.id,
          trigger_event: `${trigger} (${context.item_key || context.title || 'event'})`,
          action_taken: `Triggered ${rule.action.type}: ${rule.action.value}`,
          timestamp: new Date().toISOString(),
          success: true
        });
      } catch (err: any) {
        console.error(`Automation rule ${rule.name} failed:`, err);
      }
    }
  }

  async getAutomationLogs(projectId: string): Promise<AutomationExecutionLog[]> {
    const rules = await this.getAutomationRules(projectId);
    const ruleIds = rules.map((r) => r.id);
    return this.state.automation_logs.filter((l) => ruleIds.includes(l.rule_id));
  }

  // ==========================================
  // CSV IMPORT & EXPORT
  // ==========================================
  async exportWorkItemsCSV(projectId: string): Promise<string> {
    const items = await this.getWorkItems(projectId);
    const headers = ['Item Key', 'Title', 'Type', 'Status', 'Priority', 'Story Points', 'Due Date', 'Assignee', 'Sprint ID'];
    const rows = items.map((i) => [
      `"${i.item_key}"`,
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.type}"`,
      `"${i.status}"`,
      `"${i.priority}"`,
      i.story_points ?? '',
      `"${i.due_date || ''}"`,
      `"${i.assignee?.display_name || ''}"`,
      `"${i.sprint_id || ''}"`
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  async importWorkItemsCSV(projectId: string, csvContent: string, reporterId: string): Promise<{ importedCount: number; errors: string[] }> {
    const lines = csvContent.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row.');
    }
    const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
    const titleIdx = headers.findIndex((h) => h === 'title');
    if (titleIdx === -1) {
      throw new Error('CSV requires a "Title" column.');
    }

    const typeIdx = headers.findIndex((h) => h === 'type');
    const priorityIdx = headers.findIndex((h) => h === 'priority');
    const pointsIdx = headers.findIndex((h) => h === 'story points' || h === 'points');

    let importedCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const parts = lines[i].split(',').map((p) => p.replace(/"/g, '').trim());
        const title = parts[titleIdx];
        if (!title) {
          errors.push(`Row ${i}: Missing title, skipped.`);
          continue;
        }

        const type = typeIdx >= 0 && ['task', 'story', 'bug'].includes(parts[typeIdx].toLowerCase())
          ? parts[typeIdx].toLowerCase() as any
          : 'task';

        const priority = priorityIdx >= 0 && ['low', 'medium', 'high', 'critical'].includes(parts[priorityIdx].toLowerCase())
          ? parts[priorityIdx].toLowerCase() as any
          : 'medium';

        const points = pointsIdx >= 0 && !isNaN(Number(parts[pointsIdx]))
          ? Number(parts[pointsIdx])
          : null;

        await this.createWorkItem({
          project_id: projectId,
          title,
          description: 'Imported via CSV',
          type,
          status: 'todo',
          priority,
          assignee_id: null,
          reporter_id: reporterId,
          story_points: points,
          start_date: null,
          due_date: null,
          sort_order: 0,
          labels: ['csv-import'],
          sprint_id: null,
          epic_id: null,
          parent_id: null
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i}: ${err.message}`);
      }
    }

    return { importedCount, errors };
  }

  // ==========================================
  // DASHBOARD & REPORTS AGGREGATION
  // ==========================================
  async getDashboardMetrics(projectId: string, currentUserId?: string): Promise<DashboardMetrics> {
    const items = this.state.work_items.filter((wi) => wi.project_id === projectId);
    const now = new Date();

    const total_work_items = items.length;
    const completed_work_items = items.filter((wi) => wi.status === 'done').length;
    const in_progress_work_items = items.filter((wi) => wi.status === 'in_progress').length;
    const todo_work_items = items.filter((wi) => wi.status === 'todo').length;
    const qa_work_items = items.filter((wi) => wi.status === 'qa').length;

    const overdue_work_items = items.filter((wi) => {
      if (wi.status === 'done' || !wi.due_date) return false;
      return new Date(wi.due_date) < now;
    }).length;

    const sprints = await this.getSprints(projectId);
    const active_sprint = sprints.find((s) => s.status === 'active') || null;

    let sprint_progress_percentage = 0;
    if (active_sprint && active_sprint.work_items_count && active_sprint.work_items_count > 0) {
      sprint_progress_percentage = Math.round(
        ((active_sprint.completed_items_count || 0) / active_sprint.work_items_count) * 100
      );
    }

    const upcoming_deadlines = items
      .filter((wi) => wi.status !== 'done' && wi.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5)
      .map((item) => ({
        ...item,
        assignee: this.state.users.find((u) => u.id === item.assignee_id)
      }));

    const assigned_to_user = currentUserId
      ? items
          .filter((wi) => wi.assignee_id === currentUserId && wi.status !== 'done')
          .slice(0, 6)
      : [];

    const recent_activity = this.state.activity_logs
      .filter((log) => log.project_id === projectId)
      .slice(0, 10)
      .map((log) => ({
        ...log,
        user: this.state.users.find((u) => u.id === log.user_id)
      }));

    const type_distribution: Record<'task' | 'story' | 'bug', number> = {
      task: items.filter((wi) => wi.type === 'task').length,
      story: items.filter((wi) => wi.type === 'story').length,
      bug: items.filter((wi) => wi.type === 'bug').length
    };

    const priority_distribution: Record<'low' | 'medium' | 'high' | 'critical', number> = {
      low: items.filter((wi) => wi.priority === 'low').length,
      medium: items.filter((wi) => wi.priority === 'medium').length,
      high: items.filter((wi) => wi.priority === 'high').length,
      critical: items.filter((wi) => wi.priority === 'critical').length
    };

    return {
      total_work_items,
      completed_work_items,
      in_progress_work_items,
      todo_work_items,
      qa_work_items,
      overdue_work_items,
      active_sprint,
      sprint_progress_percentage,
      upcoming_deadlines,
      assigned_to_user,
      recent_activity,
      type_distribution,
      priority_distribution
    };
  }

  async getReportsData(projectId: string): Promise<any> {
    const sprints = await this.getSprints(projectId);
    const completedSprints = sprints.filter((s) => s.status === 'completed');
    const items = await this.getWorkItems(projectId);
    const timeEntries = await this.getTimeEntries(projectId);
    const finance = await this.getFinancialSummary(projectId);
    const qa = await this.getQAMetrics(projectId);

    // Calculate velocity
    const velocities = completedSprints.map((s) => ({
      sprintName: s.name,
      completedPoints: s.completed_points || 0
    }));
    const totalPointsCompleted = velocities.reduce((sum, v) => sum + v.completedPoints, 0);
    const averageVelocity = velocities.length > 0 ? Math.round(totalPointsCompleted / velocities.length) : 0;

    // Time tracked per member
    const memberTime: Record<string, number> = {};
    timeEntries.forEach((te) => {
      const name = te.user?.display_name || 'Unknown';
      memberTime[name] = (memberTime[name] || 0) + te.duration_minutes / 60;
    });

    return {
      averageVelocity,
      velocities,
      memberTime,
      finance,
      qa,
      totalItems: items.length,
      doneItems: items.filter((i) => i.status === 'done').length
    };
  }

  async getActivityLogs(projectId: string): Promise<ActivityLogItem[]> {
    return this.state.activity_logs
      .filter((l) => l.project_id === projectId)
      .map((log) => ({
        ...log,
        user: this.state.users.find((u) => u.id === log.user_id)
      }));
  }

  // ==========================================
  // PART 3: INTEGRATION CONFIGS & WEBHOOKS
  // ==========================================
  async getIntegrationConfig(projectId: string, provider: IntegrationProvider): Promise<IntegrationConfig | undefined> {
    return this.state.integration_configs.find((c) => c.project_id === projectId && c.provider === provider);
  }

  async getProjectIntegrations(projectId: string): Promise<IntegrationConfig[]> {
    return this.state.integration_configs.filter((c) => c.project_id === projectId);
  }

  async saveIntegrationConfig(data: Omit<IntegrationConfig, 'id' | 'created_at' | 'updated_at'>): Promise<IntegrationConfig> {
    const existing = this.state.integration_configs.find(
      (c) => c.project_id === data.project_id && c.provider === data.provider
    );
    const now = new Date().toISOString();
    if (existing) {
      Object.assign(existing, data, { updated_at: now });
      this.saveToFile();
      return existing;
    }
    const newConfig: IntegrationConfig = {
      ...data,
      id: `int_${Date.now()}`,
      created_at: now,
      updated_at: now
    };
    this.state.integration_configs.push(newConfig);
    this.saveToFile();
    return newConfig;
  }

  async deleteIntegrationConfig(projectId: string, provider: IntegrationProvider): Promise<boolean> {
    const initLen = this.state.integration_configs.length;
    this.state.integration_configs = this.state.integration_configs.filter(
      (c) => !(c.project_id === projectId && c.provider === provider)
    );
    this.saveToFile();
    return this.state.integration_configs.length < initLen;
  }

  async isEventProcessed(eventId: string): Promise<boolean> {
    return this.state.processed_events.some((e) => e.event_id === eventId);
  }

  async markEventProcessed(eventId: string, provider: string): Promise<void> {
    this.state.processed_events.push({
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      event_id: eventId,
      provider,
      received_at: new Date().toISOString()
    });
    if (this.state.processed_events.length > 1000) {
      this.state.processed_events = this.state.processed_events.slice(-1000);
    }
    this.saveToFile();
  }

  // ==========================================
  // GIT LINKS & WORK ITEM ASSOCIATIONS
  // ==========================================
  async getGitLinks(projectId: string, workItemId?: string): Promise<GitIntegrationLink[]> {
    return this.state.git_links.filter((l) => {
      if (workItemId) return l.work_item_id === workItemId;
      return l.project_id === projectId;
    });
  }

  async createGitLink(data: Omit<GitIntegrationLink, 'id' | 'created_at'>): Promise<GitIntegrationLink> {
    const existing = this.state.git_links.find(
      (l) => l.project_id === data.project_id && l.external_id === data.external_id && l.link_type === data.link_type
    );
    if (existing) {
      Object.assign(existing, data);
      this.saveToFile();
      return existing;
    }

    const link: GitIntegrationLink = {
      ...data,
      id: `git_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      created_at: new Date().toISOString()
    };
    this.state.git_links.push(link);
    this.saveToFile();
    return link;
  }

  // ==========================================
  // CI/CD PIPELINE EXECUTIONS
  // ==========================================
  async getPipelineExecutions(projectId: string): Promise<PipelineExecution[]> {
    return this.state.pipeline_executions.filter((p) => p.project_id === projectId);
  }

  async createPipelineExecution(data: Omit<PipelineExecution, 'id' | 'started_at'>): Promise<PipelineExecution> {
    const exec: PipelineExecution = {
      ...data,
      id: `pipe_${Date.now()}`,
      started_at: new Date().toISOString()
    };
    this.state.pipeline_executions.unshift(exec);
    this.saveToFile();
    return exec;
  }

  async updatePipelineExecution(id: string, updates: Partial<PipelineExecution>): Promise<PipelineExecution | null> {
    const exec = this.state.pipeline_executions.find((p) => p.id === id);
    if (!exec) return null;
    Object.assign(exec, updates);
    this.saveToFile();
    return exec;
  }

  // ==========================================
  // TEAM DISCUSSIONS & CHAT
  // ==========================================
  async getDiscussions(workspaceId: string, channelId?: string, channelType?: string): Promise<DiscussionMessage[]> {
    return this.state.discussions
      .filter((d) => {
        if (d.workspace_id !== workspaceId) return false;
        if (channelId && d.channel_id !== channelId) return false;
        if (channelType && d.channel_type !== channelType) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        user: this.state.users.find((u) => u.id === d.user_id)
      }));
  }

  async createDiscussionMessage(
    data: Omit<DiscussionMessage, 'id' | 'created_at' | 'updated_at' | 'edited'>
  ): Promise<DiscussionMessage> {
    const now = new Date().toISOString();
    const msg: DiscussionMessage = {
      ...data,
      id: `disc_${Date.now()}`,
      edited: false,
      created_at: now,
      updated_at: now
    };
    this.state.discussions.push(msg);
    this.saveToFile();
    return {
      ...msg,
      user: this.state.users.find((u) => u.id === msg.user_id)
    };
  }

  async updateDiscussionMessage(id: string, userId: string, content: string): Promise<DiscussionMessage | null> {
    const msg = this.state.discussions.find((d) => d.id === id);
    if (!msg || msg.user_id !== userId) return null;
    msg.content = content.trim();
    msg.edited = true;
    msg.updated_at = new Date().toISOString();
    this.saveToFile();
    return {
      ...msg,
      user: this.state.users.find((u) => u.id === msg.user_id)
    };
  }

  async deleteDiscussionMessage(id: string, userId: string, isAdmin: boolean = false): Promise<boolean> {
    const msg = this.state.discussions.find((d) => d.id === id);
    if (!msg) return false;
    if (msg.user_id !== userId && !isAdmin) return false;
    this.state.discussions = this.state.discussions.filter((d) => d.id !== id);
    this.saveToFile();
    return true;
  }

  // ==========================================
  // SPRINT RETROSPECTIVES
  // ==========================================
  async getRetrospectives(projectId: string, sprintId?: string): Promise<SprintRetrospective[]> {
    return this.state.retrospectives
      .filter((r) => {
        if (r.project_id !== projectId) return false;
        if (sprintId && r.sprint_id !== sprintId) return false;
        return true;
      })
      .map((r) => {
        const sprint = this.state.sprints.find((s) => s.id === r.sprint_id);
        return {
          ...r,
          sprint_name: sprint?.name || 'Sprint'
        };
      });
  }

  async getRetrospectiveById(id: string): Promise<SprintRetrospective | undefined> {
    const r = this.state.retrospectives.find((retro) => retro.id === id);
    if (!r) return undefined;
    const sprint = this.state.sprints.find((s) => s.id === r.sprint_id);
    return {
      ...r,
      sprint_name: sprint?.name || 'Sprint'
    };
  }

  async createRetrospective(data: Omit<SprintRetrospective, 'id' | 'created_at'>): Promise<SprintRetrospective> {
    const retro: SprintRetrospective = {
      ...data,
      id: `retro_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.state.retrospectives.push(retro);
    this.saveToFile();
    return retro;
  }

  async updateRetrospective(id: string, updates: Partial<SprintRetrospective>): Promise<SprintRetrospective | null> {
    const retro = this.state.retrospectives.find((r) => r.id === id);
    if (!retro) return null;
    Object.assign(retro, updates);
    this.saveToFile();
    return retro;
  }

  async getRetrospectiveItems(retrospectiveId: string): Promise<RetrospectiveItem[]> {
    return this.state.retrospective_items
      .filter((i) => i.retrospective_id === retrospectiveId)
      .map((i) => ({
        ...i,
        user: this.state.users.find((u) => u.id === i.user_id),
        assignee: i.action_assignee_id ? this.state.users.find((u) => u.id === i.action_assignee_id) : undefined
      }));
  }

  async createRetrospectiveItem(
    data: Omit<RetrospectiveItem, 'id' | 'votes' | 'voted_user_ids' | 'created_at'>
  ): Promise<RetrospectiveItem> {
    const item: RetrospectiveItem = {
      ...data,
      id: `ritem_${Date.now()}`,
      votes: 0,
      voted_user_ids: [],
      created_at: new Date().toISOString()
    };
    this.state.retrospective_items.push(item);
    this.saveToFile();
    return {
      ...item,
      user: this.state.users.find((u) => u.id === item.user_id),
      assignee: item.action_assignee_id ? this.state.users.find((u) => u.id === item.action_assignee_id) : undefined
    };
  }

  async voteRetrospectiveItem(itemId: string, userId: string): Promise<RetrospectiveItem | null> {
    const item = this.state.retrospective_items.find((i) => i.id === itemId);
    if (!item) return null;
    if (!item.voted_user_ids) item.voted_user_ids = [];
    const hasVoted = item.voted_user_ids.includes(userId);
    if (hasVoted) {
      item.voted_user_ids = item.voted_user_ids.filter((u) => u !== userId);
      item.votes = Math.max(0, item.votes - 1);
    } else {
      item.voted_user_ids.push(userId);
      item.votes += 1;
    }
    this.saveToFile();
    return {
      ...item,
      user: this.state.users.find((u) => u.id === item.user_id),
      assignee: item.action_assignee_id ? this.state.users.find((u) => u.id === item.action_assignee_id) : undefined
    };
  }

  async updateRetrospectiveItem(itemId: string, updates: Partial<RetrospectiveItem>): Promise<RetrospectiveItem | null> {
    const item = this.state.retrospective_items.find((i) => i.id === itemId);
    if (!item) return null;
    Object.assign(item, updates);
    this.saveToFile();
    return {
      ...item,
      user: this.state.users.find((u) => u.id === item.user_id),
      assignee: item.action_assignee_id ? this.state.users.find((u) => u.id === item.action_assignee_id) : undefined
    };
  }

  async deleteRetrospectiveItem(itemId: string, userId: string, isAdmin: boolean = false): Promise<boolean> {
    const item = this.state.retrospective_items.find((i) => i.id === itemId);
    if (!item) return false;
    if (item.user_id !== userId && !isAdmin) return false;
    this.state.retrospective_items = this.state.retrospective_items.filter((i) => i.id !== itemId);
    this.saveToFile();
    return true;
  }
}

// Global singleton instance
export const db = new StorageEngine();
