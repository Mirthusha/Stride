import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CircleDollarSign,
  TestTubes,
  Activity,
  History,
  Calendar
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { currentProject } = useProject();

  const [reportsData, setReportsData] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [repRes, actRes] = await Promise.all([
        api.reports.getData(currentProject.id),
        api.reports.getActivity(currentProject.id)
      ]);
      setReportsData(repRes);
      setActivityLogs(actRes);
    } catch (err) {
      console.error('[Reports] Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Empirical Metrics (CO5)
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Reports & Continuous Analytics
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Real data-driven velocity trends, team effort allocation, quality assurance metrics, and audit logs.
          </p>
        </div>
      </div>

      {reportsData && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Average Team Velocity
              </div>
              <div className="text-3xl font-extrabold text-emerald-900 mt-1">
                {reportsData.averageVelocity}{' '}
                <span className="text-xs font-semibold text-zinc-500">pts / sprint</span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Calculated across completed sprints</div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                QA Pass Rate
              </div>
              <div className="text-3xl font-bold text-zinc-950 mt-1">
                {reportsData.qa?.pass_rate_percentage || 0}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {reportsData.qa?.pass_count || 0} passed / {reportsData.qa?.total_executions || 0} executions
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Financial Utilization
              </div>
              <div className="text-3xl font-bold text-zinc-900 mt-1">
                {reportsData.finance?.utilization_percentage || 0}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                ${reportsData.finance?.combined_actual_cost?.toLocaleString()} spent of ${reportsData.finance?.total_budget?.toLocaleString()}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Total Deliverables
              </div>
              <div className="text-3xl font-bold text-zinc-950 mt-1">
                {reportsData.doneItems} / {reportsData.totalItems}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Completed items ratio</div>
            </div>
          </div>

          {/* Velocity Across Sprints Chart */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Sprint Velocity History</h3>
                <p className="text-xs text-zinc-500">
                  Completed story points per sprint cycle used for empirical capacity planning.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-mint-100 text-emerald-950">
                Mean: {reportsData.averageVelocity} pts
              </span>
            </div>

            {reportsData.velocities && reportsData.velocities.length > 0 ? (
              <div className="space-y-3 pt-2">
                {reportsData.velocities.map((v: any) => (
                  <div key={v.sprintName} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-zinc-800">{v.sprintName}</span>
                      <span className="font-mono font-bold text-emerald-900">{v.completedPoints} pts</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (v.completedPoints / 40) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                Complete a sprint in Sprint Planning to start recording empirical team velocity.
              </div>
            )}
          </div>

          {/* Member Time Distribution Grid */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-zinc-900">Team Effort Allocation (Hours Logged)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(reportsData.memberTime || {}).map(([name, hours]: [string, any]) => (
                <div key={name} className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase">{name}</div>
                  <div className="text-2xl font-extrabold text-zinc-900 font-mono">
                    {Number(hours).toFixed(1)} <span className="text-xs font-semibold text-zinc-400">hrs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Persistent Activity & Audit History */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-zinc-900">Project Activity & Audit Trail</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{activityLogs.length} events logged</span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {activityLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">No activity recorded yet.</div>
          ) : (
            activityLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-white border border-zinc-200/80 text-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={
                      log.user?.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        log.user?.display_name || 'User'
                      )}`
                    }
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                  <div>
                    <span className="font-bold text-zinc-900 mr-1.5">{log.user?.display_name || 'Member'}:</span>
                    <span className="text-zinc-700">{log.details}</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 flex-shrink-0 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
