import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ProjectRelease, WorkItem } from '../types';
import {
  GitBranch,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Trash2,
  Send,
  Sparkles,
  X,
  ExternalLink,
  Tag
} from 'lucide-react';

export const ReleasesPage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();

  const [releases, setReleases] = useState<ProjectRelease[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Release Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [gitTag, setGitTag] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Changelog & Release Notes Viewer Modal
  const [activeReleaseForNotes, setActiveReleaseForNotes] = useState<ProjectRelease | null>(null);
  const [generatingChangelog, setGeneratingChangelog] = useState(false);

  const canManageReleases = role === 'WorkspaceAdmin' || role === 'ProductOwner';

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [relRes, itemsRes] = await Promise.all([
        api.releases.getAll(currentProject.id),
        api.workItems.getAll(currentProject.id)
      ]);
      setReleases(relRes);
      setWorkItems(itemsRes);
    } catch (err) {
      console.error('[Releases] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !version.trim()) return;
    try {
      setSubmitting(true);
      await api.releases.create({
        project_id: currentProject.id,
        name: name.trim() || `Release v${version.trim()}`,
        version: version.trim(),
        description,
        target_date: targetDate || new Date().toISOString().split('T')[0],
        status: 'planned',
        git_tag: gitTag.trim() || `v${version.trim()}`,
        work_item_ids: selectedItemIds
      });
      setIsModalOpen(false);
      setName('');
      setVersion('');
      setDescription('');
      setTargetDate('');
      setGitTag('');
      setSelectedItemIds([]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create release');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: any) => {
    try {
      await api.releases.update(id, { status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update release status');
    }
  };

  const handlePublishRelease = async (rel: ProjectRelease) => {
    if (!confirm(`Are you sure you want to publish release "${rel.name}" (v${rel.version})?`)) return;
    try {
      const updated = await api.releases.publish(rel.id);
      if (activeReleaseForNotes?.id === rel.id) {
        setActiveReleaseForNotes(updated);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to publish release');
    }
  };

  const handleGenerateChangelog = async (releaseId: string) => {
    try {
      setGeneratingChangelog(true);
      const updated = await api.releases.generateChangelog(releaseId);
      setActiveReleaseForNotes(updated);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate changelog');
    } finally {
      setGeneratingChangelog(false);
    }
  };

  const handleDeleteRelease = async (releaseId: string) => {
    if (!confirm('Are you sure you want to delete this release record?')) return;
    try {
      await api.releases.delete(releaseId);
      if (activeReleaseForNotes?.id === releaseId) {
        setActiveReleaseForNotes(null);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete release');
    }
  };

  const filteredReleases = releases.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Delivery Management
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Releases & Deliverables Hub
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Organize production releases, automate changelogs from verified work items, and track deployment milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/90 border border-emerald-950/15 text-zinc-700 font-medium"
          >
            <option value="all">All Statuses ({releases.length})</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="released">Released</option>
          </select>

          {canManageReleases && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-pill-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Release</span>
            </button>
          )}
        </div>
      </div>

      {/* Release Cards */}
      <div className="space-y-4">
        {filteredReleases.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-xs text-zinc-400">
            {releases.length === 0
              ? 'No releases scheduled yet. Click "Create Release" above to bundle work items for production deployment.'
              : 'No releases match the selected status filter.'}
          </div>
        ) : (
          filteredReleases.map((rel) => {
            const linkedItems = rel.work_items || [];
            const doneCount = linkedItems.filter((i) => i.status === 'done').length;
            const progress = linkedItems.length > 0 ? Math.round((doneCount / linkedItems.length) * 100) : 0;

            return (
              <div
                key={rel.id}
                className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-mint-100 text-emerald-900">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-950 text-white">
                          v{rel.version}
                        </span>
                        <h3 className="font-bold text-base text-zinc-900">{rel.name}</h3>
                        {rel.git_tag && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                            <Tag className="h-2.5 w-2.5" />
                            {rel.git_tag}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{rel.description || 'Production milestone release'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Target: {rel.target_date}</span>
                    </div>

                    <select
                      value={rel.status}
                      disabled={!canManageReleases}
                      onChange={(e) => handleStatusChange(rel.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer uppercase tracking-wider ${
                        rel.status === 'released'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : rel.status === 'in_progress'
                          ? 'bg-blue-100 border-blue-300 text-blue-900'
                          : 'bg-zinc-100 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="released">Released</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {/* View Changelog & Notes */}
                    <button
                      onClick={() => setActiveReleaseForNotes(rel)}
                      className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-800" />
                      <span>Release Notes</span>
                    </button>

                    {/* Publish Release button */}
                    {canManageReleases && rel.status !== 'released' && (
                      <button
                        onClick={() => handlePublishRelease(rel)}
                        className="px-3 py-1.5 rounded-full bg-emerald-900 text-white text-xs font-medium hover:bg-emerald-950 transition-colors flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    {/* Delete Release button */}
                    {canManageReleases && (
                      <button
                        onClick={() => handleDeleteRelease(rel.id)}
                        className="p-1.5 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Release"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
                    <span>
                      Completion Progress ({doneCount} of {linkedItems.length} deliverables completed)
                    </span>
                    <span className="font-mono font-bold text-emerald-900">{progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Published stamp if released */}
                {rel.published_at && (
                  <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/60 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                    <span>
                      Published on {new Date(rel.published_at).toLocaleDateString()} at{' '}
                      {new Date(rel.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Linked Items Pills */}
                {linkedItems.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Associated Deliverables ({linkedItems.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {linkedItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-2xl bg-white border border-zinc-200 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-emerald-900 text-[10px]">
                              {item.item_key}
                            </span>
                            <span className="truncate text-zinc-800 font-medium">{item.title}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'done'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Release Notes & Changelog Drawer/Modal */}
      {activeReleaseForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-900">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900">
                    Release Notes: {activeReleaseForNotes.name} (v{activeReleaseForNotes.version})
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Target deployment date: {activeReleaseForNotes.target_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveReleaseForNotes(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
              <span className="text-xs text-zinc-600 font-medium">
                {activeReleaseForNotes.changelog && activeReleaseForNotes.changelog.length > 0
                  ? 'Changelog compiled from actual completed deliverables.'
                  : 'Compile changelog from verified deliverables in this release.'}
              </span>
              <button
                onClick={() => handleGenerateChangelog(activeReleaseForNotes.id)}
                disabled={generatingChangelog}
                className="btn-pill-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
              >
                <Sparkles className="h-3 w-3" />
                <span>{generatingChangelog ? 'Compiling...' : 'Generate Changelog'}</span>
              </button>
            </div>

            {/* Changelog Sections */}
            {activeReleaseForNotes.changelog && activeReleaseForNotes.changelog.length > 0 ? (
              <div className="space-y-4 pt-2">
                {activeReleaseForNotes.changelog.map((section, idx) => (
                  <div key={idx} className="space-y-2">
                    <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {section.title} ({section.items.length})
                    </h4>
                    <div className="space-y-1.5 pl-3 border-l-2 border-emerald-100">
                      {section.items.map((item) => (
                        <div key={item.id} className="text-xs text-zinc-700 flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-900 text-[11px]">
                            [{item.item_key}]
                          </span>
                          <span>{item.title}</span>
                          <span className="text-[10px] text-zinc-400 capitalize">({item.priority})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                No changelog generated yet. Click "Generate Changelog" to pull completed work items into structured release notes.
              </div>
            )}

            {/* Markdown notes preview */}
            {activeReleaseForNotes.release_notes && (
              <div className="space-y-1.5 pt-3 border-t border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Raw Release Notes (Markdown)
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={activeReleaseForNotes.release_notes}
                  className="w-full text-xs font-mono p-3 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 focus:outline-none resize-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setActiveReleaseForNotes(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Release Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-lg rounded-3xl p-6 shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-900 font-sans">Create Production Release</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Version Number *</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g. 1.2.0"
                    className="w-full text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Git Release Tag</label>
                  <input
                    type="text"
                    value={gitTag}
                    onChange={(e) => setGitTag(e.target.value)}
                    placeholder="e.g. v1.2.0"
                    className="w-full text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Release Name / Title</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 24 Milestone: Automation & QA Hub"
                  className="w-full text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Deployment Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of objectives, security patches, or features bundled..."
                  className="w-full text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Associate Work Items ({selectedItemIds.length} selected)
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-zinc-50 border border-zinc-200">
                  {workItems.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 p-2">No work items found in project.</div>
                  ) : (
                    workItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemIds([...selectedItemIds, item.id]);
                            } else {
                              setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                            }
                          }}
                          className="rounded text-emerald-900 focus:ring-emerald-700/30"
                        />
                        <span className="font-mono font-bold text-emerald-900 text-[10px]">
                          {item.item_key}
                        </span>
                        <span className="truncate text-zinc-700">{item.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Creating...' : 'Create Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
