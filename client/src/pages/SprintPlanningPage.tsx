import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Sprint, WorkItem } from '../types';
import {
  Zap,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';
import { WorkItemDetailModal } from '../components/modals/WorkItemDetailModal';

export const SprintPlanningPage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null);
  const [rolloverAction, setRolloverAction] = useState<'backlog' | 'next_sprint'>('backlog');
  const [targetSprintId, setTargetSprintId] = useState<string>('');

  // Create sprint form
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [capacityPoints, setCapacityPoints] = useState('35');
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const canManageSprints = role === 'WorkspaceAdmin' || role === 'ProductOwner' || role === 'ScrumMaster';

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [sprintsRes, itemsRes] = await Promise.all([
        api.sprints.getAll(currentProject.id),
        api.workItems.getAll(currentProject.id)
      ]);
      setSprints(sprintsRes);
      setWorkItems(itemsRes);
    } catch (err) {
      console.error('[Sprints] Error loading sprint data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject, outletContext?.refreshTrigger]);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('Sprint end date must not precede start date.');
      return;
    }

    try {
      setFormError(null);
      await api.sprints.create({
        project_id: currentProject.id,
        name: sprintName.trim(),
        goal: sprintGoal,
        start_date: startDate,
        end_date: endDate,
        capacity_points: capacityPoints ? Number(capacityPoints) : null,
        status: 'planning'
      });

      setSprintName('');
      setSprintGoal('');
      setIsCreateSprintOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create sprint');
    }
  };

  const handleActivateSprint = async (sprintId: string) => {
    try {
      await api.sprints.activate(sprintId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to activate sprint');
    }
  };

  const handleCompleteSprint = async () => {
    if (!completingSprint) return;
    try {
      await api.sprints.complete(completingSprint.id, rolloverAction, targetSprintId || undefined);
      setIsCompleteModalOpen(false);
      setCompletingSprint(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete sprint');
    }
  };

  const activeSprint = sprints.find((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Scrum Lifecycle
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Sprint Planning & Execution
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Zoho Sprints model: capacity planning, active iteration governance, and task rollover.
          </p>
        </div>

        {canManageSprints && (
          <button
            onClick={() => setIsCreateSprintOpen(true)}
            className="btn-pill-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Plan New Sprint</span>
          </button>
        )}
      </div>

      {/* Active Sprint Banner */}
      {activeSprint ? (
        <div className="glass-panel-elevated rounded-3xl p-6 border border-emerald-950/15 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-950/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    Active Sprint
                  </span>
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(activeSprint.start_date).toLocaleDateString()} —{' '}
                    {new Date(activeSprint.end_date).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mt-1 font-sans">{activeSprint.name}</h2>
              </div>
            </div>

            {canManageSprints && (
              <button
                onClick={() => {
                  setCompletingSprint(activeSprint);
                  setIsCompleteModalOpen(true);
                }}
                className="btn-pill-outline text-xs px-5 py-2 border-emerald-900/60 hover:bg-emerald-900 hover:text-white"
              >
                Complete Sprint &rarr;
              </button>
            )}
          </div>

          <div className="py-4 space-y-3">
            <p className="text-xs text-zinc-600 leading-relaxed">
              <span className="font-bold text-zinc-800">Goal: </span>
              {activeSprint.goal || 'No goal specified.'}
            </p>

            {/* Progress Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-zinc-700">
                <span>Sprint Progress</span>
                <span className="text-emerald-800 font-bold">{activeSprint.progress_percentage || 0}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden border border-emerald-950/10">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${activeSprint.progress_percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-3 pt-2 text-xs">
              <span className="px-3 py-1.5 rounded-2xl bg-white/80 border border-emerald-950/10 font-medium text-zinc-700">
                Work items: <strong className="text-zinc-900">{activeSprint.work_items_count || 0}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-2xl bg-white/80 border border-emerald-950/10 font-medium text-zinc-700">
                Done items: <strong className="text-emerald-800">{activeSprint.completed_items_count || 0}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-2xl bg-white/80 border border-emerald-950/10 font-medium text-zinc-700">
                Committed Story Points: <strong className="text-zinc-900">{activeSprint.total_points || 0} pts</strong>
              </span>
            </div>
          </div>

          {/* Active Sprint Items List */}
          <div className="pt-4 border-t border-emerald-950/10">
            <div className="text-xs font-bold uppercase text-zinc-500 mb-3 tracking-wider">
              Sprint Scope & Deliverables
            </div>
            <div className="divide-y divide-emerald-950/5">
              {workItems
                .filter((wi) => wi.sprint_id === activeSprint.id)
                .map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-white/60 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
                        {item.item_key}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {item.status}
                      </span>
                      {item.story_points && (
                        <span className="text-[10px] font-bold text-zinc-500">
                          {item.story_points} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-8 text-center border-dashed border-2 border-emerald-950/15">
          <Zap className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-900 mb-1">No Active Sprint</h2>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
            Activate one of your planning sprints below or create a new sprint to begin iteration tracking.
          </p>
        </div>
      )}

      {/* Planning Sprints Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Planning Sprints ({planningSprints.length})
        </h3>

        {planningSprints.map((sprint) => {
          const sprintItems = workItems.filter((wi) => wi.sprint_id === sprint.id);
          const totalPts = sprintItems.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

          return (
            <div
              key={sprint.id}
              className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900">{sprint.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Planning
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                    <span>
                      {new Date(sprint.start_date).toLocaleDateString()} — {new Date(sprint.end_date).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{sprintItems.length} items</span>
                    <span>•</span>
                    <span>{totalPts} points</span>
                  </div>
                </div>

                {canManageSprints && (
                  <button
                    onClick={() => handleActivateSprint(sprint.id)}
                    className="btn-pill-mint text-xs px-4 py-1.5 self-start sm:self-auto"
                  >
                    Start Sprint
                  </button>
                )}
              </div>

              {sprint.goal && (
                <p className="text-xs text-zinc-600 mb-3 bg-white/50 p-2.5 rounded-xl border border-emerald-950/5">
                  <span className="font-semibold text-zinc-800">Goal: </span>
                  {sprint.goal}
                </p>
              )}

              {/* Items */}
              <div className="divide-y divide-emerald-950/5">
                {sprintItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className="py-2 px-1 flex items-center justify-between text-xs hover:bg-white/60 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
                        {item.item_key}
                      </span>
                      <span className="font-medium text-zinc-900 truncate">{item.title}</span>
                    </div>
                    {item.story_points && (
                      <span className="text-[10px] font-bold text-zinc-500">{item.story_points} pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed Sprints Archive */}
      {completedSprints.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-emerald-950/10">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            Completed Sprints Archive ({completedSprints.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedSprints.map((sprint) => (
              <div
                key={sprint.id}
                className="glass-panel-subtle rounded-2xl p-4 border border-emerald-950/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-zinc-900">{sprint.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mb-2">
                  Finished on {new Date(sprint.end_date).toLocaleDateString()}
                </div>
                <div className="text-xs text-zinc-700">
                  Completed {sprint.completed_items_count || 0} of {sprint.work_items_count || 0} items ({sprint.total_points || 0} pts)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {isCreateSprintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6">
            <h3 className="text-base font-bold text-zinc-900 mb-1 font-sans">Plan New Sprint</h3>
            <p className="text-xs text-zinc-500 mb-4">Set target dates, capacity, and iteration commitment.</p>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Sprint Name *</label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="e.g. Sprint 3 — Quality Assurance"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Sprint Goal</label>
                <textarea
                  rows={2}
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Primary objective to achieve in this sprint..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Capacity (Story Points)</label>
                <input
                  type="number"
                  min="1"
                  value={capacityPoints}
                  onChange={(e) => setCapacityPoints(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950/10">
                <button
                  type="button"
                  onClick={() => setIsCreateSprintOpen(false)}
                  className="btn-pill-subtle text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Create Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Sprint Modal with Task Rollover Handling */}
      {isCompleteModalOpen && completingSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6">
            <h3 className="text-base font-bold text-zinc-900 mb-1 font-sans">
              Complete {completingSprint.name}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Review completed deliverables and decide where incomplete work items should go.
            </p>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4">
              <strong>Agile Rollover Governance:</strong>
              <p className="mt-1 leading-relaxed">
                Work items must not silently disappear. Choose to return uncompleted items to the product backlog or roll them over into another sprint.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-zinc-800">
                What should happen to incomplete tasks?
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-emerald-950/10 cursor-pointer hover:bg-white transition-colors">
                <input
                  type="radio"
                  name="rollover"
                  checked={rolloverAction === 'backlog'}
                  onChange={() => setRolloverAction('backlog')}
                  className="text-emerald-700 focus:ring-emerald-600"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-900">Return to Product Backlog</div>
                  <div className="text-[11px] text-zinc-500">Uncompleted items will be prioritized in future grooming sessions.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-emerald-950/10 cursor-pointer hover:bg-white transition-colors">
                <input
                  type="radio"
                  name="rollover"
                  checked={rolloverAction === 'next_sprint'}
                  onChange={() => setRolloverAction('next_sprint')}
                  className="text-emerald-700 focus:ring-emerald-600"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-zinc-900">Move to Planning Sprint</div>
                  <div className="text-[11px] text-zinc-500">Directly roll over into an upcoming sprint backlog.</div>
                  {rolloverAction === 'next_sprint' && (
                    <select
                      value={targetSprintId}
                      onChange={(e) => setTargetSprintId(e.target.value)}
                      className="mt-2 w-full text-xs p-2 rounded-xl bg-white border border-emerald-950/15 text-zinc-800"
                    >
                      <option value="">Select Target Sprint</option>
                      {planningSprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-emerald-950/10">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="btn-pill-subtle text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSprint}
                className="btn-pill-primary text-xs px-6 py-2"
              >
                Confirm & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      <WorkItemDetailModal
        itemId={selectedItemId}
        isOpen={selectedItemId !== null}
        onClose={() => setSelectedItemId(null)}
        onItemUpdated={() => loadData()}
        onItemDeleted={() => loadData()}
      />
    </div>
  );
};
