import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ProjectRisk } from '../types';
import { ShieldAlert, AlertTriangle, Plus, Trash2, Edit2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const RiskRegisterPage: React.FC = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();

  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [loading, setLoading] = useState(true);

  // New/Edit Risk Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('technical');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [contingencyPlan, setContingencyPlan] = useState('');
  const [status, setStatus] = useState<'identified' | 'mitigated' | 'accepted' | 'closed'>('identified');
  const [reviewDate, setReviewDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRisks = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const data = await api.risks.getAll(currentProject.id);
      setRisks(data);
    } catch (err) {
      console.error('[Risks] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisks();
  }, [currentProject]);

  const handleOpenCreate = () => {
    setEditingRiskId(null);
    setTitle('');
    setDescription('');
    setCategory('technical');
    setProbability(3);
    setImpact(3);
    setMitigationPlan('');
    setContingencyPlan('');
    setStatus('identified');
    setReviewDate('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: ProjectRisk) => {
    setEditingRiskId(r.id);
    setTitle(r.title);
    setDescription(r.description);
    setCategory(r.category);
    setProbability(r.probability);
    setImpact(r.impact);
    setMitigationPlan(r.mitigation_plan);
    setContingencyPlan(r.contingency_plan);
    setStatus(r.status);
    setReviewDate(r.review_date || '');
    setIsModalOpen(true);
  };

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !title.trim()) return;
    try {
      setSubmitting(true);
      if (editingRiskId) {
        await api.risks.update(editingRiskId, {
          title: title.trim(),
          description,
          category,
          probability: Number(probability),
          impact: Number(impact),
          mitigation_plan: mitigationPlan,
          contingency_plan: contingencyPlan,
          status,
          review_date: reviewDate || null
        });
      } else {
        await api.risks.create({
          project_id: currentProject.id,
          title: title.trim(),
          description,
          category,
          probability: Number(probability),
          impact: Number(impact),
          mitigation_plan: mitigationPlan,
          contingency_plan: contingencyPlan,
          status,
          review_date: reviewDate || null
        });
      }
      setIsModalOpen(false);
      loadRisks();
    } catch (err: any) {
      alert(err.message || 'Failed to save risk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRisk = async (id: string) => {
    if (!window.confirm('Delete this risk item?')) return;
    try {
      await api.risks.delete(id);
      setRisks(risks.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete risk');
    }
  };

  const highSeverityCount = risks.filter((r) => r.severity_score >= 12).length;
  const mitigatedCount = risks.filter((r) => r.status === 'mitigated' || r.status === 'closed').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Risk Engineering (CO4)
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Risk Register & Mitigation Matrix
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Systematic identification, quantified probability-impact scoring (1–25), and action plans.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn-pill-primary text-xs flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span>Identify New Risk</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Total Identified Risks
          </div>
          <div className="text-3xl font-bold text-zinc-950 mt-1">{risks.length}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Active risk log</div>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            High Severity Risks (&ge;12)
          </div>
          <div className="text-3xl font-bold text-rose-600 mt-1">{highSeverityCount}</div>
          <div className="text-[10px] text-rose-700 font-medium mt-0.5">Requires immediate mitigation plan</div>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
            Mitigated or Closed
          </div>
          <div className="text-3xl font-bold text-emerald-800 mt-1">{mitigatedCount}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">Risks neutralized or controlled</div>
        </div>
      </div>

      {/* Probability vs Impact Scoring Matrix Explainer */}
      <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-bold text-zinc-900 block text-sm">Quantitative Scoring Formula</span>
          <span className="text-zinc-600">
            Severity Score = Probability (1–5) &times; Impact (1–5). Scale: Low (1–4), Medium (5–9), High (10–14), Critical (15–25).
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">1-4 Low</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">5-9 Med</span>
          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">10-14 High</span>
          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">15-25 Critical</span>
        </div>
      </div>

      {/* Risks Table */}
      <div className="glass-panel rounded-3xl border border-emerald-950/10 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-emerald-950/10 flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-900">Project Risk Register</h3>
          <span className="text-xs text-zinc-500 font-mono">{risks.length} items logged</span>
        </div>

        {risks.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No risks identified yet. Click "Identify New Risk" above to log a potential risk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Risk Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Prob (1-5)</th>
                  <th className="py-3 px-4 text-center">Impact (1-5)</th>
                  <th className="py-3 px-4 text-center">Score (P&times;I)</th>
                  <th className="py-3 px-4">Mitigation Plan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5">
                {risks.map((r) => {
                  const score = r.severity_score;
                  const scoreBadge =
                    score >= 15
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : score >= 10
                      ? 'bg-orange-100 text-orange-800 border-orange-300'
                      : score >= 5
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                  return (
                    <tr key={r.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{r.title}</div>
                        <div className="text-[11px] text-zinc-500 max-w-xs truncate">{r.description}</div>
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[10px] text-zinc-700 tracking-wider">
                        {r.category}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-zinc-800">{r.probability}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-zinc-800">{r.impact}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold border text-xs ${scoreBadge}`}>
                          {score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                        {r.mitigation_plan || <span className="italic text-zinc-400">None specified</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'mitigated' || r.status === 'closed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1 text-zinc-500 hover:text-zinc-900"
                            title="Edit risk"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRisk(r.id)}
                            className="p-1 text-zinc-400 hover:text-rose-600"
                            title="Delete risk"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Create/Edit Risk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">
              {editingRiskId ? 'Edit Risk Record' : 'Identify New Project Risk'}
            </h3>

            <form onSubmit={handleSaveRisk} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Risk Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Third-party payment gateway API rate limiting"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Description & Root Cause</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of what might cause this risk..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="technical">Technical</option>
                    <option value="schedule">Schedule</option>
                    <option value="operational">Operational</option>
                    <option value="financial">Financial</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Probability (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-mono font-bold text-zinc-900"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Impact (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={impact}
                    onChange={(e) => setImpact(Number(e.target.value))}
                    required
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-mono font-bold text-zinc-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-mint-50 rounded-2xl border border-emerald-200 flex items-center justify-between font-mono font-bold">
                <span>Calculated Severity Score:</span>
                <span className="text-emerald-950 text-sm">{probability * impact} / 25</span>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Mitigation Plan (Preventative)</label>
                <input
                  type="text"
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                  placeholder="Actions taken beforehand to reduce probability..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Contingency Plan (Reactive)</label>
                <input
                  type="text"
                  value={contingencyPlan}
                  onChange={(e) => setContingencyPlan(e.target.value)}
                  placeholder="Backup strategy if risk materializes..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2 font-semibold text-zinc-800"
                  >
                    <option value="identified">Identified</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="accepted">Accepted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Review Date</label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
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
                  {submitting ? 'Saving...' : editingRiskId ? 'Update Risk' : 'Save Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
