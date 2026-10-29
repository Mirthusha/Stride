-- ==============================================================================
-- STRIDE - PART 1: CORE AGILE PLATFORM SCHEMA & ROW LEVEL SECURITY
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster', 'Developer');
CREATE TYPE membership_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'completed', 'archived');
CREATE TYPE epic_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE work_item_type AS ENUM ('task', 'story', 'bug');
CREATE TYPE work_item_status AS ENUM ('todo', 'in_progress', 'qa', 'done');
CREATE TYPE work_item_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE sprint_status AS ENUM ('planning', 'active', 'completed');

-- 3. USER PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'Developer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. WORKSPACES
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. WORKSPACE MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.workspace_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'Developer',
  membership_status membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_workspace_user UNIQUE (workspace_id, user_id)
);

-- 6. PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  project_key VARCHAR(10) NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
  status project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_project_key_per_workspace UNIQUE (workspace_id, project_key)
);

-- 7. PROJECT MEMBERSHIPS
CREATE TABLE IF NOT EXISTS public.project_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'Developer',
  membership_status membership_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- 8. EPICS
CREATE TABLE IF NOT EXISTS public.epics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status epic_status NOT NULL DEFAULT 'todo',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SPRINTS
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status sprint_status NOT NULL DEFAULT 'planning',
  capacity_points INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sprint_dates CHECK (end_date >= start_date)
);

-- Partial index to enforce only one active sprint per project if configured
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_sprint_per_project 
ON public.sprints (project_id) 
WHERE status = 'active';

-- 10. WORK ITEMS (Tasks, User Stories, Bugs)
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.work_items(id) ON DELETE SET NULL,
  item_key VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type work_item_type NOT NULL DEFAULT 'task',
  status work_item_status NOT NULL DEFAULT 'todo',
  priority work_item_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  story_points NUMERIC(5, 1) DEFAULT NULL,
  start_date DATE,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  labels TEXT[] NOT NULL DEFAULT '{}',
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_item_key_per_project UNIQUE (project_id, item_key)
);

-- 11. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_work_items_project ON public.work_items (project_id);
CREATE INDEX IF NOT EXISTS idx_work_items_sprint ON public.work_items (sprint_id);
CREATE INDEX IF NOT EXISTS idx_work_items_epic ON public.work_items (epic_id);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON public.work_items (status);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON public.work_items (assignee_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints (project_id);
CREATE INDEX IF NOT EXISTS idx_epics_project ON public.epics (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON public.activity_logs (project_id, created_at DESC);

-- 13. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'workspaces', 'projects', 'epics', 'sprints', 'work_items')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- 14. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read all active profiles in their workspaces; users can update their own profile
CREATE POLICY "Profiles readable by authenticated users" 
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Workspaces: Members can select; Owner & WorkspaceAdmin can insert/update/delete
CREATE POLICY "Workspaces select for members" 
ON public.workspaces FOR SELECT TO authenticated 
USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.workspace_memberships WHERE workspace_id = workspaces.id AND user_id = auth.uid())
);

CREATE POLICY "Workspaces insert by authenticated" 
ON public.workspaces FOR INSERT TO authenticated 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspaces update by owner/admin" 
ON public.workspaces FOR UPDATE TO authenticated 
USING (
  owner_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.workspace_memberships WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'WorkspaceAdmin')
);

-- Projects: Members can select; WorkspaceAdmins and ProductOwners can create/modify
CREATE POLICY "Projects select for workspace members" 
ON public.projects FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.workspace_memberships WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
);

CREATE POLICY "Projects insert by admins and owners" 
ON public.projects FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_memberships WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('WorkspaceAdmin', 'ProductOwner'))
);

CREATE POLICY "Projects update by admins and owners" 
ON public.projects FOR UPDATE TO authenticated 
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.workspace_memberships WHERE workspace_id = projects.workspace_id AND user_id = auth.uid() AND role IN ('WorkspaceAdmin', 'ProductOwner'))
);

-- Work Items, Sprints, Epics: Readable and writable by authorized project members
CREATE POLICY "Work items select for project members" 
ON public.work_items FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = work_items.project_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Work items insert/update for project members" 
ON public.work_items FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = work_items.project_id AND wm.user_id = auth.uid())
);

-- Sprints RLS
CREATE POLICY "Sprints select for project members" 
ON public.sprints FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = sprints.project_id AND wm.user_id = auth.uid())
);

CREATE POLICY "Sprints manage by ScrumMaster/ProductOwner/Admin" 
ON public.sprints FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = sprints.project_id AND wm.user_id = auth.uid() 
            AND wm.role IN ('WorkspaceAdmin', 'ProductOwner', 'ScrumMaster'))
);

-- Epics RLS
CREATE POLICY "Epics manage by project members" 
ON public.epics FOR ALL TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.projects p 
          JOIN public.workspace_memberships wm ON wm.workspace_id = p.workspace_id 
          WHERE p.id = epics.project_id AND wm.user_id = auth.uid())
);
