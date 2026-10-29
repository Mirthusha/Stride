import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Objective, KeyResult } from '../types';
import { Compass, Target, Plus, CheckCircle2, AlertCircle, Edit3 } from 'lucide-react';

export const OKRsPage: React.FC = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);

  // New Objective Modal
  const [isObjModalOpen, setIsObjModalOpen] = useState(false);
  const [objTitle, setObjTitle] = useState('');
  const [objDesc, setObjDesc] = useState('');
  const [objCategory, setObjCategory] = useState('Product');
  const [objDueDate, setObjDueDate] = useState('');

  // New Key Result Modal
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null);
  const [krTitle, setKrTitle] = useState('');
  const [krTargetValue, setKrTargetValue] = useState('100');
  const [krCurrentValue, setKrCurrentValue] = useState('0');
  const [krUnit, setKrUnit] = useState('%');

  const loadOKRs = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await api.okrs.getAll(currentProject.id);
      setObjectives(data);
    } catch (err) {
      console.error('[OKRs] Error loading objectives:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOKRs();
  }, [currentProject]);

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !objTitle.trim()) return;
    try {
      await api.okrs.create({
        project_id: currentProject.id,
        title: objTitle.trim(),
        description: objDesc,
        category: objCategory,
        due_date: objDueDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
      });
      setIsObjModalOpen(false);
      setObjTitle('');
      setObjDesc('');
      loadOKRs();
    } catch (err: any) {
      alert(err.message || 'Failed to create objective');
    }
  };

  const handleAddKeyResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeObjectiveId || !krTitle.trim()) return;
    try {
      await api.okrs.addKeyResult(activeObjectiveId, {
        title: krTitle.trim(),
        target_value: Number(krTargetValue),
        current_value: Number(krCurrentValue),
        unit: krUnit || '%'
      });
      setActiveObjectiveId(null);
      setKrTitle('');
      setKrTargetValue('100');
      setKrCurrentValue('0');
      loadOKRs();
    } catch (err: any) {
      alert(err.message || 'Failed to add key result');
    }
  };

  const handleQuickUpdateKR = async (krId: string, currentVal: number) => {
    try {
      await api.okrs.updateKeyResult(krId, currentVal);
      loadOKRs();
    } catch (err: any) {
      alert(err.message || 'Failed to update key result');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Strategic Alignment
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Objectives & Key Results (OKRs)
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Define high-level engineering objectives and track quantitative progress across key results.
          </p>
        </div>

        <button
          onClick={() => setIsObjModalOpen(true)}
          className="btn-pill-primary text-xs flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Objective</span>
        </button>
      </div>

      {/* Objectives List */}
      <div className="space-y-6">
        {objectives.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center text-xs text-zinc-400">
            No objectives defined yet. Click "New Objective" above to establish strategic goals.
          </div>
        ) : (
          objectives.map((obj) => (
            <div
              key={obj.id}
              className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-mint-100 text-emerald-900 mt-0.5">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                        {obj.category || 'Strategic'}
                      </span>
                      <h3 className="font-bold text-base text-zinc-900">{obj.title}</h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{obj.description || 'Strategic objective for this cycle'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase">Progress</div>
                    <div className="text-xl font-mono font-extrabold text-emerald-950">
                      {obj.progress_percentage || 0}%
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveObjectiveId(obj.id)}
                    className="btn-pill-primary text-xs flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add KR</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${obj.progress_percentage || 0}%` }}
                />
              </div>

              {/* Key Results List */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Key Results & Numeric Milestones
                </div>

                {obj.key_results && obj.key_results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {obj.key_results.map((kr) => (
                      <div
                        key={kr.id}
                        className="p-3.5 rounded-2xl bg-white border border-zinc-200 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 truncate max-w-[200px]">{kr.title}</span>
                          <span className="font-mono font-bold text-emerald-900">
                            {kr.current_value} / {kr.target_value} {kr.unit}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max={kr.target_value}
                            value={kr.current_value}
                            onChange={(e) => handleQuickUpdateKR(kr.id, Number(e.target.value))}
                            className="flex-1 accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] font-bold text-zinc-500 w-10 text-right">
                            {kr.progress_percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-xs text-zinc-400 italic">
                    No key results defined for this objective. Click "Add KR" to measure progress.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Objective Modal */}
      {isObjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Create Objective</h3>
            <form onSubmit={handleCreateObjective} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Objective Title</label>
                <input
                  type="text"
                  value={objTitle}
                  onChange={(e) => setObjTitle(e.target.value)}
                  placeholder="e.g. Elevate Core Architecture to Zero-Downtime Releases"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={objDesc}
                  onChange={(e) => setObjDesc(e.target.value)}
                  placeholder="Why this objective matters..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Category</label>
                  <select
                    value={objCategory}
                    onChange={(e) => setObjCategory(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="Product">Product</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Quality">Quality</option>
                    <option value="Security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={objDueDate}
                    onChange={(e) => setObjDueDate(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsObjModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Create Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Key Result Modal */}
      {activeObjectiveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Add Quantitative Key Result</h3>
            <form onSubmit={handleAddKeyResult} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Key Result Description</label>
                <input
                  type="text"
                  value={krTitle}
                  onChange={(e) => setKrTitle(e.target.value)}
                  placeholder="e.g. Achieve 90% unit test coverage across API services"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Target Value</label>
                  <input
                    type="number"
                    min="1"
                    value={krTargetValue}
                    onChange={(e) => setKrTargetValue(e.target.value)}
                    required
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-mono font-bold text-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Current Value</label>
                  <input
                    type="number"
                    min="0"
                    value={krCurrentValue}
                    onChange={(e) => setKrCurrentValue(e.target.value)}
                    required
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-mono font-bold text-zinc-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={krUnit}
                    onChange={(e) => setKrUnit(e.target.value)}
                    placeholder="%"
                    required
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-mono text-zinc-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveObjectiveId(null)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Save Key Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
