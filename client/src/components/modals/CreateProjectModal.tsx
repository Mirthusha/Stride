import React, { useState } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const { currentWorkspace, createProject } = useProject();
  const [name, setName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!projectKey || projectKey === name.slice(0, 3).toUpperCase()) {
      const autoKey = val.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      setProjectKey(autoKey);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectKey.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await createProject({
        name: name.trim(),
        project_key: projectKey.trim().toUpperCase(),
        description: description.trim()
      });
      setName('');
      setProjectKey('');
      setDescription('');
      onClose();
      onCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 shadow-elevated">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-mint-200 text-emerald-900 flex items-center justify-center">
              <FolderPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 font-sans">Create New Agile Project</h3>
              <p className="text-[11px] text-zinc-500">
                Under workspace: <span className="font-semibold">{currentWorkspace?.name || 'Active Workspace'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Mobile App Redesign"
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Project Key (Prefix for tasks, e.g. MOB) *
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="MOB"
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project goals..."
              className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-pill-subtle text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !projectKey.trim()}
              className="btn-pill-primary text-xs"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
