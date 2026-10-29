-- ==============================================================================
-- STRIDE - PART 2: COLLABORATION, ADVANCED AGILE, QA, GOVERNANCE & AUTOMATION
-- ==============================================================================

-- 1. WORKSPACE INVITATIONS
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'Developer',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  CONSTRAINT unique_workspace_invitation UNIQUE (workspace_id, email)
);

-- 2. COMMENTS & DISCUSSIONS
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  entity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CHECKLISTS & SUBTASKS
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WORK ITEM WATCHERS
CREATE TABLE IF NOT EXISTS public.work_item_watchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_work_item_watcher UNIQUE (work_item_id, user_id)
);

-- 6. WORK ITEM DEPENDENCIES (blocks, is_blocked_by, relates_to)
CREATE TABLE IF NOT EXISTS public.work_item_dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL DEFAULT 'blocks',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_dependency CHECK (work_item_id <> depends_on_id),
  CONSTRAINT unique_dependency UNIQUE (work_item_id, depends_on_id, type)
);

-- 7. CONFIGURABLE WORKFLOW STATUSES & WIP LIMITS
CREATE TABLE IF NOT EXISTS public.workflow_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'todo', -- todo, in_progress, qa, done
  color VARCHAR(30) NOT NULL DEFAULT '#65cb8f',
  wip_limit INTEGER DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done_state BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SAVED VIEWS & FILTER PRESETS
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  grouping VARCHAR(30) NOT NULL DEFAULT 'none',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. OKRs & GOALS
CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'on_track',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.key_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC(12, 2) NOT NULL DEFAULT 100,
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL DEFAULT '%',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. TIME TRACKING & TIMERS
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.active_timers (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT DEFAULT ''
);

-- 11. BUDGETS & EXPENSES
CREATE TABLE IF NOT EXISTS public.project_budgets (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  total_budget NUMERIC(14, 2) NOT NULL DEFAULT 50000.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 75.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  category VARCHAR(50) NOT NULL DEFAULT 'Software & Tools',
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. QA AND TEST MANAGEMENT
CREATE TABLE IF NOT EXISTS public.test_suites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suite_id UUID NOT NULL REFERENCES public.test_suites(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  preconditions TEXT DEFAULT '',
  steps TEXT NOT NULL,
  expected_result TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.test_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_case_id UUID NOT NULL REFERENCES public.test_cases(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'not_run', -- pass, fail, blocked, not_run
  actual_result TEXT DEFAULT '',
  defect_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  executed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. RISK REGISTER
CREATE TABLE IF NOT EXISTS public.project_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'Technical',
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  severity_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mitigation_plan TEXT DEFAULT '',
  contingency_plan TEXT DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'identified', -- identified, mitigated, accepted, closed
  review_date DATE DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. RELEASE MANAGEMENT
CREATE TABLE IF NOT EXISTS public.project_releases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version VARCHAR(30) NOT NULL,
  description TEXT DEFAULT '',
  target_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'planned', -- planned, in_progress, released
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter work_items to optionally reference release
ALTER TABLE public.work_items 
ADD COLUMN IF NOT EXISTS release_id UUID REFERENCES public.project_releases(id) ON DELETE SET NULL;

-- 15. CUSTOM FIELDS & TEMPLATES
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type VARCHAR(30) NOT NULL DEFAULT 'text',
  options TEXT[] DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_item_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type work_item_type NOT NULL DEFAULT 'story',
  default_title TEXT DEFAULT '',
  default_description TEXT DEFAULT '',
  default_labels TEXT[] DEFAULT '{}',
  default_checklist TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. AUTOMATION RULES & LOGS
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger VARCHAR(50) NOT NULL,
  condition JSONB DEFAULT '{}'::jsonb,
  action JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT TRUE
);

-- 17. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Notifications Policy: Recipient only
CREATE POLICY "Users read own notifications" 
ON public.notifications FOR SELECT TO authenticated 
USING (recipient_id = auth.uid());

CREATE POLICY "Users update own notifications" 
ON public.notifications FOR UPDATE TO authenticated 
USING (recipient_id = auth.uid());

-- Time entries: project members can read, creators or admins can update/delete
CREATE POLICY "Time entries readable by project members" 
ON public.time_entries FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = time_entries.project_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Time entries modify by owner" 
ON public.time_entries FOR ALL TO authenticated 
USING (user_id = auth.uid());

-- Comments: project members can select; author can edit
CREATE POLICY "Comments select by project members" 
ON public.comments FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.work_items wi
          JOIN public.projects p ON p.id = wi.project_id
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE wi.id = comments.work_item_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Comments insert by project members" 
ON public.comments FOR INSERT TO authenticated 
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Comments update by author" 
ON public.comments FOR UPDATE TO authenticated 
USING (author_id = auth.uid());
