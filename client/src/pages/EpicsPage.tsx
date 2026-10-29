import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Epic, WorkItem } from '../types';
import { Target, Plus, Calendar, CheckCircle2, ListTodo, ArrowRight, Trash2 } from 'lucide-react';

export const EpicsPage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New epic modal
  const [isNewEpicModalOpen, setIsNewEpicModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');

  const canManageEpics = role === 'WorkspaceAdmin' || role === 'ProductOwner';

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [epicsRes, itemsRes] = await Promise.all([
        api.epics.getAll(currentProject.id),
        api.workItems.getAll(currentProject.id)
      ]);
      setEpics(epicsRes);
      setWorkItems(itemsRes);
    } catch (err) {
      console.error('[Epics] Error loading epics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject, outletContext?.refreshTrigger]);

  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newTitle.trim()) return;
    try {
      await api.epics.create({
        project_id: currentProject.id,
        title: newTitle.trim(),
        description: newDesc,
        target_date: newTargetDate || undefined
      });
      setNewTitle('');
      setNewDesc('');
      setNewTargetDate('');
      setIsNewEpicModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create epic:', err);
    }
  };

  const handleDeleteEpic = async (epicId: string) => {
    if (!window.confirm('Are you sure you want to delete this epic? Linked work items will become unassigned from this epic.')) {
      return;
    }
    try {
      await api.epics.delete(epicId);
      loadData();
    } catch (err) {
      console.error('Failed to delete epic:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Strategic Vision
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Epics & High-Level Milestones
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Progress calculated automatically from associated user stories, tasks, and bug deliverables.
          </p>
        </div>

        {canManageEpics && (
          <button
            onClick={() => setIsNewEpicModalOpen(true)}
            className="btn-pill-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Epic</span>
          </button>
        )}
      </div>

      {/* Epics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {epics.map((epic) => {
          const linkedTasks = workItems.filter((wi) => wi.epic_id === epic.id);

          return (
            <div
              key={epic.id}
              className="glass-panel-elevated rounded-3xl p-6 border border-emerald-950/10 shadow-soft flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider">
                    Epic Goal
                  </span>
                  {canManageEpics && (
                    <button
                      onClick={() => handleDeleteEpic(epic.id)}
                      className="p-1 rounded-full text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete Epic"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-base font-bold text-zinc-900 mb-2 font-sans">{epic.title}</h3>
                <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                  {epic.description || 'No detailed description provided.'}
                </p>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-semibold text-zinc-700">
                    <span>Deliverable Progress</span>
                    <span className="text-emerald-800 font-bold">{epic.progress_percentage || 0}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-zinc-100 overflow-hidden border border-emerald-950/10">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${epic.progress_percentage || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 pt-0.5">
                    <span>{epic.completed_items || 0} completed</span>
                    <span>{epic.total_items || 0} total work items</span>
                  </div>
                </div>
              </div>

              {/* Linked Items List Preview */}
              <div className="pt-4 border-t border-emerald-950/10">
                <div className="text-[11px] font-bold uppercase text-zinc-400 mb-2">
                  Associated Deliverables ({linkedTasks.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {linkedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-white/60"
                    >
                      <span className="truncate text-zinc-800">{t.title}</span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                        t.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                  {linkedTasks.length === 0 && (
                    <div className="text-[11px] text-zinc-400 italic py-1">
                      No work items linked to this epic yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {epics.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-2 border-emerald-950/15">
          <Target className="h-10 w-10 text-emerald-700 mx-auto mb-2" />
          <h2 className="text-base font-bold text-zinc-900 mb-1">No Epics Created</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
            Epics bundle features and stories into measurable strategic releases.
          </p>
          {canManageEpics && (
            <button onClick={() => setIsNewEpicModalOpen(true)} className="btn-pill-primary text-xs">
              Create First Epic
            </button>
          )}
        </div>
      )}

      {/* New Epic Modal */}
      {isNewEpicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6">
            <h3 className="text-base font-bold text-zinc-900 mb-1 font-sans">Create Epic</h3>
            <p className="text-xs text-zinc-500 mb-4">Set goal, target date, and scope description.</p>
            <form onSubmit={handleCreateEpic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Epic Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Mobile Responsive Redesign"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Strategic goal and business deliverables..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-950/10">
                <button
                  type="button"
                  onClick={() => setIsNewEpicModalOpen(false)}
                  className="btn-pill-subtle text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Create Epic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
