// ==============================================================================
// STRIDE - DOMAIN TYPES & CONTRACTS (PART 1 + PART 2)
// ==============================================================================

export type UserRole = 'WorkspaceAdmin' | 'ProductOwner' | 'ScrumMaster' | 'Developer';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export type MembershipStatus = 'active' | 'invited' | 'suspended';

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  membership_status: MembershipStatus;
  joined_at: string;
  user?: UserProfile;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  expires_at: string;
  workspace?: Workspace;
}

export type ProjectStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  project_key: string;
  owner_id: string;
  start_date: string;
  target_date: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  membership_status: MembershipStatus;
  created_at: string;
  user?: UserProfile;
}

export type EpicStatus = 'todo' | 'in_progress' | 'done';

export interface Epic {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: EpicStatus;
  owner_id?: string;
  start_date?: string;
  target_date?: string;
  created_at: string;
  updated_at: string;
  total_items?: number;
  completed_items?: number;
  progress_percentage?: number;
}

export type WorkItemType = 'task' | 'story' | 'bug';
export type WorkItemStatus = 'todo' | 'in_progress' | 'qa' | 'done' | string;
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'critical';

export interface WorkItemDependency {
  id: string;
  work_item_id: string;
  depends_on_id: string;
  type: 'blocks' | 'is_blocked_by' | 'relates_to';
  target_item?: WorkItem;
}

export interface ChecklistItem {
  id: string;
  work_item_id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface WorkItem {
  id: string;
  project_id: string;
  epic_id: string | null;
  parent_id: string | null;
  item_key: string;
  title: string;
  description: string;
  type: WorkItemType;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignee_id: string | null;
  reporter_id: string;
  story_points: number | null;
  start_date: string | null;
  due_date: string | null;
  sort_order: number;
  labels: string[];
  sprint_id: string | null;
  release_id?: string | null;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  assignee?: UserProfile;
  reporter?: UserProfile;
  epic?: Epic;
  checklists?: ChecklistItem[];
  dependencies?: WorkItemDependency[];
  watchers?: string[];
}

export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  capacity_points: number | null;
  created_at: string;
  updated_at: string;
  total_points?: number;
  completed_points?: number;
  work_items_count?: number;
  completed_items_count?: number;
  progress_percentage?: number;
}

export interface Comment {
  id: string;
  work_item_id: string;
  author_id: string;
  text: string;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  mentions?: string[];
}

export type NotificationEventType =
  | 'task_assigned'
  | 'mention'
  | 'comment'
  | 'status_change'
  | 'sprint_update'
  | 'invitation'
  | 'test_failed';

export interface Notification {
  id: string;
  recipient_id: string;
  event_type: NotificationEventType;
  entity_type: 'work_item' | 'sprint' | 'comment' | 'workspace' | 'test';
  entity_id: string;
  project_id?: string;
  message: string;
  read: boolean;
  created_at: string;
  entity_data?: any;
}

export interface ActivityLogItem {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  entity_type: 'work_item' | 'sprint' | 'epic' | 'project' | 'workspace' | 'comment' | 'qa' | 'risk' | 'release';
  entity_id: string;
  details: string;
  created_at: string;
  user?: UserProfile;
}

export interface WorkflowStatus {
  id: string;
  project_id: string;
  name: string;
  category: 'todo' | 'in_progress' | 'qa' | 'done';
  color: string;
  wip_limit: number | null;
  sort_order: number;
  is_done_state: boolean;
}

export interface SavedView {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  is_shared: boolean;
  grouping: 'none' | 'assignee' | 'priority' | 'epic';
  filters: {
    status?: string;
    priority?: string;
    type?: string;
    assignee_id?: string;
    sprint_id?: string;
  };
  created_at: string;
}

export interface KeyResult {
  id: string;
  objective_id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
  owner_id?: string;
  progress_percentage?: number;
}

export interface Objective {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category?: string;
  owner_id: string;
  start_date: string;
  due_date: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  created_at: string;
  key_results?: KeyResult[];
  progress_percentage?: number;
}

export interface TimeEntry {
  id: string;
  work_item_id: string | null;
  project_id: string;
  user_id: string;
  date: string;
  duration_minutes: number;
  description: string;
  created_at: string;
  user?: UserProfile;
  work_item?: WorkItem;
}

export interface ActiveTimer {
  user_id: string;
  work_item_id: string | null;
  project_id: string;
  start_time: string;
  description: string;
}

export interface ProjectBudget {
  project_id: string;
  total_budget: number;
  currency: string;
  hourly_rate: number;
}

export interface Expense {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  submitter_id: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string | null;
  created_at: string;
  submitter?: UserProfile;
}

export interface FinancialSummary {
  total_budget: number;
  currency: string;
  hourly_rate: number;
  total_tracked_hours: number;
  total_labor_cost: number;
  total_approved_expenses: number;
  total_pending_expenses: number;
  combined_actual_cost: number;
  remaining_budget: number;
  utilization_percentage: number;
}

