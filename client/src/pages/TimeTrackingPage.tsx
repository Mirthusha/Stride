import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { TimeEntry, ActiveTimer, WorkItem } from '../types';
import { Clock, Play, Square, Plus, Trash2, Calendar, User, FileText, BarChart2 } from 'lucide-react';

export const TimeTrackingPage: React.FC = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();

  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Entry Form State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string>('');
  const [durationInput, setDurationInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [timerRes, entriesRes, itemsRes] = await Promise.all([
        api.timeTracking.getActiveTimer(),
        api.timeTracking.getEntries(currentProject.id),
        api.workItems.getAll(currentProject.id)
      ]);
      setActiveTimer(timerRes);
      setEntries(entriesRes);
      setWorkItems(itemsRes);
    } catch (err: any) {
      console.error('[TimeTracking] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  // Timer ticker
  useEffect(() => {
    if (!activeTimer) return;
    const start = new Date(activeTimer.start_time).getTime();
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));

    const ticker = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(ticker);
  }, [activeTimer]);

  const handleStartTimer = async () => {
    if (!currentProject) return;
    try {
      setError(null);
      const timer = await api.timeTracking.startTimer(
        currentProject.id,
        selectedWorkItemId || null,
        descriptionInput || 'Interactive work session'
      );
      setActiveTimer(timer);
      setDescriptionInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    try {
      setError(null);
      await api.timeTracking.stopTimer();
      setActiveTimer(null);
      setElapsedSeconds(0);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to stop timer');
    }
  };

  const handleCreateManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    const mins = Number(durationInput);
    if (!mins || mins <= 0) {
      setError('Duration must be greater than zero minutes.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await api.timeTracking.createEntry({
        project_id: currentProject.id,
        work_item_id: selectedWorkItemId || null,
        duration_minutes: mins,
        description: descriptionInput || 'Manual time record',
        date: dateInput
      });
      setIsManualModalOpen(false);
      setDurationInput('');
      setDescriptionInput('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to log time');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Delete this time entry?')) return;
    try {
      await api.timeTracking.deleteEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const totalTrackedMinutes = entries.reduce((sum, e) => sum + e.duration_minutes, 0);
  const totalTrackedHours = (totalTrackedMinutes / 60).toFixed(1);

  // Group by date or project
  const groupedByDate: Record<string, TimeEntry[]> = {};
  entries.forEach((e) => {
    const d = e.date || 'Unspecified';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(e);
  });

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Agile Timesheets
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Time Tracking & Effort Logs
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Precision time tracking with live timers, daily/weekly timesheets, and project aggregations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="btn-pill-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      {/* Live Timer Control Card */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${activeTimer ? 'bg-emerald-500 text-white animate-pulse' : 'bg-mint-100 text-emerald-900'}`}>
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                {activeTimer ? 'Timer Active & Running' : 'No Active Timer Running'}
              </div>
              <div className="text-3xl font-extrabold text-zinc-950 font-mono tracking-tight mt-0.5">
                {activeTimer ? formatTimer(elapsedSeconds) : '00:00:00'}
              </div>
              {activeTimer?.description && (
                <p className="text-xs text-emerald-900 font-medium mt-1">
                  "{activeTimer.description}"
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {activeTimer ? (
              <button
                onClick={handleStopTimer}
                className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow flex items-center gap-2 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop & Save Entry</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedWorkItemId}
                  onChange={(e) => setSelectedWorkItemId(e.target.value)}
                  className="bg-white border border-zinc-200 rounded-full px-3 py-2 text-xs font-semibold text-zinc-800"
                >
                  <option value="">General Project Work (No task)</option>
                  {workItems.map((wi) => (
                    <option key={wi.id} value={wi.id}>
                      {wi.item_key}: {wi.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStartTimer}
                  className="btn-pill-primary text-xs flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Live Timer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Total Logged Hours
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">
            {totalTrackedHours} <span className="text-xs font-semibold text-zinc-500">hours</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Across {entries.length} logged records</div>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            My Logged Time
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">
            {(entries.filter((e) => e.user_id === user?.id).reduce((s, e) => s + e.duration_minutes, 0) / 60).toFixed(1)}{' '}
            <span className="text-xs font-semibold text-zinc-500">hours</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Logged by {user?.display_name}</div>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Current Project
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-1 truncate">
            {currentProject?.name}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Key: {currentProject?.project_key}</div>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="glass-panel rounded-3xl border border-emerald-950/10 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-emerald-950/10 flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-900">Recorded Time Entries</h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                viewMode === 'daily' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                viewMode === 'weekly' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border'
              }`}
            >
              Grouped by Date
            </button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No time entries recorded yet. Start a live timer or log a manual entry above!
          </div>
        ) : viewMode === 'daily' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Work Item</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-700">{entry.date}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            entry.user?.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              entry.user?.display_name || 'User'
                            )}`
                          }
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <span className="font-semibold text-zinc-900">{entry.user?.display_name || 'Member'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {entry.work_item ? (
                        <span className="font-mono font-bold text-emerald-900">
                          {entry.work_item.item_key}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">Project Level</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{entry.description}</td>
                    <td className="py-3 px-4 text-right font-bold text-zinc-900 font-mono">
                      {Math.floor(entry.duration_minutes / 60)}h {entry.duration_minutes % 60}m
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(entry.user_id === user?.id || user?.role === 'WorkspaceAdmin') && (
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-zinc-400 hover:text-rose-600 p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(groupedByDate).map(([date, dateEntries]) => {
              const dayMins = dateEntries.reduce((s, e) => s + e.duration_minutes, 0);
              return (
                <div key={date} className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="font-bold text-zinc-900 text-xs">{date}</span>
                    <span className="text-xs font-bold text-emerald-900 font-mono">
                      Total: {(dayMins / 60).toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dateEntries.map((e) => (
                      <div key={e.id} className="flex items-center justify-between text-xs py-1 text-zinc-600">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">{e.user?.display_name}:</span>
                          <span>{e.description}</span>
                          {e.work_item && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-mint-100 text-emerald-900 font-bold font-mono">
                              {e.work_item.item_key}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-zinc-800">
                          {Math.floor(e.duration_minutes / 60)}h {e.duration_minutes % 60}m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Time Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Log Manual Time</h3>
            <form onSubmit={handleCreateManualEntry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Work Item (Optional)</label>
                <select
                  value={selectedWorkItemId}
                  onChange={(e) => setSelectedWorkItemId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-semibold text-zinc-800"
                >
                  <option value="">General Project Work</option>
                  {workItems.map((wi) => (
                    <option key={wi.id} value={wi.id}>
                      {wi.item_key}: {wi.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Date</label>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  placeholder="e.g. 60 for 1 hour, 90 for 1.5h"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Work Description</label>
                <textarea
                  rows={2}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="Summary of tasks completed..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              {error && <div className="text-rose-600 text-[11px]">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill-primary text-xs"
                >
                  {submitting ? 'Logging...' : 'Save Time Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
