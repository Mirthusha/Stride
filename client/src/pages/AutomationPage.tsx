import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { AutomationRule } from '../types';
import { Bot, Zap, Plus, CheckCircle2, ShieldCheck, Power, Activity } from 'lucide-react';

export const AutomationPage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Rule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<'item_created' | 'status_changed' | 'sprint_completed' | 'test_failed'>('item_created');
  const [actionType, setActionType] = useState<'create_notification' | 'add_label' | 'set_status' | 'assign_to'>('create_notification');
  const [actionValue, setActionValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canManage = role === 'WorkspaceAdmin' || role === 'ProductOwner' || role === 'ScrumMaster';

  const loadRules = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await api.automation.getRules(currentProject.id);
      setRules(data);
    } catch (err) {
      console.error('[Automation] Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [currentProject]);

  const handleToggle = async (id: string) => {
    try {
      const updated = await api.automation.toggleRule(id);
      setRules(rules.map((r) => (r.id === id ? updated : r)));
    } catch (err: any) {
      alert(err.message || 'Failed to toggle rule');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !name.trim()) return;
    try {
      setSubmitting(true);
      await api.automation.createRule({
        project_id: currentProject.id,
        name: name.trim(),
        description,
        trigger,
        action: {
          type: actionType,
          value: actionValue || 'automated-action'
        }
      });
      setIsModalOpen(false);
      setName('');
      setDescription('');
      setActionValue('');
      loadRules();
    } catch (err: any) {
      alert(err.message || 'Failed to create automation rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Server-Side Automation
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Rule-Based Agile Automations
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Execute trusted backend actions on work-item creation, QA test failures, and sprint milestones.
          </p>
        </div>

        {canManage && (
          <button onClick={() => setIsModalOpen(true)} className="btn-pill-primary text-xs flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Automation Rule</span>
          </button>
        )}
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-xs text-zinc-400">
            No automation rules configured yet. Click "Create Automation Rule" above to automate repetitive workflows.
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`glass-panel rounded-3xl p-5 border transition-all shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                rule.enabled ? 'border-emerald-950/10' : 'border-zinc-200 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${rule.enabled ? 'bg-mint-100 text-emerald-900' : 'bg-zinc-100 text-zinc-500'}`}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900">{rule.name}</h3>
                    {rule.description && <p className="text-xs text-zinc-500">{rule.description}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 font-medium">
                    <span className="font-bold text-zinc-500">WHEN:</span>
                    <span className="font-mono text-[11px] font-bold">{rule.trigger.replace('_', ' ')}</span>
                  </div>

                  <span className="text-zinc-400">&rarr;</span>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-medium">
                    <span className="font-bold text-emerald-700">THEN:</span>
                    <span className="font-mono text-[11px] font-bold">
                      {rule.action.type.replace('_', ' ')}: {String(rule.action.value || '')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right text-[11px]">
                  <div className="font-mono font-bold text-zinc-800">{rule.execution_count} runs</div>
                  {rule.last_executed_at && (
                    <div className="text-[10px] text-zinc-400">
                      {new Date(rule.last_executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleToggle(rule.id)}
                  disabled={!canManage}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    rule.enabled
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-200 text-zinc-600'
                  }`}
                  title="Toggle rule status"
                >
                  <Power className="h-3 w-3" />
                  <span>{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Create Automation Rule</h3>
            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Rule Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Notify QA team when test fails"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explanation of purpose..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Trigger Event</label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-900"
                  >
                    <option value="item_created">Work Item Created</option>
                    <option value="status_changed">Status Changed on Item</option>
                    <option value="test_failed">QA Test Run Failed</option>
                    <option value="sprint_completed">Sprint Completed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Action to Execute</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-900 mb-2"
                  >
                    <option value="create_notification">Send Notification</option>
                    <option value="add_label">Add Tag/Label</option>
                    <option value="set_status">Change Status</option>
                    <option value="assign_to">Assign Work Item</option>
                  </select>

                  <input
                    type="text"
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    placeholder={
                      actionType === 'create_notification'
                        ? 'Notification message text...'
                        : actionType === 'add_label'
                        ? 'Label name (e.g. automated-triage)'
                        : 'Action parameter value'
                    }
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-pill-primary text-xs">
                  {submitting ? 'Saving...' : 'Save Automation Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
