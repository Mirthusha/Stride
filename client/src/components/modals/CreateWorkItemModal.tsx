import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { api } from '../../lib/api';
import { Epic, Sprint, UserProfile, WorkItemPriority, WorkItemType } from '../../types';
import { X, AlertCircle } from 'lucide-react';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: () => void;
  defaultSprintId?: string | null;
  defaultStatus?: 'todo' | 'in_progress' | 'qa' | 'done';
}

export const CreateWorkItemModal: React.FC<CreateWorkItemModalProps> = ({
  isOpen,
  onClose,
  onItemCreated,
  defaultSprintId,
  defaultStatus = 'todo'
}) => {
  const { currentProject } = useProject();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkItemType>('story');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>(defaultSprintId || '');
  const [storyPoints, setStoryPoints] = useState<string>('5');
  const [dueDate, setDueDate] = useState<string>('');
  const [labelsInput, setLabelsInput] = useState<string>('');

  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentProject) return;
    setSprintId(defaultSprintId || '');

    const fetchData = async () => {
      try {
        const [epicsRes, sprintsRes, usersRes] = await Promise.all([
          api.epics.getAll(currentProject.id),
          api.sprints.getAll(currentProject.id),
          api.auth.getUsers()
        ]);
        setEpics(epicsRes);
        setSprints(sprintsRes);
        setUsers(usersRes);
      } catch (err: any) {
        console.error('Failed to load item dependencies:', err);
      }
    };
    fetchData();
  }, [isOpen, currentProject, defaultSprintId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const labels = labelsInput
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      await api.workItems.create({
        project_id: currentProject.id,
        title: title.trim(),
        description,
        type,
        status: defaultStatus,
        priority,
        assignee_id: assigneeId || null,
        epic_id: epicId || null,
        sprint_id: sprintId ? sprintId : null,
        story_points: storyPoints ? Number(storyPoints) : null,
        due_date: dueDate || null,
        labels
      });

      // Reset form
      setTitle('');
      setDescription('');
      setType('story');
      setPriority('medium');
      setAssigneeId('');
      setEpicId('');
      setStoryPoints('5');
      setDueDate('');
      setLabelsInput('');

      onItemCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create work item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel-elevated w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-emerald-950/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 font-sans">Create Work Item</h2>
            <p className="text-xs text-zinc-500">
              Project: <span className="font-semibold text-emerald-900">{currentProject?.name} ({currentProject?.project_key})</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Pills */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Work Item Type</label>
            <div className="flex gap-2">
              {(['story', 'task', 'bug'] as WorkItemType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
                    type === t
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'bg-white/80 border border-emerald-950/15 text-zinc-700 hover:bg-white'
                  }`}
                >
                  {t === 'story' ? 'User Story' : t}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. As a user, I want to filter board cards by assignee"
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Acceptance criteria, technical notes, or implementation details..."
              className="w-full px-4 py-2.5 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          {/* Grid row: Priority, Story Points, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 capitalize focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Story Points</label>
              <select
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="1">1 pt (Trivial)</option>
                <option value="2">2 pts (Small)</option>
                <option value="3">3 pts (Medium)</option>
                <option value="5">5 pts (Standard)</option>
                <option value="8">8 pts (Complex)</option>
                <option value="13">13 pts (Epic scale)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
              </input>
            </div>
          </div>

          {/* Grid row: Assignee, Sprint, Epic */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Sprint</label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="">Product Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Epic Link</label>
              <select
                value={epicId}
                onChange={(e) => setEpicId(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
              >
                <option value="">No Epic</option>
                {epics.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Labels <span className="font-normal text-zinc-400">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="e.g. frontend, ui, release-v1"
              className="w-full px-4 py-2 rounded-2xl bg-white/90 border border-emerald-950/15 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-emerald-950/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-pill-subtle text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-pill-primary text-xs px-6 py-2"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