export interface TestSuite {
  id: string;
  project_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface TestCase {
  id: string;
  suite_id: string;
  project_id: string;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expected_result: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  suite?: TestSuite;
}

export interface TestRun {
  id: string;
  project_id: string;
  title: string;
  status: 'in_progress' | 'completed';
  created_at: string;
}

export interface TestExecution {
  id: string;
  test_run_id: string;
  test_case_id: string;
  status: 'pass' | 'fail' | 'blocked' | 'not_run';
  actual_result: string;
  defect_id: string | null;
  executed_by: string;
  executed_at: string;
  test_case?: TestCase;
  defect?: WorkItem;
}

export interface QAMetrics {
  total_test_cases: number;
  total_executions: number;
  pass_count: number;
  fail_count: number;
  blocked_count: number;
  not_run_count: number;
  pass_rate_percentage: number;
  open_defects_count: number;
  defects_by_severity: Record<string, number>;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  severity_score: number;
  owner_id: string | null;
  mitigation_plan: string;
  contingency_plan: string;
  status: 'identified' | 'mitigated' | 'accepted' | 'closed';
  review_date: string | null;
  created_at: string;
  owner?: UserProfile;
}

export interface ChangelogItem {
  id: string;
  item_key: string;
  title: string;
  type: WorkItemType;
  priority: string;
}

export interface ChangelogSection {
  title: string;
  items: ChangelogItem[];
}

export interface ProjectRelease {
  id: string;
  project_id: string;
  name: string;
  version: string;
  description: string;
  target_date: string;
  status: 'planned' | 'in_progress' | 'released' | 'cancelled';
  work_item_ids: string[];
  created_at: string;
  release_notes?: string;
  changelog?: ChangelogSection[];
  published_at?: string;
  published_by?: string;
  git_tag?: string;
  work_items?: WorkItem[];
}

// ==============================================================================
// PART 3: ADVANCED INTEGRATIONS, DEVOPS, DISCUSSIONS & RETROSPECTIVES
// ==============================================================================

export type IntegrationProvider = 'github' | 'gitlab' | 'generic_cicd';
export type IntegrationStatus = 'not_configured' | 'connected' | 'disconnected' | 'error' | 'auth_expired';

export interface IntegrationConfig {
  id: string;
  project_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  repo_owner?: string;
  repo_name?: string;
  api_url?: string;
  access_token?: string; // Stored securely on server, masked when returned
  webhook_secret?: string;
  last_synced_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export type GitLinkType = 'commit' | 'branch' | 'pull_request' | 'merge_request' | 'release_tag';

export interface GitIntegrationLink {
  id: string;
  project_id: string;
  provider: 'github' | 'gitlab';
  work_item_id?: string;
  link_type: GitLinkType;
  external_id: string; // Commit SHA, PR #, branch name, tag
  title: string;
  status?: string; // 'open', 'merged', 'closed', etc.
  url: string;
  author: string;
  created_at: string;
}

export interface ProcessedWebhookEvent {
  id: string;
  event_id: string;
  provider: string;
  received_at: string;
}

export interface PipelineExecution {
  id: string;
  project_id: string;
  provider: 'github_actions' | 'gitlab_ci' | 'generic';
  pipeline_id: string;
  pipeline_name: string;
  branch: string;
  commit_sha: string;
  status: 'queued' | 'in_progress' | 'success' | 'failure' | 'cancelled';
  started_at: string;
  finished_at?: string;
  triggered_by: string;
  web_url?: string;
  work_item_ids?: string[];
}

export interface DiscussionMessage {
  id: string;
  workspace_id: string;
  project_id?: string;
  channel_type: 'project' | 'work_item' | 'team';
  channel_id: string;
  user_id: string;
  content: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface SprintRetrospective {
  id: string;
  project_id: string;
  sprint_id: string;
  title: string;
  status: 'active' | 'completed';
  created_at: string;
  sprint_name?: string;
}

export type RetrospectiveCategory = 'went_well' | 'did_not_go_well' | 'improve' | 'action_items';

export interface RetrospectiveItem {
  id: string;
  retrospective_id: string;
  category: RetrospectiveCategory;
  user_id: string;
  content: string;
  votes: number;
  voted_user_ids: string[];
  action_assignee_id?: string;
  action_status?: 'open' | 'in_progress' | 'completed';
  converted_work_item_id?: string;
  created_at: string;
  user?: UserProfile;
  assignee?: UserProfile;
}

export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'checkbox' | 'select';
  options?: string[];
  required: boolean;
}

export interface WorkItemTemplate {
  id: string;
  project_id: string;
  name: string;
  type: WorkItemType;
  default_title: string;
  default_description: string;
  default_labels: string[];
  default_checklist: string[];
}

export interface AutomationRule {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  trigger: 'item_created' | 'status_changed' | 'sprint_completed' | 'test_failed';
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'is_empty';
    value: any;
  };
  action: {
    type: 'assign_to' | 'set_status' | 'add_label' | 'create_notification';
    value: any;
  };
  enabled: boolean;
  execution_count: number;
  last_executed_at?: string;
}

export interface AutomationExecutionLog {
  id: string;
  rule_id: string;
  trigger_event: string;
  action_taken: string;
  timestamp: string;
  success: boolean;
}

export interface DashboardMetrics {
  total_work_items: number;
  completed_work_items: number;
  in_progress_work_items: number;
  todo_work_items: number;
  qa_work_items: number;
  overdue_work_items: number;
  active_sprint: Sprint | null;
  sprint_progress_percentage: number;
  upcoming_deadlines: WorkItem[];
  assigned_to_user: WorkItem[];
  recent_activity: ActivityLogItem[];
  type_distribution: Record<WorkItemType, number>;
  priority_distribution: Record<WorkItemPriority, number>;
}

export interface RolePermissionMatrix {
  role: UserRole;
  title: string;
  description: string;
  canManageWorkspace: boolean;
  canManageMembers: boolean;
  canManageProjects: boolean;
  canPlanBacklog: boolean;
  canManageSprints: boolean;
  canEditAnyWorkItem: boolean;
  canDeleteWorkItem: boolean;
  canConfigureWorkflows: boolean;
}
