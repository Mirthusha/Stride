import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  Sprint,
  SprintRetrospective,
  RetrospectiveItem,
  RetrospectiveCategory,
  WorkspaceMember
} from '../types';
import {
  Sparkles,
  ThumbsUp,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  X,
  Target,
  Zap,
  ListPlus,
  AlertCircle
} from 'lucide-react';

const CATEGORIES: {
  key: RetrospectiveCategory;
  label: string;
  subtitle: string;
  color: string;
  border: string;
  bg: string;
}[] = [
  {
    key: 'went_well',
    label: 'What went well?',
    subtitle: 'Practices, team wins, and accomplishments',
    color: 'text-emerald-900',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60'
  },
  {
    key: 'did_not_go_well',
    label: 'What did not go well?',
    subtitle: 'Friction, unexpected obstacles, and blockers',
    color: 'text-amber-900',
    border: 'border-amber-200',
    bg: 'bg-amber-50/60'
  },
  {
    key: 'improve',
    label: 'What should we improve?',
    subtitle: 'Ideas, process enhancements, and experiments',
    color: 'text-blue-900',
    border: 'border-blue-200',
    bg: 'bg-blue-50/60'
  },
  {
    key: 'action_items',
    label: 'Action Items & Commitments',
    subtitle: 'Accountable follow-ups with owners',
    color: 'text-purple-900',
    border: 'border-purple-200',
    bg: 'bg-purple-50/60'
  }
];

