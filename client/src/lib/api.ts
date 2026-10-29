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
  DashboardMetrics,
  RolePermissionMatrix,
  UserRole,
  Comment,
  Notification,
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
  Objective,
  KeyResult,
  AutomationRule,
  CustomFieldDefinition,
  WorkItemTemplate,
  WorkflowStatus,
  SavedView,
  IntegrationStatus,
  IntegrationConfig,
  GitIntegrationLink,
  GitLinkType,
  PipelineExecution,
  DiscussionMessage,
  SprintRetrospective,
  RetrospectiveItem,
  RetrospectiveCategory
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let supabase: SupabaseClient | null = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('[Stride Client] Supabase client init failed:', err);
  }
}

// Stored current user ID for session restoration
export function getActiveUserId(): string {
  return localStorage.getItem('stride_active_user_id') || '';
}

export function setActiveUserId(id: string): void {
  localStorage.setItem('stride_active_user_id', id);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentUserId = getActiveUserId();
  const currentWorkspaceId = localStorage.getItem('stride_active_workspace_id');
  const currentProjectId = localStorage.getItem('stride_active_project_id');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (currentUserId) {
    headers.set('x-user-id', currentUserId);
    headers.set('Authorization', `Bearer ${currentUserId}`);
  }
  if (currentWorkspaceId) {
    headers.set('x-workspace-id', currentWorkspaceId);
  }
  if (currentProjectId) {
    headers.set('x-project-id', currentProjectId);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth & Profile
  auth: {
    getMe: () => request<{ user: UserProfile; role: UserRole; mode: 'cloud' | 'local' }>('/auth/me'),
    getUsers: () => request<UserProfile[]>('/auth/users'),
    login: (email: string, role?: UserRole) =>
      request<{ token: string; user: UserProfile; mode: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, role })
      }),
    signup: (email: string, display_name: string, role?: UserRole) =>
      request<{ token: string; user: UserProfile; mode: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, display_name, role })
      }),
    updateProfile: (updates: Partial<UserProfile>) =>
      request<UserProfile>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      })
  },

  // Workspaces
  workspaces: {
    getAll: () => request<Workspace[]>('/workspaces'),
    getById: (id: string) => request<Workspace>(`/workspaces/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: { name?: string; description?: string }) =>
      request<Workspace>(`/workspaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getMembers: (workspaceId: string) => request<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
    addMember: (workspaceId: string, userId: string, role: UserRole) =>
      request<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role })
      }),
    updateRole: (workspaceId: string, userId: string, role: UserRole) =>
      request<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      }),
    removeMember: (workspaceId: string, userId: string) =>
      request<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/members/${userId}`, {
        method: 'DELETE'
      })
  },

  // Collaboration & Team
  collaborate: {
    getMembers: (workspaceId: string) => request<WorkspaceMember[]>(`/collaborate/members?workspace_id=${workspaceId}`),
    updateMemberRole: (userId: string, workspace_id: string, role: UserRole) =>
      request<WorkspaceMember>(`/collaborate/members/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ workspace_id, role })
      }),
    removeMember: (userId: string, workspaceId: string) =>
      request<{ success: boolean }>(`/collaborate/members/${userId}?workspace_id=${workspaceId}`, {
        method: 'DELETE'
      }),
    getInvitations: (workspaceId: string) => request<WorkspaceInvitation[]>(`/collaborate/invitations?workspace_id=${workspaceId}`),
    createInvitation: (workspace_id: string, email: string, role: UserRole) =>
      request<WorkspaceInvitation>('/collaborate/invitations', {
        method: 'POST',
        body: JSON.stringify({ workspace_id, email, role })
      }),
    respondToInvitation: (id: string, action: 'accept' | 'reject') =>
      request<{ success: boolean; action: string }>(`/collaborate/invitations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ action })
      })
  },

  // Projects
  projects: {
    getAll: (workspaceId?: string) =>
      request<Project[]>(`/projects${workspaceId ? `?workspace_id=${workspaceId}` : ''}`),
    getById: (id: string) => request<Project>(`/projects/${id}`),
    create: (data: {
      workspace_id: string;
      name: string;
      description?: string;
      project_key: string;
      start_date?: string;
      target_date?: string;
    }) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Project>) =>
      request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getMembers: (projectId: string) => request<ProjectMember[]>(`/projects/${projectId}/members`)
  },

  // Epics
  epics: {
    getAll: (projectId: string) => request<Epic[]>(`/epics?project_id=${projectId}`),
    getById: (id: string) => request<Epic>(`/epics/${id}`),
    create: (data: {
      project_id: string;
      title: string;
      description?: string;
      start_date?: string;
      target_date?: string;
      owner_id?: string;
    }) =>
      request<Epic>('/epics', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Epic>) =>
      request<Epic>(`/epics/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/epics/${id}`, {
        method: 'DELETE'
      })
  },

  // Sprints
  sprints: {
    getAll: (projectId: string) => request<Sprint[]>(`/sprints?project_id=${projectId}`),
    getById: (id: string) => request<Sprint>(`/sprints/${id}`),
    create: (data: {
      project_id: string;
      name: string;
      goal?: string;
      start_date: string;
      end_date: string;
      capacity_points?: number | null;
      status?: 'planning' | 'active';
    }) =>
      request<Sprint>('/sprints', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<Sprint>) =>
      request<Sprint>(`/sprints/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    activate: (id: string) =>
      request<Sprint>(`/sprints/${id}/activate`, {
        method: 'POST'
      }),
    complete: (id: string, rolloverAction: 'backlog' | 'next_sprint', targetSprintId?: string) =>
      request<{ success: boolean; message: string; sprint: Sprint; rolledOverCount: number }>(
        `/sprints/${id}/complete`,
        {
          method: 'POST',
          body: JSON.stringify({ rolloverAction, targetSprintId })
        }
      )
  },

  // Work Items
  workItems: {
    getAll: (
      projectId: string,
      filters?: {
        sprint_id?: string | null;
        backlog_only?: boolean;
        status?: string;
        priority?: string;
        type?: string;
        assignee_id?: string;
        search?: string;
      }
    ) => {
      const params = new URLSearchParams({ project_id: projectId });
      if (filters?.backlog_only) params.append('backlog_only', 'true');
      if (filters?.sprint_id !== undefined) params.append('sprint_id', String(filters.sprint_id));
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.assignee_id) params.append('assignee_id', filters.assignee_id);
      if (filters?.search) params.append('search', filters.search);

      return request<WorkItem[]>(`/work-items?${params.toString()}`);
    },
    getById: (id: string) => request<WorkItem>(`/work-items/${id}`),
    create: (data: Partial<WorkItem> & { project_id: string; title: string }) =>
      request<WorkItem>('/work-items', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<WorkItem>) =>
      request<WorkItem>(`/work-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    updateStatus: (id: string, status: WorkItemStatus, sort_order?: number) =>
      request<WorkItem>(`/work-items/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, sort_order })
      }),
    reorder: (projectId: string, items: { id: string; sort_order: number; status?: WorkItemStatus }[]) =>
      request<{ success: boolean; message: string }>('/work-items/reorder', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, items })
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/work-items/${id}`, {
        method: 'DELETE'
      }),
    bulkUpdate: (projectId: string, itemIds: string[], updates: Partial<WorkItem>) =>
      request<{ updatedCount: number }>('/work-items/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, item_ids: itemIds, updates })
      }),
    // Checklists
    addChecklist: (workItemId: string, text: string) =>
      request<ChecklistItem>(`/work-items/${workItemId}/checklists`, {
        method: 'POST',
        body: JSON.stringify({ text })
      }),
    toggleChecklist: (chkId: string) =>
      request<ChecklistItem>(`/work-items/checklists/${chkId}/toggle`, {
        method: 'PATCH'
      }),
    deleteChecklist: (chkId: string) =>
      request<{ success: boolean }>(`/work-items/checklists/${chkId}`, {
        method: 'DELETE'
      }),
    // Dependencies
    addDependency: (workItemId: string, depends_on_id: string, type: 'blocks' | 'is_blocked_by' | 'relates_to') =>
      request<WorkItemDependency>(`/work-items/${workItemId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ depends_on_id, type })
      }),
    deleteDependency: (depId: string) =>
      request<{ success: boolean }>(`/work-items/dependencies/${depId}`, {
        method: 'DELETE'
      }),
    // Watchers
    toggleWatch: (workItemId: string) =>
      request<{ watching: boolean }>(`/work-items/${workItemId}/watch`, {
        method: 'POST'
      })
  },

  // Comments
  comments: {
    get: (workItemId: string) => request<Comment[]>(`/comments?work_item_id=${workItemId}`),
    create: (workItemId: string, text: string) =>
      request<Comment>('/comments', {
        method: 'POST',
        body: JSON.stringify({ work_item_id: workItemId, text })
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/comments/${id}`, {
        method: 'DELETE'
      })
  },

  // Notifications
  notifications: {
    getAll: () => request<Notification[]>('/notifications'),
    markAsRead: (id: string) =>
      request<{ success: boolean }>(`/notifications/${id}/read`, {
        method: 'PATCH'
      }),
    markAllAsRead: () =>
      request<{ success: boolean; count: number }>('/notifications/mark-all-read', {
        method: 'POST'
      })
  },

  // Time Tracking
  timeTracking: {
    getActiveTimer: () => request<ActiveTimer | null>('/time-tracking/timer'),
    startTimer: (projectId: string, workItemId?: string | null, description?: string) =>
      request<ActiveTimer>('/time-tracking/timer/start', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, work_item_id: workItemId, description })
      }),
    stopTimer: () =>
      request<{ entry: TimeEntry; durationMinutes: number }>('/time-tracking/timer/stop', {
        method: 'POST'
      }),
    getEntries: (
      projectId: string,
      filters?: { userId?: string; workItemId?: string; startDate?: string; endDate?: string }
    ) => {
      const params = new URLSearchParams({ project_id: projectId });
      if (filters?.userId) params.append('user_id', filters.userId);
      if (filters?.workItemId) params.append('work_item_id', filters.workItemId);
      if (filters?.startDate) params.append('start_date', filters.startDate);
      if (filters?.endDate) params.append('end_date', filters.endDate);
      return request<TimeEntry[]>(`/time-tracking?${params.toString()}`);
    },
    createEntry: (data: {
      project_id: string;
      work_item_id?: string | null;
      date?: string;
      duration_minutes: number;
      description?: string;
    }) =>
      request<TimeEntry>('/time-tracking', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteEntry: (id: string) =>
      request<{ success: boolean }>(`/time-tracking/${id}`, {
        method: 'DELETE'
      })
  },

  // Budgets & Finance
  finance: {
    getBudget: (projectId: string) => request<ProjectBudget>(`/finance/budget?project_id=${projectId}`),
    updateBudget: (data: { project_id: string; total_budget?: number; currency?: string; hourly_rate?: number }) =>
      request<ProjectBudget>('/finance/budget', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    getExpenses: (projectId: string) => request<Expense[]>(`/finance/expenses?project_id=${projectId}`),
    createExpense: (data: {
      project_id: string;
      amount: number;
      currency?: string;
      category?: string;
      description?: string;
      date?: string;
      receipt_url?: string | null;
    }) =>
      request<Expense>('/finance/expenses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateExpenseStatus: (id: string, status: 'approved' | 'rejected') =>
      request<Expense>(`/finance/expenses/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    getSummary: (projectId: string) => request<FinancialSummary>(`/finance/summary?project_id=${projectId}`)
  },

  // QA & Test Management
  qa: {
    getSuites: (projectId: string) => request<TestSuite[]>(`/qa/suites?project_id=${projectId}`),
    createSuite: (project_id: string, title: string, description?: string) =>
      request<TestSuite>('/qa/suites', {
        method: 'POST',
        body: JSON.stringify({ project_id, title, description })
      }),
    getCases: (projectId: string, suiteId?: string) => {
      const params = new URLSearchParams({ project_id: projectId });
      if (suiteId) params.append('suite_id', suiteId);
      return request<TestCase[]>(`/qa/cases?${params.toString()}`);
    },
    createCase: (data: {
      project_id: string;
      suite_id: string;
      title: string;
      description?: string;
      preconditions?: string;
      steps?: string;
      expected_result?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }) =>
      request<TestCase>('/qa/cases', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getRuns: (projectId: string) => request<TestRun[]>(`/qa/runs?project_id=${projectId}`),
    createRun: (project_id: string, title: string) =>
      request<TestRun>('/qa/runs', {
        method: 'POST',
        body: JSON.stringify({ project_id, title })
      }),
    getExecutions: (testRunId: string) => request<TestExecution[]>(`/qa/executions?test_run_id=${testRunId}`),
    recordExecution: (data: {
      test_run_id: string;
      test_case_id: string;
      status: 'pass' | 'fail' | 'blocked' | 'not_run';
      actual_result?: string;
      create_defect?: { title?: string; priority?: any; description?: string };
    }) =>
      request<TestExecution>('/qa/execute', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getMetrics: (projectId: string) => request<QAMetrics>(`/qa/metrics?project_id=${projectId}`)
  },

  // Risks
  risks: {
    getAll: (projectId: string) => request<ProjectRisk[]>(`/risks?project_id=${projectId}`),
    create: (data: {
      project_id: string;
      title: string;
      description?: string;
      category?: string;
      probability: number;
      impact: number;
      mitigation_plan?: string;
      contingency_plan?: string;
      status?: 'identified' | 'mitigated' | 'accepted' | 'closed';
      owner_id?: string | null;
      review_date?: string | null;
    }) =>
      request<ProjectRisk>('/risks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, updates: Partial<ProjectRisk>) =>
      request<ProjectRisk>(`/risks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/risks/${id}`, {
        method: 'DELETE'
      })
  },

  // Releases
  releases: {
    getAll: (projectId: string) => request<ProjectRelease[]>(`/releases?project_id=${projectId}`),
    create: (data: {
      project_id: string;
      name?: string;
      version?: string;
      version_name?: string;
      description?: string;
      target_date?: string;
      status?: 'planned' | 'in_progress' | 'released' | 'cancelled';
      work_item_ids?: string[];
      git_tag?: string;
      release_notes?: string;
    }) =>
      request<ProjectRelease>('/releases', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, updates: Partial<ProjectRelease>) =>
      request<ProjectRelease>(`/releases/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/releases/${id}`, {
        method: 'DELETE'
      }),
    generateChangelog: (id: string) =>
      request<ProjectRelease>(`/releases/${id}/generate-changelog`, {
        method: 'POST'
      }),
    publish: (id: string) =>
      request<ProjectRelease>(`/releases/${id}/publish`, {
        method: 'POST'
      })
  },

  // Integrations (DevOps, GitHub, GitLab, CI/CD)
  integrations: {
    getGithubStatus: (projectId: string) =>
      request<{
        configured: boolean;
        status: IntegrationStatus;
        repo_owner?: string;
        repo_name?: string;
        masked_token?: string;
        webhook_url: string;
        last_synced_at?: string;
        last_error?: string;
      }>(`/integrations/github/status?project_id=${projectId}`),
    saveGithubConfig: (data: {
      project_id: string;
      repo_owner: string;
      repo_name: string;
      access_token?: string;
      webhook_secret?: string;
    }) =>
      request<{ success: boolean; message: string; config: any }>('/integrations/github/config', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    testGithubConnection: (projectId: string) =>
      request<{ success: boolean; status: string; repository?: any; message?: string }>('/integrations/github/test-connection', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      }),
    disconnectGithub: (projectId: string) =>
      request<{ success: boolean; message: string }>(`/integrations/github/disconnect?project_id=${projectId}`, {
        method: 'DELETE'
      }),

    getGitlabStatus: (projectId: string) =>
      request<{
        configured: boolean;
        status: IntegrationStatus;
        repo_owner?: string;
        repo_name?: string;
        api_url?: string;
        masked_token?: string;
        webhook_url: string;
        last_synced_at?: string;
        last_error?: string;
      }>(`/integrations/gitlab/status?project_id=${projectId}`),
    saveGitlabConfig: (data: {
      project_id: string;
      repo_owner?: string;
      repo_name: string;
      access_token?: string;
      webhook_secret?: string;
      api_url?: string;
    }) =>
      request<{ success: boolean; message: string; config: any }>('/integrations/gitlab/config', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    testGitlabConnection: (projectId: string) =>
      request<{ success: boolean; status: string; repository?: any; message?: string }>('/integrations/gitlab/test-connection', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId })
      }),
    disconnectGitlab: (projectId: string) =>
      request<{ success: boolean; message: string }>(`/integrations/gitlab/disconnect?project_id=${projectId}`, {
        method: 'DELETE'
      }),

    getPipelineRuns: (projectId: string) =>
      request<PipelineExecution[]>(`/integrations/cicd/runs?project_id=${projectId}`),
    triggerPipeline: (data: { project_id: string; branch?: string; pipeline_name?: string }) =>
      request<PipelineExecution>('/integrations/cicd/trigger', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    getGitLinks: (projectId?: string, workItemId?: string) => {
      const q = workItemId ? `work_item_id=${workItemId}` : `project_id=${projectId}`;
      return request<GitIntegrationLink[]>(`/integrations/links?${q}`);
    },
    createGitLink: (data: {
      project_id: string;
      work_item_id?: string;
      provider?: 'github' | 'gitlab';
      link_type?: GitLinkType;
      external_id: string;
      title: string;
      url: string;
      status?: string;
    }) =>
      request<GitIntegrationLink>('/integrations/links', {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  // Team Discussions & Chat
  discussions: {
    getAll: (workspaceId: string, channelId?: string, channelType?: string) => {
      let url = `/discussions?workspace_id=${workspaceId}`;
      if (channelId) url += `&channel_id=${channelId}`;
      if (channelType) url += `&channel_type=${channelType}`;
      return request<DiscussionMessage[]>(url);
    },
    create: (data: {
      workspace_id: string;
      project_id?: string;
      channel_type?: 'project' | 'work_item' | 'team';
      channel_id: string;
      content: string;
    }) =>
      request<DiscussionMessage>('/discussions', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, content: string) =>
      request<DiscussionMessage>(`/discussions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/discussions/${id}`, {
        method: 'DELETE'
      })
  },

  // Retrospectives
  retrospectives: {
    getAll: (projectId: string, sprintId?: string) => {
      let url = `/retrospectives?project_id=${projectId}`;
      if (sprintId) url += `&sprint_id=${sprintId}`;
      return request<SprintRetrospective[]>(url);
    },
    getById: (id: string) =>
      request<SprintRetrospective & { items: RetrospectiveItem[] }>(`/retrospectives/${id}`),
    create: (data: { project_id: string; sprint_id: string; title: string }) =>
      request<SprintRetrospective>('/retrospectives', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, updates: Partial<SprintRetrospective>) =>
      request<SprintRetrospective>(`/retrospectives/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      }),
    addItem: (
      retroId: string,
      data: { category: RetrospectiveCategory; content: string; action_assignee_id?: string }
    ) =>
      request<RetrospectiveItem>(`/retrospectives/${retroId}/items`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    voteItem: (itemId: string) =>
      request<RetrospectiveItem>(`/retrospectives/items/${itemId}/vote`, {
        method: 'POST'
      }),
    updateItem: (itemId: string, updates: Partial<RetrospectiveItem>) =>
      request<RetrospectiveItem>(`/retrospectives/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    deleteItem: (itemId: string) =>
      request<{ success: boolean }>(`/retrospectives/items/${itemId}`, {
        method: 'DELETE'
      }),
    convertToWorkItem: (itemId: string, data?: { type?: 'task' | 'story'; priority?: string }) =>
      request<{ success: boolean; message: string; work_item: WorkItem; retrospective_item: RetrospectiveItem }>(
        `/retrospectives/items/${itemId}/convert-to-work-item`,
        {
          method: 'POST',
          body: JSON.stringify(data || {})
        }
      )
  },

  // OKRs
  okrs: {
    getAll: (projectId: string) => request<Objective[]>(`/okrs?project_id=${projectId}`),
    create: (data: {
      project_id: string;
      title: string;
      description?: string;
      category?: string;
      status?: 'on_track' | 'at_risk' | 'behind' | 'completed';
      start_date?: string;
      due_date?: string;
      owner_id?: string;
    }) =>
      request<Objective>('/okrs', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    addKeyResult: (objectiveId: string, data: { title: string; target_value: number; current_value?: number; unit?: string }) =>
      request<KeyResult>(`/okrs/${objectiveId}/key-results`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateKeyResult: (id: string, current_value: number) =>
      request<KeyResult>(`/okrs/key-results/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ current_value })
      })
  },

  // Reports
  reports: {
    getData: (projectId: string) => request<any>(`/reports/data?project_id=${projectId}`),
    getActivity: (projectId: string) => request<any[]>(`/reports/activity?project_id=${projectId}`)
  },

  // Automation
  automation: {
    getRules: (projectId: string) => request<AutomationRule[]>(`/automation/rules?project_id=${projectId}`),
    createRule: (data: {
      project_id: string;
      name: string;
      description?: string;
      trigger: string;
      condition?: any;
      action: any;
    }) =>
      request<AutomationRule>('/automation/rules', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    toggleRule: (id: string) =>
      request<AutomationRule>(`/automation/rules/${id}/toggle`, {
        method: 'PATCH'
      })
  },

  // Customization & Views & CSV
  customization: {
    getStatuses: (projectId: string) => request<WorkflowStatus[]>(`/customization/statuses?project_id=${projectId}`),
    createStatus: (data: {
      project_id: string;
      name: string;
      category: 'todo' | 'in_progress' | 'qa' | 'done';
      color?: string;
      wip_limit?: number | null;
      sort_order?: number;
      is_done_state?: boolean;
    }) =>
      request<WorkflowStatus>('/customization/statuses', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    updateStatus: (id: string, updates: Partial<WorkflowStatus>) =>
      request<WorkflowStatus>(`/customization/statuses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    getViews: (projectId: string) => request<SavedView[]>(`/customization/views?project_id=${projectId}`),
    createView: (data: {
      project_id: string;
      name: string;
      is_shared?: boolean;
      grouping?: 'none' | 'assignee' | 'priority' | 'epic';
      filters?: any;
    }) =>
      request<SavedView>('/customization/views', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    deleteView: (id: string) =>
      request<{ success: boolean }>(`/customization/views/${id}`, {
        method: 'DELETE'
      }),
    getFields: (projectId: string) => request<CustomFieldDefinition[]>(`/customization/fields?project_id=${projectId}`),
    createField: (data: {
      project_id: string;
      name: string;
      field_type: 'text' | 'number' | 'date' | 'checkbox' | 'select';
      options?: string[];
      required?: boolean;
    }) =>
      request<CustomFieldDefinition>('/customization/fields', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getTemplates: (projectId: string) => request<WorkItemTemplate[]>(`/customization/templates?project_id=${projectId}`),
    createTemplate: (data: {
      project_id: string;
      name: string;
      type: any;
      default_title?: string;
      default_description?: string;
      default_labels?: string[];
      default_checklist?: string[];
    }) =>
      request<WorkItemTemplate>('/customization/templates', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    getExportCsvUrl: (projectId: string) => `${API_BASE_URL}/customization/export/work-items?project_id=${projectId}`,
    importWorkItems: (projectId: string, rows: any[], preview?: boolean) =>
      request<{ preview?: boolean; total_rows?: number; valid_count?: number; error_count?: number; errors: any[]; sample_valid?: any[]; success?: boolean; imported_count?: number }>(
        '/customization/import/work-items',
        {
          method: 'POST',
          body: JSON.stringify({ project_id: projectId, rows, preview })
        }
      )
  },

  // Dashboard
  dashboard: {
    getMetrics: (projectId: string) =>
      request<{ metrics: DashboardMetrics; mode: 'cloud' | 'local' }>(`/dashboard/metrics?project_id=${projectId}`),
    getActivity: (projectId: string) => request<any[]>(`/dashboard/activity?project_id=${projectId}`)
  },

  // Team
  team: {
    getPermissionsMatrix: () => request<RolePermissionMatrix[]>('/team/permissions-matrix'),
    getMembers: (projectId: string) => request<ProjectMember[]>(`/team/members?project_id=${projectId}`)
  },

  // Health
  health: () => request<{ status: string; service: string; mode: string }>('/health')
};
