import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListTodo,
  Zap,
  Kanban,
  TableProperties,
  Target,
  Users,
  Clock,
  CircleDollarSign,
  Compass,
  TestTubes,
  ShieldAlert,
  GitBranch,
  BarChart3,
  Bot,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  FolderGit2
} from 'lucide-react';

interface NavGroup {
  section: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    section: 'Agile Delivery',
    items: [
      { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
      { label: 'Product Backlog', path: '/app/backlog', icon: ListTodo },
      { label: 'Sprint Planning', path: '/app/sprints', icon: Zap },
      { label: 'Kanban Board', path: '/app/board', icon: Kanban },
      { label: 'List View', path: '/app/list', icon: TableProperties },
      { label: 'Epics & Vision', path: '/app/epics', icon: Target },
      { label: 'Retrospectives', path: '/app/retrospectives', icon: Sparkles },
    ]
  },
  {
    section: 'Collaboration & Finance',
    items: [
      { label: 'Team & Invites', path: '/app/team', icon: Users },
      { label: 'Team Discussions', path: '/app/discussions', icon: MessageSquare },
      { label: 'Time & Timesheets', path: '/app/time-tracking', icon: Clock },
      { label: 'Budgets & Expenses', path: '/app/finance', icon: CircleDollarSign },
      { label: 'OKRs & Goals', path: '/app/okrs', icon: Compass },
    ]
  },
  {
    section: 'Quality & Governance',
    items: [
      { label: 'QA & Test Manager', path: '/app/qa', icon: TestTubes },
      { label: 'Risk Register', path: '/app/risks', icon: ShieldAlert },
      { label: 'Releases', path: '/app/releases', icon: GitBranch },
      { label: 'Reports & Analytics', path: '/app/reports', icon: BarChart3 },
    ]
  },
  {
    section: 'System & Automation',
    items: [
      { label: 'DevOps & Integrations', path: '/app/integrations', icon: FolderGit2 },
      { label: 'Automation Rules', path: '/app/automation', icon: Bot },
      { label: 'CSV Import / Export', path: '/app/csv', icon: FileSpreadsheet },
    ]
  }
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 flex-shrink-0 hidden md:block">
      <div className="sticky top-20 p-4 space-y-4 max-h-[calc(100vh-5.5rem)] overflow-y-auto pr-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="glass-panel rounded-3xl p-3 shadow-soft space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-emerald-900/60 uppercase">
              {group.section}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-700 hover:bg-emerald-950/5 hover:text-zinc-950'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 stroke-[2]" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
};