export const RetrospectivesPage: React.FC = () => {
  const { currentWorkspace, currentProject } = useProject();
  const { user, role } = useAuth();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [retrospectives, setRetrospectives] = useState<SprintRetrospective[]>([]);
  const [activeRetro, setActiveRetro] = useState<(SprintRetrospective & { items: RetrospectiveItem[] }) | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  // New Retro Modal
  const [isRetroModalOpen, setIsRetroModalOpen] = useState(false);
  const [retroTitle, setRetroTitle] = useState('');

  // Add Item state
  const [addingCategory, setAddingCategory] = useState<RetrospectiveCategory | null>(null);
  const [itemContent, setItemContent] = useState('');
  const [itemAssigneeId, setItemAssigneeId] = useState('');
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null);

  const canManageRetro = role === 'WorkspaceAdmin' || role === 'ScrumMaster' || role === 'ProductOwner';

  const loadInitial = async () => {
    if (!currentProject || !currentWorkspace) return;
    try {
      setLoading(true);
      const [sprintList, memRes] = await Promise.all([
        api.sprints.getAll(currentProject.id),
        api.workspaces.getMembers(currentWorkspace.id)
      ]);
      setSprints(sprintList);
      setMembers(memRes);

      const activeSprint = sprintList.find((s) => s.status === 'active') || sprintList[0];
      if (activeSprint) {
        setSelectedSprintId(activeSprint.id);
        await loadRetros(activeSprint.id);
      } else {
        setRetrospectives([]);
        setActiveRetro(null);
      }
    } catch (err) {
      console.error('[Retrospectives] Initial load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRetros = async (sprintId: string) => {
    if (!currentProject) return;
    try {
      const retros = await api.retrospectives.getAll(currentProject.id, sprintId);
      setRetrospectives(retros);
      if (retros.length > 0) {
        const fullRetro = await api.retrospectives.getById(retros[0].id);
        setActiveRetro(fullRetro);
      } else {
        setActiveRetro(null);
      }
    } catch (err) {
      console.error('[Retrospectives] Load retros error:', err);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [currentProject?.id, currentWorkspace?.id]);

  const handleSprintChange = async (sprintId: string) => {
    setSelectedSprintId(sprintId);
    await loadRetros(sprintId);
  };

  const handleCreateRetro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !selectedSprintId || !retroTitle.trim()) return;
    try {
      const sprint = sprints.find((s) => s.id === selectedSprintId);
      const created = await api.retrospectives.create({
        project_id: currentProject.id,
        sprint_id: selectedSprintId,
        title: retroTitle.trim()
      });
      setIsRetroModalOpen(false);
      setRetroTitle('');
      await loadRetros(selectedSprintId);
    } catch (err: any) {
      alert(err.message || 'Failed to create retrospective');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRetro || !addingCategory || !itemContent.trim()) return;
    try {
      await api.retrospectives.addItem(activeRetro.id, {
        category: addingCategory,
        content: itemContent.trim(),
        action_assignee_id: addingCategory === 'action_items' ? (itemAssigneeId || undefined) : undefined
      });
      setAddingCategory(null);
      setItemContent('');
      setItemAssigneeId('');
      // Reload active retro
      const full = await api.retrospectives.getById(activeRetro.id);
      setActiveRetro(full);
    } catch (err: any) {
      alert(err.message || 'Failed to add retrospective item');
    }
  };

  const handleVote = async (itemId: string) => {
    try {
      await api.retrospectives.voteItem(itemId);
      if (activeRetro) {
        const full = await api.retrospectives.getById(activeRetro.id);
        setActiveRetro(full);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register vote');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this observation?')) return;
    try {
      await api.retrospectives.deleteItem(itemId);
      if (activeRetro) {
        const full = await api.retrospectives.getById(activeRetro.id);
        setActiveRetro(full);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const handleConvertToWorkItem = async (itemId: string) => {
    try {
      setConvertingItemId(itemId);
      const res = await api.retrospectives.convertToWorkItem(itemId, {
        type: 'task',
        priority: 'high'
      });
      alert(`Success! Created Backlog Task: ${res.work_item.item_key} - "${res.work_item.title}"`);
      if (activeRetro) {
        const full = await api.retrospectives.getById(activeRetro.id);
        setActiveRetro(full);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to convert to work item');
    } finally {
      setConvertingItemId(null);
    }
  };

  const handleToggleCompleteRetro = async () => {
    if (!activeRetro) return;
    const nextStatus = activeRetro.status === 'active' ? 'completed' : 'active';
    try {
      await api.retrospectives.update(activeRetro.id, { status: nextStatus });
      const full = await api.retrospectives.getById(activeRetro.id);
      setActiveRetro(full);
    } catch (err: any) {
      alert(err.message || 'Failed to update retrospective status');
    }
  };

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Agile Inspection & Adaptation
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Sprint Retrospectives Hub
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Inspect sprint execution, gather team feedback, vote on key observations, and convert actionable improvements directly into backlog tasks.
          </p>
        </div>

        {/* Sprint selector & controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <select
            value={selectedSprintId}
            onChange={(e) => handleSprintChange(e.target.value)}
            className="text-xs px-3.5 py-2 rounded-full bg-white border border-emerald-950/15 font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
          >
            {sprints.length === 0 ? (
              <option value="">No Sprints Available</option>
            ) : (
              sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))
            )}
          </select>

          {canManageRetro && selectedSprintId && !activeRetro && (
            <button
              onClick={() => {
                setRetroTitle(`Retrospective for ${selectedSprint?.name || 'Sprint'}`);
                setIsRetroModalOpen(true);
              }}
              className="btn-pill-primary text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start Retrospective</span>
            </button>
          )}

          {activeRetro && (
            <button
              onClick={handleToggleCompleteRetro}
              className={`text-xs px-3.5 py-2 rounded-full font-bold border flex items-center gap-1.5 transition-colors ${
                activeRetro.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{activeRetro.status === 'completed' ? 'Completed' : 'Mark Completed'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Board */}
      {!activeRetro ? (
        <div className="glass-panel rounded-3xl p-16 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-mint-100 text-emerald-900 flex items-center justify-center">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-base text-zinc-900 font-sans">
            No Retrospective Started for {selectedSprint?.name || 'Selected Sprint'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {canManageRetro
              ? 'Click "Start Retrospective" above to open a dedicated reflection board for this sprint.'
              : 'The Scrum Master or Workspace Admin has not yet launched a retrospective board for this sprint.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 font-sans">{activeRetro.title}</span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ({activeRetro.items.length} observation{activeRetro.items.length !== 1 ? 's' : ''})
              </span>
            </div>
            {activeRetro.status === 'completed' && (
              <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Locked & Completed
              </span>
            )}
          </div>

          {/* 4 Category Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => {
              const catItems = activeRetro.items.filter((i) => i.category === cat.key);

              return (
                <div
                  key={cat.key}
                  className={`glass-panel rounded-3xl p-4 border ${cat.border} flex flex-col space-y-3 shadow-soft`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div>
                      <h3 className={`font-bold text-xs uppercase tracking-wider ${cat.color} font-sans`}>
                        {cat.label}
                      </h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{cat.subtitle}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      {catItems.length}
                    </span>
                  </div>

                  {/* Add Button */}
                  {activeRetro.status !== 'completed' && (
                    <button
                      onClick={() => {
                        setAddingCategory(cat.key);
                        setItemContent('');
                        setItemAssigneeId('');
                      }}
                      className="w-full py-1.5 px-3 rounded-2xl bg-white/80 hover:bg-white text-zinc-600 border border-dashed border-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add observation</span>
                    </button>
                  )}

                  {/* Add Item Inline Box */}
                  {addingCategory === cat.key && (
                    <form onSubmit={handleAddItem} className="p-3 rounded-2xl bg-white border border-emerald-950/20 shadow-sm space-y-2">
                      <textarea
                        autoFocus
                        rows={3}
                        required
                        value={itemContent}
                        onChange={(e) => setItemContent(e.target.value)}
                        placeholder={`Note for "${cat.label}"...`}
                        className="w-full text-xs p-2 rounded-xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-700/30 resize-none"
                      />

                      {cat.key === 'action_items' && (
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Owner / Assignee</label>
                          <select
                            value={itemAssigneeId}
                            onChange={(e) => setItemAssigneeId(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200"
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.user?.display_name || m.user_id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddingCategory(null)}
                          className="px-2.5 py-1 rounded-xl text-xs text-zinc-500 hover:bg-zinc-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-pill-primary text-xs py-1 px-3"
                        >
                          Add Card
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] pr-1">
                    {catItems.length === 0 ? (
                      <div className="text-center py-8 text-[11px] text-zinc-400 italic">
                        No entries yet
                      </div>
                    ) : (
                      catItems.map((item) => {
                        const hasVoted = item.voted_user_ids?.includes(user?.id || '');
                        const isOwn = item.user_id === user?.id;

                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-2.5 text-xs text-zinc-800"
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{item.content}</p>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                              {/* Contributor / Assignee */}
                              <span className="text-zinc-400 text-[10px] truncate max-w-[110px]">
                                {cat.key === 'action_items' && item.assignee
                                  ? `Owner: ${item.assignee.display_name}`
                                  : `By ${item.user?.display_name || 'Team'}`}
                              </span>

                              {/* Voting & Actions */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleVote(item.id)}
                                  className={`px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold transition-colors ${
                                    hasVoted
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                  }`}
                                  title="Vote on observation"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{item.votes || 0}</span>
                                </button>

                                {(isOwn || canManageRetro) && (
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1 rounded text-zinc-300 hover:text-rose-600 transition-colors"
                                    title="Delete card"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Convert to Work Item button for Action Items */}
                            {cat.key === 'action_items' && (
                              <div className="pt-1 border-t border-zinc-100">
                                {item.converted_work_item_id ? (
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-1 rounded-xl">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                                    <span>Converted to Backlog Task</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleConvertToWorkItem(item.id)}
                                    disabled={convertingItemId === item.id}
                                    className="w-full py-1 px-2.5 rounded-xl bg-zinc-900 hover:bg-emerald-950 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <ListPlus className="h-3 w-3" />
                                    <span>
                                      {convertingItemId === item.id
                                        ? 'Converting...'
                                        : 'Convert to Backlog Task'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Retrospective Modal */}
      {isRetroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-900 font-sans">Start Sprint Retrospective</h3>
              <button
                onClick={() => setIsRetroModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRetro} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Sprint</label>
                <input
                  type="text"
                  readOnly
                  value={selectedSprint?.name || 'Sprint'}
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-zinc-100 text-zinc-600 border border-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Retrospective Title *</label>
                <input
                  type="text"
                  required
                  value={retroTitle}
                  onChange={(e) => setRetroTitle(e.target.value)}
                  placeholder="e.g. Sprint 24 Reflection & Adaptation"
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRetroModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary text-xs py-2 px-5"
                >
                  Launch Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
