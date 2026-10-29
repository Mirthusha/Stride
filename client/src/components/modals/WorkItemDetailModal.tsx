import React, { useState, useEffect } from 'react';
import {
  WorkItem,
  WorkItemStatus,
  WorkItemPriority,
  WorkItemType,
  Epic,
  Sprint,
  UserProfile,
  Comment,
  ChecklistItem,
  WorkItemDependency,
  GitIntegrationLink
} from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Trash2,
  Calendar,
  User,
  Tag,
  Target,
  Zap,
  AlertCircle,
  CheckSquare,
  MessageSquare,
  Link2,
  Clock,
  Eye,
  Send,
  Plus,
  GitBranch,
  GitPullRequest,
  ExternalLink
} from 'lucide-react';

interface WorkItemDetailModalProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  onItemDeleted: () => void;
}

type TabType = 'overview' | 'checklist' | 'comments' | 'dependencies' | 'timelog' | 'git_devops';

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({
  itemId,
  isOpen,
  onClose,
  onItemUpdated,
  onItemDeleted
}) => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [item, setItem] = useState<WorkItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('todo');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [type, setType] = useState<WorkItemType>('task');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [epicId, setEpicId] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [labels, setLabels] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [epics, setEpics] = useState<Epic[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allItems, setAllItems] = useState<WorkItem[]>([]);

  // Part 2 Collections
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [dependencies, setDependencies] = useState<WorkItemDependency[]>([]);
  const [newDepTargetId, setNewDepTargetId] = useState('');
  const [newDepType, setNewDepType] = useState<'blocks' | 'is_blocked_by' | 'relates_to'>('relates_to');
  const [isWatching, setIsWatching] = useState(false);
  const [timeDuration, setTimeDuration] = useState('');
  const [timeDescription, setTimeDescription] = useState('');

  // Part 3 Git Links
  const [gitLinks, setGitLinks] = useState<GitIntegrationLink[]>([]);
  const [newLinkType, setNewLinkType] = useState<'commit' | 'branch' | 'pull_request'>('commit');
  const [newLinkExternalId, setNewLinkExternalId] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [linkingGit, setLinkingGit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = role === 'WorkspaceAdmin' || role === 'ProductOwner' || role === 'ScrumMaster';

  const loadData = async () => {
    if (!itemId) return;
    try {
      const itemData = await api.workItems.getById(itemId);
      setItem(itemData);
      setTitle(itemData.title);
      setDescription(itemData.description || '');
      setStatus(itemData.status);
      setPriority(itemData.priority);
      setType(itemData.type);
      setAssigneeId(itemData.assignee_id || '');
      setEpicId(itemData.epic_id || '');
      setSprintId(itemData.sprint_id || '');
      setStoryPoints(itemData.story_points ? String(itemData.story_points) : '');
      setDueDate(itemData.due_date ? itemData.due_date.split('T')[0] : '');
      setLabels(itemData.labels || []);
      setChecklists(itemData.checklists || []);
      setDependencies(itemData.dependencies || []);
      setIsWatching(itemData.watchers ? itemData.watchers.includes(user?.id || '') : false);

      const [epicsRes, sprintsRes, usersRes, commentsRes, allItemsRes, linksRes] = await Promise.all([
        api.epics.getAll(itemData.project_id),
        api.sprints.getAll(itemData.project_id),
        api.auth.getUsers(),
        api.comments.get(itemData.id),
        api.workItems.getAll(itemData.project_id),
        api.integrations.getGitLinks(undefined, itemData.id)
      ]);
      setEpics(epicsRes);
      setSprints(sprintsRes);
      setUsers(usersRes);
      setComments(commentsRes);
      setAllItems(allItemsRes.filter((i) => i.id !== itemId));
      setGitLinks(linksRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load work item details');
    }
  };

  useEffect(() => {
    if (!isOpen || !itemId) return;
    loadData();
  }, [isOpen, itemId]);

  if (!isOpen || !item) return null;

  const handleSaveOverview = async () => {
    try {
      setSaving(true);
      setError(null);
      await api.workItems.update(item.id, {
        title: title.trim(),
        description,
        status,
        priority,
        type,
        assignee_id: assigneeId || null,
        epic_id: epicId || null,
        sprint_id: sprintId || null,
        story_points: storyPoints ? Number(storyPoints) : null,
        due_date: dueDate || null,
        labels
      });
      onItemUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${item.item_key}?`)) {
      return;
    }
    try {
      setDeleting(true);
      await api.workItems.delete(item.id);
      onItemDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete work item');
    } finally {
      setDeleting(false);
    }
  };

  // Checklist Actions
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    try {
      const added = await api.workItems.addChecklist(item.id, newChecklistText.trim());
      setChecklists([...checklists, added]);
      setNewChecklistText('');
    } catch (err: any) {
      setError(err.message || 'Failed to add checklist item');
    }
  };

  const handleToggleChecklist = async (chkId: string) => {
    try {
      const updated = await api.workItems.toggleChecklist(chkId);
      setChecklists(checklists.map((c) => (c.id === chkId ? updated : c)));
    } catch (err: any) {
      setError(err.message || 'Failed to toggle checklist item');
    }
  };

  const handleDeleteChecklist = async (chkId: string) => {
    try {
      await api.workItems.deleteChecklist(chkId);
      setChecklists(checklists.filter((c) => c.id !== chkId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete checklist item');
    }
  };

  // Comments Actions
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const comment = await api.comments.create(item.id, newCommentText.trim());
      setComments([...comments, comment]);
      setNewCommentText('');
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.comments.delete(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  // Dependencies Actions
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepTargetId) return;
    try {
      const dep = await api.workItems.addDependency(item.id, newDepTargetId, newDepType);
      const targetItem = allItems.find((i) => i.id === newDepTargetId);
      setDependencies([...dependencies, { ...dep, target_item: targetItem }]);
      setNewDepTargetId('');
    } catch (err: any) {
      setError(err.message || 'Failed to link dependency');
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    try {
      await api.workItems.deleteDependency(depId);
      setDependencies(dependencies.filter((d) => d.id !== depId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove dependency');
    }
  };

  // Watcher Action
  const handleToggleWatch = async () => {
    try {
      const res = await api.workItems.toggleWatch(item.id);
      setIsWatching(res.watching);
    } catch (err: any) {
      setError(err.message || 'Failed to toggle watch status');
    }
  };

  // Time Entry Action
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(timeDuration);
    if (!mins || mins <= 0) {
      setError('Please enter a duration greater than zero minutes.');
      return;
    }
    try {
      await api.timeTracking.createEntry({
        project_id: item.project_id,
        work_item_id: item.id,
        duration_minutes: mins,
        description: timeDescription || `Logged work on ${item.item_key}`
      });
      setTimeDuration('');
      setTimeDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to log time');
    }
  };

  // Git Link Action
  const handleCreateGitLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkExternalId.trim() || !newLinkTitle.trim() || !newLinkUrl.trim()) return;
    try {
      setLinkingGit(true);
      const link = await api.integrations.createGitLink({
        project_id: item.project_id,
        work_item_id: item.id,
        link_type: newLinkType,
        external_id: newLinkExternalId.trim(),
        title: newLinkTitle.trim(),
        url: newLinkUrl.trim()
      });
      setGitLinks([link, ...gitLinks]);
      setNewLinkExternalId('');
      setNewLinkTitle('');
      setNewLinkUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to link git artifact');
    } finally {
      setLinkingGit(false);
    }
  };

  const completedChecklistCount = checklists.filter((c) => c.completed).length;
  const checklistProgress = checklists.length > 0
    ? Math.round((completedChecklistCount / checklists.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-elevated border border-emerald-950/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-950/10 bg-mint-50/60">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-emerald-900 text-white font-mono text-xs font-bold">
              {item.item_key}
            </span>
            <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
              {item.type}
            </span>
            {/* Watch Button */}
            <button
              onClick={handleToggleWatch}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                isWatching
                  ? 'bg-mint-200 border-emerald-400 text-emerald-950 font-bold'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{isWatching ? 'Watching' : 'Watch'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete Work Item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-200 bg-white">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Checklist</span>
            {checklists.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-mint-100 text-[10px] text-emerald-900 font-bold">
                {completedChecklistCount}/{checklists.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comments</span>
            {comments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] text-zinc-700 font-bold">
                {comments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dependencies')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'dependencies'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Dependencies</span>
            {dependencies.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] text-zinc-700 font-bold">
                {dependencies.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('timelog')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'timelog'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Log Time</span>
          </button>

          <button
            onClick={() => setActiveTab('git_devops')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'git_devops'
                ? 'border-emerald-800 text-emerald-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Git & DevOps</span>
            {gitLinks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-mint-100 text-[10px] text-emerald-900 font-bold">
                {gitLinks.length}
              </span>
            )}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Column */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-base font-bold text-zinc-900 border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Description & Acceptance Criteria
                  </label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details, acceptance criteria, or reproduction steps..."
                    className="w-full text-xs text-zinc-800 border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tags / Labels */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Labels
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {labels.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint-100 text-emerald-950 text-xs font-semibold"
                      >
                        {l}
                        <button
                          type="button"
                          onClick={() => setLabels(labels.filter((x) => x !== l))}
                          className="hover:text-rose-600 font-bold ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="Add tag and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          e.preventDefault();
                          if (!labels.includes(newTagInput.trim())) {
                            setLabels([...labels, newTagInput.trim()]);
                          }
                          setNewTagInput('');
                        }
                      }}
                      className="text-xs px-3 py-1.5 border border-zinc-200 rounded-xl flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sidebar Properties */}
              <div className="space-y-4 bg-zinc-50/70 p-4 rounded-2xl border border-zinc-200/80 text-xs">
                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="qa">QA Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Assignee
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
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
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Sprint
                  </label>
                  <select
                    value={sprintId}
                    onChange={(e) => setSprintId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="">Backlog (No Sprint)</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Epic
                  </label>
                  <select
                    value={epicId}
                    onChange={(e) => setEpicId(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="">None</option>
                    {epics.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={storyPoints}
                    onChange={(e) => setStoryPoints(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm">Subtask Checklist</h4>
                  <p className="text-xs text-zinc-500">Track granular steps and sub-deliverables.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${checklistProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-900">{checklistProgress}%</span>
                </div>
              </div>

              <div className="space-y-2">
                {checklists.map((chk) => (
                  <div
                    key={chk.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={chk.completed}
                        onChange={() => handleToggleChecklist(chk.id)}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span
                        className={`text-xs ${
                          chk.completed ? 'line-through text-zinc-400 font-normal' : 'text-zinc-800 font-medium'
                        }`}
                      >
                        {chk.text}
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteChecklist(chk.id)}
                      className="text-zinc-400 hover:text-rose-600 font-bold text-xs p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Add a new checklist step..."
                  className="flex-1 text-xs border border-zinc-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="submit" className="btn-pill-primary text-xs flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item</span>
                </button>
              </form>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-400">
                    No comments yet. Start the conversation or @mention a teammate!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              c.author?.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                c.author?.display_name || 'Author'
                              )}`
                            }
                            alt="Avatar"
                            className="h-6 w-6 rounded-full border border-emerald-900/10"
                          />
                          <span className="font-bold text-zinc-900">{c.author?.display_name || 'User'}</span>
                          <span className="text-[10px] text-zinc-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        {(c.author_id === user?.id || role === 'WorkspaceAdmin') && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-zinc-400 hover:text-rose-600 font-bold p-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment with mention hints */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>Quick mention:</span>
                  {users.slice(0, 4).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setNewCommentText((prev) => `${prev} @${u.display_name} `)}
                      className="px-2 py-0.5 rounded-full bg-mint-100 hover:bg-mint-200 text-emerald-950 font-semibold"
                    >
                      @{u.display_name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment or update... Type @name to mention team members"
                    className="flex-1 text-xs border border-zinc-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="submit" className="btn-pill-primary self-end text-xs flex items-center gap-1">
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Dependencies Tab */}
          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Work Item Dependencies</h4>
                <p className="text-xs text-zinc-500">
                  Define blockers and relationships. Circular blocking relations are automatically prevented.
                </p>
              </div>

              <div className="space-y-2">
                {dependencies.length === 0 ? (
                  <div className="text-center py-6 text-xs text-zinc-400">
                    No dependencies linked yet.
                  </div>
                ) : (
                  dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                          {dep.type.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-emerald-900 font-mono">
                          {dep.target_item?.item_key || 'ITEM'}
                        </span>
                        <span className="text-zinc-700 font-medium truncate max-w-[300px]">
                          {dep.target_item?.title || 'Linked Work Item'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteDependency(dep.id)}
                        className="text-zinc-400 hover:text-rose-600 font-bold p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddDependency} className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex flex-wrap gap-2 items-center text-xs">
                <span className="font-bold text-zinc-600">This task:</span>
                <select
                  value={newDepType}
                  onChange={(e) => setNewDepType(e.target.value as any)}
                  className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 font-semibold text-zinc-800"
                >
                  <option value="blocks">Blocks</option>
                  <option value="is_blocked_by">Is Blocked By</option>
                  <option value="relates_to">Relates To</option>
                </select>
                <select
                  value={newDepTargetId}
                  onChange={(e) => setNewDepTargetId(e.target.value)}
                  className="flex-1 bg-white border border-zinc-200 rounded-xl px-2 py-1.5 font-semibold text-zinc-800"
                >
                  <option value="">Select target item...</option>
                  {allItems.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.item_key}: {target.title}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-pill-primary text-xs">
                  Link Dependency
                </button>
              </form>
            </div>
          )}

          {/* Time Log Tab */}
          {activeTab === 'timelog' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Log Manual Effort</h4>
                <p className="text-xs text-zinc-500">
                  Record exact time spent on this work item. Stored in persistent time entries.
                </p>
              </div>

              <form onSubmit={handleLogTime} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={timeDuration}
                    onChange={(e) => setTimeDuration(e.target.value)}
                    placeholder="e.g. 45 or 90"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-semibold text-zinc-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-600 block mb-1">
                    Work Description / Notes
                  </label>
                  <input
                    type="text"
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    placeholder="e.g. Implemented backend authorization endpoint"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>

                <button type="submit" className="btn-pill-primary text-xs flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Log Time Entry</span>
                </button>
              </form>
            </div>
          )}

          {/* Git & DevOps Tab */}
          {activeTab === 'git_devops' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-zinc-900 text-sm">Linked Git Artifacts</h4>
                <p className="text-xs text-zinc-500">
                  Branches, commits, and pull requests associated with this work item across connected repositories.
                </p>
              </div>

              {/* Linked list */}
              <div className="space-y-2">
                {gitLinks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                    No commits or pull requests associated with this item yet. Use the form below or mention "{item.item_key}" in your commit message.
                  </div>
                ) : (
                  gitLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-mint-100 text-emerald-900">
                          {link.link_type === 'pull_request' ? (
                            <GitPullRequest className="h-3.5 w-3.5" />
                          ) : (
                            <GitBranch className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-emerald-900 text-[10px]">
                              {link.external_id}
                            </span>
                            <span className="font-semibold text-zinc-800">{link.title}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            By {link.author} • {new Date(link.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-zinc-400 hover:text-emerald-900 transition-colors"
                        title="Open external link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Manual Link Form */}
              <form onSubmit={handleCreateGitLink} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-3 text-xs">
                <div className="font-bold text-zinc-700">Manually Associate Git Artifact</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Artifact Type</label>
                    <select
                      value={newLinkType}
                      onChange={(e) => setNewLinkType(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                    >
                      <option value="commit">Commit</option>
                      <option value="pull_request">Pull Request</option>
                      <option value="branch">Branch</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 block mb-1">Reference ID / SHA / Branch</label>
                    <input
                      type="text"
                      required
                      value={newLinkExternalId}
                      onChange={(e) => setNewLinkExternalId(e.target.value)}
                      placeholder="e.g. c8a2b10 or #42 or feat/auth"
                      className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">Title / Message</label>
                  <input
                    type="text"
                    required
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="e.g. Fix login session timeout in production"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">Repository URL / Web Link</label>
                  <input
                    type="url"
                    required
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://github.com/org/repo/commit/..."
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={linkingGit}
                  className="btn-pill-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>{linkingGit ? 'Linking...' : 'Link to Work Item'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'overview' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-emerald-950/10 bg-zinc-50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOverview}
              disabled={saving}
              className="btn-pill-primary text-xs"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
