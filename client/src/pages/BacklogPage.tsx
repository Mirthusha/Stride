import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import { WorkItem, Epic, Sprint, WorkItemType, WorkItemPriority } from '../types';
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  Target,
  Zap,
  ArrowRight,
  MoreVertical,
  ChevronRight,
  Layers
} from 'lucide-react';
import { WorkItemDetailModal } from '../components/modals/WorkItemDetailModal';

export const BacklogPage: React.FC = () => {
  const { currentProject } = useProject();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isNewEpicModalOpen, setIsNewEpicModalOpen] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState('');
  const [newEpicDesc, setNewEpicDesc] = useState('');

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [itemsRes, epicsRes, sprintsRes] = await Promise.all([
        api.workItems.getAll(currentProject.id, {
          backlog_only: true,
          search: searchQuery || undefined,
          type: typeFilter || undefined,
          priority: priorityFilter || undefined
        }),
        api.epics.getAll(currentProject.id),
        api.sprints.getAll(currentProject.id)
      ]);
      setItems(itemsRes);
      setEpics(epicsRes);
      setSprints(sprintsRes);
    } catch (err) {
      console.error('[Backlog] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject, searchQuery, typeFilter, priorityFilter, outletContext?.refreshTrigger]);

  const handleCreateEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newEpicTitle.trim()) return;
    try {
      await api.epics.create({
        project_id: currentProject.id,
        title: newEpicTitle.trim(),
        description: newEpicDesc
      });
      setNewEpicTitle('');
      setNewEpicDesc('');
      setIsNewEpicModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to create epic:', err);
    }
  };

  const handleAssignToSprint = async (itemId: string, sprintId: string) => {
    try {
      await api.workItems.update(itemId, { sprint_id: sprintId ? sprintId : null });
      loadData();
    } catch (err) {
      console.error('Failed to move item to sprint:', err);
    }
  };

  const filteredItems = selectedEpicId
    ? items.filter((item) => item.epic_id === selectedEpicId)
    : items;

  const totalBacklogPoints = filteredItems.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Backlog
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Product Backlog & Epics
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Unassigned items ready for prioritization and sprint grooming. ({filteredItems.length} items, {totalBacklogPoints} points)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewEpicModalOpen(true)}
            className="btn-pill-mint text-xs flex items-center gap-1.5"
          >
            <Target className="h-3.5 w-3.5" />
            <span>New Epic</span>
          </button>
          <button
            onClick={() => outletContext?.onOpenCreateItemModal()}
            className="btn-pill-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Create Item</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Epics Sidebar, Right Backlog List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Epics Panel */}
        <div className="glass-panel rounded-3xl p-4 border border-emerald-950/10 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/10">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
              <Target className="h-4 w-4 text-emerald-700" />
              <span>Epics ({epics.length})</span>
            </div>
            {selectedEpicId && (
              <button
                onClick={() => setSelectedEpicId(null)}
                className="text-[11px] text-emerald-800 font-semibold hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setSelectedEpicId(null)}
              className={`w-full text-left p-3 rounded-2xl text-xs font-semibold transition-all ${
                selectedEpicId === null
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-white/60 hover:bg-white text-zinc-700'
              }`}
            >
              All Epics & Items
            </button>

            {epics.map((epic) => (
              <div
                key={epic.id}
                onClick={() => setSelectedEpicId(epic.id === selectedEpicId ? null : epic.id)}
                className={`p-3 rounded-2xl cursor-pointer border transition-all text-xs ${
                  selectedEpicId === epic.id
                    ? 'bg-mint-100 border-emerald-600 text-emerald-950 shadow-sm'
                    : 'bg-white/70 hover:bg-white border-emerald-950/10 text-zinc-800'
                }`}
              >
                <div className="font-bold truncate mb-1">{epic.title}</div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                  <span>{epic.completed_items || 0} / {epic.total_items || 0} done</span>
                  <span className="font-bold text-emerald-800">{epic.progress_percentage || 0}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${epic.progress_percentage || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Work Items List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="glass-panel rounded-2xl p-3 border border-emerald-950/10 flex flex-wrap items-center justify-between gap-3 shadow-soft">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search backlog by title, key, or tag..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 border border-emerald-950/10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700 capitalize"
              >
                <option value="">All Types</option>
                <option value="story">User Story</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700 capitalize"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Items Container */}
          <div className="glass-panel rounded-3xl p-4 border border-emerald-950/10 shadow-soft">
            {filteredItems.length > 0 ? (
              <div className="divide-y divide-emerald-950/5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/60 rounded-2xl transition-colors group"
                  >
                    {/* Item Details */}
                    <div
                      onClick={() => setSelectedItemId(item.id)}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono flex-shrink-0">
                        {item.item_key}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        item.type === 'bug'
                          ? 'bg-red-100 text-red-800'
                          : item.type === 'story'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {item.type}
                      </span>
                      <span className="text-xs font-semibold text-zinc-900 truncate group-hover:text-emerald-900">
                        {item.title}
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {item.story_points && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                          {item.story_points} pts
                        </span>
                      )}

                      {/* Quick Move to Sprint Dropdown */}
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleAssignToSprint(item.id, e.target.value);
                        }}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-mint-100 hover:bg-mint-200 text-emerald-950 border border-mint-300 transition-colors cursor-pointer"
                      >
                        <option value="">Move to Sprint &rarr;</option>
                        {sprints.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.status})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setSelectedItemId(item.id)}
                        className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-zinc-400">
                <ListTodo className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                <p className="font-semibold text-zinc-700">No items found in backlog</p>
                <p className="text-zinc-500 mt-1 mb-4">Create a user story or task to start grooming your product backlog.</p>
                <button
                  onClick={() => outletContext?.onOpenCreateItemModal()}
                  className="btn-pill-primary text-xs"
                >
                  + Add Work Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Epic Modal */}
      {isNewEpicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6">
            <h3 className="text-base font-bold text-zinc-900 mb-1">Create New Epic</h3>
            <p className="text-xs text-zinc-500 mb-4">Group user stories and features under an overarching goal.</p>
            <form onSubmit={handleCreateEpic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Epic Title *</label>
                <input
                  type="text"
                  required
                  value={newEpicTitle}
                  onChange={(e) => setNewEpicTitle(e.target.value)}
                  placeholder="e.g. Automated Notifications & Mentions"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newEpicDesc}
                  onChange={(e) => setNewEpicDesc(e.target.value)}
                  placeholder="Goal and key business objectives..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-950/15 text-xs text-zinc-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
