import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import { DashboardMetrics, WorkItem } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Zap,
  ListTodo,
  Calendar,
  Activity,
  ArrowRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { WorkItemDetailModal } from '../components/modals/WorkItemDetailModal';

export const DashboardPage: React.FC = () => {
  const { currentProject } = useProject();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const res = await api.dashboard.getMetrics(currentProject.id);
      setMetrics(res.metrics);
    } catch (err) {
      console.error('[Dashboard] Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentProject, outletContext?.refreshTrigger]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-800 border-t-transparent" />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center">
        <h2 className="text-base font-bold text-zinc-900 mb-2">No Project Selected</h2>
        <p className="text-xs text-zinc-500 mb-4">Please select or create an Agile project to view metrics.</p>
      </div>
    );
  }

  const completionRate =
    metrics && metrics.total_work_items > 0
      ? Math.round((metrics.completed_work_items / metrics.total_work_items) * 100)
      : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              {currentProject.project_key}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              {currentProject.name} Dashboard
            </h1>
          </div>
          <p className="text-xs text-zinc-500 max-w-xl">
            {currentProject.description || 'Sprint progress, velocity distribution, and active backlog deliverables.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/app/board" className="btn-pill-outline text-xs flex items-center gap-1.5">
            <span>Open Board</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => outletContext?.onOpenCreateItemModal()}
            className="btn-pill-primary text-xs"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Items */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-950/10 shadow-soft">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium mb-1">
            <span>Total Items</span>
            <ListTodo className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-sans">
            {metrics?.total_work_items ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Across all sprints & backlog</div>
        </div>

        {/* Completed Work */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-950/10 shadow-soft">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium mb-1">
            <span>Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-sans">
            {metrics?.completed_work_items ?? 0}
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">{completionRate}% of scope completed</div>
        </div>

        {/* In Progress */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-950/10 shadow-soft">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium mb-1">
            <span>In Progress</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-sans">
            {metrics?.in_progress_work_items ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Currently being developed</div>
        </div>

        {/* QA Review */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-950/10 shadow-soft">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium mb-1">
            <span>QA Verification</span>
            <Target className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-sans">
            {metrics?.qa_work_items ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Ready for testing</div>
        </div>

        {/* Overdue */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-950/10 shadow-soft">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-medium mb-1">
            <span>Overdue Work</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className={`text-2xl font-bold font-sans ${metrics && metrics.overdue_work_items > 0 ? 'text-amber-700' : 'text-zinc-900'}`}>
            {metrics?.overdue_work_items ?? 0}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">Past due dates</div>
        </div>
      </div>

      {/* Middle Row: Active Sprint Banner & Workload Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Sprint Spotlight */}
        <div className="lg:col-span-2 glass-panel-elevated rounded-3xl p-6 border border-emerald-950/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                  Active Sprint
                </span>
                <h3 className="text-base font-bold text-zinc-900 font-sans">
                  {metrics?.active_sprint?.name || 'No Sprint Currently Active'}
                </h3>
              </div>
            </div>

            {metrics?.active_sprint && (
              <Link
                to="/app/sprints"
                className="text-xs font-bold text-emerald-900 hover:underline flex items-center gap-1"
              >
                <span>Sprint Details</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {metrics?.active_sprint ? (
            <div className="space-y-4">
              <p className="text-xs text-zinc-600 leading-relaxed">
                <span className="font-semibold text-zinc-800">Sprint Goal: </span>
                {metrics.active_sprint.goal || 'No goal configured for this sprint.'}
              </p>

              {/* Progress Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-700">
                  <span>Sprint Completion</span>
                  <span>{metrics.sprint_progress_percentage}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden border border-emerald-950/5">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.sprint_progress_percentage}%` }}
                  />
                </div>
              </div>

              {/* Sprint Stats Row */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/70 border border-emerald-950/10 text-center">
                  <div className="text-[11px] text-zinc-500">Total Tasks</div>
                  <div className="text-base font-bold text-zinc-900">
                    {metrics.active_sprint.work_items_count || 0}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/70 border border-emerald-950/10 text-center">
                  <div className="text-[11px] text-zinc-500">Done Tasks</div>
                  <div className="text-base font-bold text-emerald-800">
                    {metrics.active_sprint.completed_items_count || 0}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white/70 border border-emerald-950/10 text-center">
                  <div className="text-[11px] text-zinc-500">Capacity</div>
                  <div className="text-base font-bold text-zinc-900">
                    {metrics.active_sprint.capacity_points ? `${metrics.active_sprint.capacity_points} pts` : 'Flexible'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-zinc-500">
              <p className="mb-3">Start an active sprint to track team velocity and burndown progress.</p>
              <Link to="/app/sprints" className="btn-pill-primary text-xs">
                Plan a Sprint
              </Link>
            </div>
          )}
        </div>

        {/* Breakdown by Type & Priority */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>Scope Breakdown</span>
            </h3>

            {/* Type Breakdown */}
            <div className="space-y-2 mb-5">
              <div className="text-[11px] font-semibold text-zinc-600">By Work Item Type</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-950/10">
                  <span className="capitalize text-zinc-700">Stories</span>
                  <span className="font-bold text-zinc-900">{metrics?.type_distribution?.story || 0}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-950/10">
                  <span className="capitalize text-zinc-700">Tasks</span>
                  <span className="font-bold text-zinc-900">{metrics?.type_distribution?.task || 0}</span>
                </div>
                <div className="flex-1 flex items-center justify-between p-2 rounded-xl bg-white/80 border border-emerald-950/10">
                  <span className="capitalize text-zinc-700">Bugs</span>
                  <span className="font-bold text-zinc-900">{metrics?.type_distribution?.bug || 0}</span>
                </div>
              </div>
            </div>

            {/* Priority Breakdown */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-600">By Priority</div>
              <div className="space-y-1.5">
                {[
                  { label: 'Critical', count: metrics?.priority_distribution?.critical || 0, color: 'bg-red-500' },
                  { label: 'High', count: metrics?.priority_distribution?.high || 0, color: 'bg-amber-500' },
                  { label: 'Medium', count: metrics?.priority_distribution?.medium || 0, color: 'bg-blue-500' },
                  { label: 'Low', count: metrics?.priority_distribution?.low || 0, color: 'bg-zinc-400' },
                ].map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${p.color}`} />
                      <span className="text-zinc-600">{p.label}</span>
                    </div>
                    <span className="font-bold text-zinc-800">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Deadlines & Recent Project Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 font-sans flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>Upcoming Deadlines</span>
            </h3>
            <Link to="/app/list" className="text-xs font-semibold text-emerald-900 hover:underline">
              View All
            </Link>
          </div>

          {metrics?.upcoming_deadlines && metrics.upcoming_deadlines.length > 0 ? (
            <div className="space-y-2">
              {metrics.upcoming_deadlines.map((item: WorkItem) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/70 hover:bg-white border border-emerald-950/10 cursor-pointer transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
                      {item.item_key}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800 truncate group-hover:text-emerald-900">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-zinc-500">
                    <span className="text-[11px] font-medium">
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400">
              No upcoming deadlines configured for active items.
            </div>
          )}
        </div>

        {/* Recent Project Activity Log */}
        <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 font-sans flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-700" />
              <span>Recent Activity Feed</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint-100 text-emerald-900 font-bold">
              Audit Trail
            </span>
          </div>

          {metrics?.recent_activity && metrics.recent_activity.length > 0 ? (
            <div className="space-y-3">
              {metrics.recent_activity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 leading-snug">
                    <span className="font-semibold text-zinc-800">
                      {act.user?.display_name || 'Team member'}
                    </span>{' '}
                    <span className="text-zinc-600">{act.details}</span>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-zinc-400">
              No recent activity recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      <WorkItemDetailModal
        itemId={selectedItemId}
        isOpen={selectedItemId !== null}
        onClose={() => setSelectedItemId(null)}
        onItemUpdated={() => fetchMetrics()}
        onItemDeleted={() => fetchMetrics()}
      />
    </div>
  );
};
