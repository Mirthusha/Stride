import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import { WorkItem, WorkItemStatus, Sprint, UserProfile } from '../types';
import {
  Kanban,
  Search,
  Filter,
  Plus,
  Zap,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { WorkItemDetailModal } from '../components/modals/WorkItemDetailModal';

const COLUMNS: { id: WorkItemStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'border-zinc-300' },
  { id: 'in_progress', title: 'In Progress', color: 'border-blue-400' },
  { id: 'qa', title: 'QA Review', color: 'border-purple-400' },
  { id: 'done', title: 'Done', color: 'border-emerald-500' },
];

export const KanbanBoardPage: React.FC = () => {
  const { currentProject } = useProject();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSprintId, setSelectedSprintId] = useState<string>('active');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [sprintsRes, usersRes] = await Promise.all([
        api.sprints.getAll(currentProject.id),
        api.auth.getUsers()
      ]);
      setSprints(sprintsRes);
      setUsers(usersRes);

      let sprintFilter: string | undefined = undefined;
      if (selectedSprintId === 'active') {
        const activeSprint = sprintsRes.find((s) => s.status === 'active');
        sprintFilter = activeSprint ? activeSprint.id : undefined;
      } else if (selectedSprintId !== 'all') {
        sprintFilter = selectedSprintId;
      }

      const itemsRes = await api.workItems.getAll(currentProject.id, {
        sprint_id: sprintFilter,
        assignee_id: selectedAssignee || undefined,
        priority: selectedPriority || undefined,
        type: selectedType || undefined,
        search: searchQuery || undefined
      });
      setItems(itemsRes);
    } catch (err) {
      console.error('[Kanban] Error loading board items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject, selectedSprintId, selectedAssignee, selectedPriority, selectedType, searchQuery, outletContext?.refreshTrigger]);

  const handleMoveStatus = async (item: WorkItem, newStatus: WorkItemStatus) => {
    // Optimistic UI update
    const previousItems = [...items];
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      await api.workItems.updateStatus(item.id, newStatus);
    } catch (err) {
      console.error('[Kanban] Status update failed, reverting:', err);
      // Revert on error
      setItems(previousItems);
    }
  };

  const getNextStatus = (current: WorkItemStatus): WorkItemStatus | null => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'qa';
    if (current === 'qa') return 'done';
    return null;
  };

  const getPrevStatus = (current: WorkItemStatus): WorkItemStatus | null => {
    if (current === 'done') return 'qa';
    if (current === 'qa') return 'in_progress';
    if (current === 'in_progress') return 'todo';
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Scrum & Kanban
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Interactive Board
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Real-time stage transitions, order persistence, and WIP management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => outletContext?.onOpenCreateItemModal()}
            className="btn-pill-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* Filter Presets Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-emerald-950/10 flex flex-wrap items-center justify-between gap-3 shadow-soft">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 border border-emerald-950/10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint Selector */}
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-emerald-950/15 text-zinc-800"
          >
            <option value="active">Active Sprint</option>
            <option value="all">All Sprints & Backlog</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700 capitalize"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700 capitalize"
          >
            <option value="">All Types</option>
            <option value="story">Stories</option>
            <option value="task">Tasks</option>
            <option value="bug">Bugs</option>
          </select>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start flex-1 min-h-[550px]">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.status === col.id);
          const colPoints = colItems.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

          return (
            <div
              key={col.id}
              className="glass-panel rounded-3xl p-3.5 border border-emerald-950/10 flex flex-col min-h-[500px] shadow-soft"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-950/10">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    col.id === 'done'
                      ? 'bg-emerald-600'
                      : col.id === 'qa'
                      ? 'bg-purple-600'
                      : col.id === 'in_progress'
                      ? 'bg-blue-600'
                      : 'bg-zinc-400'
                  }`} />
                  <h3 className="text-xs font-bold text-zinc-900 font-sans tracking-tight">
                    {col.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                  <span className="px-2 py-0.5 rounded-full bg-white/80 border border-emerald-950/10">
                    {colItems.length}
                  </span>
                  {colPoints > 0 && (
                    <span className="text-[10px] text-zinc-400 font-medium">{colPoints} pts</span>
                  )}
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colItems.map((item) => {
                  const nextStatus = getNextStatus(item.status);
                  const prevStatus = getPrevStatus(item.status);

                  return (
                    <div
                      key={item.id}
                      className="glass-panel-elevated rounded-2xl p-3.5 border border-emerald-950/10 hover:border-emerald-700/30 transition-all duration-200 cursor-pointer shadow-sm group"
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      {/* Top Row: Key + Type + Priority */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-950 text-[10px] font-bold font-mono">
                            {item.item_key}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            item.type === 'bug'
                              ? 'bg-red-100 text-red-800'
                              : item.type === 'story'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {item.type}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full ${
                          item.priority === 'critical'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : item.priority === 'high'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-zinc-500'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-zinc-900 group-hover:text-emerald-900 leading-snug mb-3">
                        {item.title}
                      </h4>

                      {/* Labels */}
                      {item.labels && item.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.labels.slice(0, 3).map((lbl) => (
                            <span
                              key={lbl}
                              className="px-2 py-0.5 rounded-full bg-mint-50 text-emerald-950 text-[9px] font-medium border border-mint-200"
                            >
                              {lbl}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer Row: Assignee + Points + Column Shift Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-950/5 text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              item.assignee?.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                item.assignee?.display_name || 'U'
                              )}`
                            }
                            alt="Assignee"
                            className="h-5 w-5 rounded-full border border-emerald-950/15 object-cover"
                            title={item.assignee?.display_name || 'Unassigned'}
                          />
                          {item.story_points && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800">
                              {item.story_points} pts
                            </span>
                          )}
                        </div>

                        {/* Quick stage transition arrows */}
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {prevStatus && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(item, prevStatus)}
                              className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors"
                              title={`Move back to ${prevStatus}`}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {nextStatus && (
                            <button
                              type="button"
                              onClick={() => handleMoveStatus(item, nextStatus)}
                              className="p-1 rounded-full hover:bg-emerald-100 text-emerald-800 transition-colors"
                              title={`Move to ${nextStatus}`}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colItems.length === 0 && (
                  <div className="py-12 text-center text-xs text-zinc-400 border-2 border-dashed border-emerald-950/10 rounded-2xl">
                    No cards in {col.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
