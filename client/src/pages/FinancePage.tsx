import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ProjectBudget, Expense, FinancialSummary } from '../types';
import {
  CircleDollarSign,
  TrendingUp,
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sliders,
  DollarSign
} from 'lucide-react';

export const FinancePage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // New Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Software Licenses');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Edit Budget Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [hourlyRateInput, setHourlyRateInput] = useState('');
  const [submittingBudget, setSubmittingBudget] = useState(false);

  const canManageFinance = role === 'WorkspaceAdmin' || role === 'ProductOwner';

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [sumRes, budRes, expRes] = await Promise.all([
        api.finance.getSummary(currentProject.id),
        api.finance.getBudget(currentProject.id),
        api.finance.getExpenses(currentProject.id)
      ]);
      setSummary(sumRes);
      setBudget(budRes);
      setExpenses(expRes);
      setTotalBudgetInput(String(budRes.total_budget));
      setHourlyRateInput(String(budRes.hourly_rate));
    } catch (err: any) {
      console.error('[Finance] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    try {
      setSubmittingExpense(true);
      await api.finance.createExpense({
        project_id: currentProject.id,
        amount: numAmount,
        currency: budget?.currency || 'USD',
        category,
        description,
        date,
        receipt_url: receiptUrl || null
      });
      setIsExpenseModalOpen(false);
      setAmount('');
      setDescription('');
      setReceiptUrl('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit expense');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await api.finance.updateExpenseStatus(id, newStatus);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      setSubmittingBudget(true);
      await api.finance.updateBudget({
        project_id: currentProject.id,
        total_budget: Number(totalBudgetInput),
        hourly_rate: Number(hourlyRateInput)
      });
      setIsBudgetModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update budget');
    } finally {
      setSubmittingBudget(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Financial Governance
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Budgets, Labor Costs & Expenses
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Real-time project financial tracking combining recorded labor hours and approved direct expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageFinance && (
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="px-4 py-2 rounded-full border border-emerald-950/20 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-sm"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-700" />
              <span>Configure Rates & Budget</span>
            </button>
          )}

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="btn-pill-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Submit Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Total Budget
            </div>
            <div className="text-2xl font-bold text-zinc-950 mt-1">
              ${summary.total_budget.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-zinc-500">{summary.currency}</span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Rate: ${summary.hourly_rate}/hr</div>
          </div>

          <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Tracked Labor Cost
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">
              ${summary.total_labor_cost.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              From {summary.total_tracked_hours} logged hours
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Approved Direct Expenses
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">
              ${summary.total_approved_expenses.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">
              ${summary.total_pending_expenses.toLocaleString()} pending review
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Remaining Budget
            </div>
            <div className={`text-2xl font-bold mt-1 ${summary.remaining_budget >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              ${summary.remaining_budget.toLocaleString()}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Utilization: {summary.utilization_percentage}%
            </div>
          </div>
        </div>
      )}

      {/* Utilization Progress Meter */}
      {summary && (
        <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
            <span>Budget Utilization Meter</span>
            <span>
              ${summary.combined_actual_cost.toLocaleString()} of ${summary.total_budget.toLocaleString()} ({summary.utilization_percentage}%)
            </span>
          </div>
          <div className="w-full bg-zinc-200/80 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                summary.utilization_percentage > 90
                  ? 'bg-rose-500'
                  : summary.utilization_percentage > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, summary.utilization_percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Direct Project Expenses Table */}
      <div className="glass-panel rounded-3xl border border-emerald-950/10 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-emerald-950/10 flex items-center justify-between">
          <h3 className="font-bold text-sm text-zinc-900">Project Expenses & Invoices</h3>
          <span className="text-xs text-zinc-500">
            Pending expenses are excluded from actual cost until approved.
          </span>
        </div>

        {expenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No expenses recorded yet. Submit an expense or receipt reference above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManageFinance && <th className="py-3 px-4 text-center">Review</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-zinc-700">{exp.date}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">{exp.category}</td>
                    <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{exp.description}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={
                            exp.submitter?.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              exp.submitter?.display_name || 'User'
                            )}`
                          }
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <span className="font-medium text-zinc-800">{exp.submitter?.display_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-zinc-900 font-mono">
                      ${Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          exp.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exp.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </td>
                    {canManageFinance && (
                      <td className="py-3 px-4 text-center">
                        {exp.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleUpdateStatus(exp.id, 'approved')}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(exp.id, 'rejected')}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Resolved</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Submit Project Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 249.99"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-semibold text-zinc-800"
                >
                  <option value="Software Licenses">Software Licenses</option>
                  <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                  <option value="Hardware / Equipment">Hardware / Equipment</option>
                  <option value="Consulting / Legal">Consulting / Legal</option>
                  <option value="Travel / Events">Travel / Events</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Supabase Pro subscription for production cluster"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Receipt Reference / URL</label>
                <input
                  type="text"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="e.g. INV-2026-0498"
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="btn-pill-primary text-xs"
                >
                  {submittingExpense ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Rates & Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Configure Budget & Hourly Rate</h3>
            <form onSubmit={handleUpdateBudget} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Total Project Budget ($)</label>
                <input
                  type="number"
                  min="0"
                  value={totalBudgetInput}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Standard Hourly Labor Rate ($/hr)</label>
                <input
                  type="number"
                  min="0"
                  value={hourlyRateInput}
                  onChange={(e) => setHourlyRateInput(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBudget}
                  className="btn-pill-primary text-xs"
                >
                  {submittingBudget ? 'Saving...' : 'Update Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
