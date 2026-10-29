import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { api } from '../lib/api';
import { WorkItem, WorkItemStatus, UserProfile } from '../types';
import {
  TableProperties,
  Search,
  ArrowUpDown,
  Filter,
  Plus,
  ChevronRight
} from 'lucide-react';
import { WorkItemDetailModal } from '../components/modals/WorkItemDetailModal';

export const ListViewPage: React.FC = () => {
  const { currentProject } = useProject();
  const outletContext = useOutletContext<{ refreshTrigger?: number; onOpenCreateItemModal: () => void }>();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortField, setSortField] = useState<'item_key' | 'title' | 'status' | 'priority' | 'story_points'>('item_key');
  const [sortAsc, setSortAsc] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [itemsRes, usersRes] = await Promise.all([
        api.workItems.getAll(currentProject.id),
        api.auth.getUsers()
      ]);
      setItems(itemsRes);
      setUsers(usersRes);
    } catch (err) {
      console.error('[ListView] Error loading work items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject, outletContext?.refreshTrigger]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleInlineStatusChange = async (itemId: string, newStatus: WorkItemStatus) => {
    try {
      await api.workItems.updateStatus(itemId, newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredItems = items
    .filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.item_key.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.labels.some((l) => l.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              List & Grid
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              All Work Items
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Tabular overview with sortable fields, inline status transitions, and bulk visibility.
          </p>
        </div>

        <button
          onClick={() => outletContext?.onOpenCreateItemModal()}
          className="btn-pill-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Work Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-emerald-950/10 flex flex-wrap items-center justify-between gap-3 shadow-soft">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by key, title, or label..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 border border-emerald-950/10 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-emerald-950/10 text-zinc-700"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="qa">QA Review</option>
            <option value="done">Done</option>
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

      {/* Table Container */}
      <div className="glass-panel rounded-3xl border border-emerald-950/10 overflow-hidden shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700">
            <thead className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('item_key')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Key</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-3 px-4 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Title</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Type</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Assignee</th>
                <th
                  onClick={() => handleSort('story_points')}
                  className="py-3 px-3 cursor-pointer hover:text-zinc-900"
                >
                  <div className="flex items-center gap-1">
                    <span>Points</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/5 bg-white/40">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-white/80 transition-colors cursor-pointer group"
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-emerald-900">
                    {item.item_key}
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900 max-w-xs truncate group-hover:text-emerald-900">
                    {item.title}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      item.type === 'bug'
                        ? 'bg-red-100 text-red-800'
                        : item.type === 'story'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={item.status}
                      onChange={(e) => handleInlineStatusChange(item.id, e.target.value as WorkItemStatus)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-white border border-emerald-950/15"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="qa">QA Review</option>
                      <option value="done">Done</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 capitalize font-medium">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.priority === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : item.priority === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'text-zinc-600'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={
                          item.assignee?.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            item.assignee?.display_name || 'U'
                          )}`
                        }
                        alt="Avatar"
                        className="h-5 w-5 rounded-full border border-emerald-950/15"
                      />
                      <span className="truncate max-w-[100px] text-zinc-800">
                        {item.assignee?.display_name || 'Unassigned'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-800">
                    {item.story_points ? `${item.story_points} pts` : '—'}
                  </td>
                  <td className="py-3 px-3 text-zinc-500">
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                      }}
                      className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-400">
              No matching work items found in this project.
            </div>
          )}
        </div>
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
