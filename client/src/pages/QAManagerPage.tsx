import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { TestSuite, TestCase, TestRun, TestExecution, QAMetrics } from '../types';
import {
  TestTubes,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Plus,
  Bug,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

export const QAManagerPage: React.FC = () => {
  const { currentProject } = useProject();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'metrics' | 'cases' | 'runs'>('metrics');
  const [metrics, setMetrics] = useState<QAMetrics | null>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [executions, setExecutions] = useState<TestExecution[]>([]);
  const [loading, setLoading] = useState(true);

  // New Suite Modal
  const [isSuiteModalOpen, setIsSuiteModalOpen] = useState(false);
  const [suiteTitle, setSuiteTitle] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');

  // New Case Modal
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [caseSuiteId, setCaseSuiteId] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDesc, setCaseDesc] = useState('');
  const [casePrecond, setCasePrecond] = useState('');
  const [caseSteps, setCaseSteps] = useState('');
  const [caseExpected, setCaseExpected] = useState('');
  const [casePriority, setCasePriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  // New Run Modal
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runTitle, setRunTitle] = useState('');

  // Execution result modal
  const [executingCase, setExecutingCase] = useState<TestCase | null>(null);
  const [execStatus, setExecStatus] = useState<'pass' | 'fail' | 'blocked' | 'not_run'>('pass');
  const [execActualResult, setExecActualResult] = useState('');
  const [execCreateDefect, setExecCreateDefect] = useState(true);

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [metricsRes, suitesRes, casesRes, runsRes] = await Promise.all([
        api.qa.getMetrics(currentProject.id),
        api.qa.getSuites(currentProject.id),
        api.qa.getCases(currentProject.id),
        api.qa.getRuns(currentProject.id)
      ]);
      setMetrics(metricsRes);
      setSuites(suitesRes);
      setCases(casesRes);
      setRuns(runsRes);

      if (runsRes.length > 0 && !selectedRun) {
        setSelectedRun(runsRes[0]);
        const execRes = await api.qa.getExecutions(runsRes[0].id);
        setExecutions(execRes);
      }
    } catch (err) {
      console.error('[QA] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  const handleSelectRun = async (run: TestRun) => {
    setSelectedRun(run);
    try {
      const execRes = await api.qa.getExecutions(run.id);
      setExecutions(execRes);
    } catch (err) {
      console.error('[QA] Load executions error:', err);
    }
  };

  const handleCreateSuite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !suiteTitle.trim()) return;
    try {
      await api.qa.createSuite(currentProject.id, suiteTitle.trim(), suiteDesc);
      setIsSuiteModalOpen(false);
      setSuiteTitle('');
      setSuiteDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create test suite');
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !caseSuiteId || !caseTitle.trim()) return;
    try {
      await api.qa.createCase({
        project_id: currentProject.id,
        suite_id: caseSuiteId,
        title: caseTitle.trim(),
        description: caseDesc,
        preconditions: casePrecond,
        steps: caseSteps,
        expected_result: caseExpected,
        priority: casePriority
      });
      setIsCaseModalOpen(false);
      setCaseTitle('');
      setCaseDesc('');
      setCasePrecond('');
      setCaseSteps('');
      setCaseExpected('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create test case');
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !runTitle.trim()) return;
    try {
      const run = await api.qa.createRun(currentProject.id, runTitle.trim());
      setIsRunModalOpen(false);
      setRunTitle('');
      await loadData();
      setSelectedRun(run);
    } catch (err: any) {
      alert(err.message || 'Failed to create test run');
    }
  };

  const handleExecuteResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun || !executingCase) return;
    try {
      await api.qa.recordExecution({
        test_run_id: selectedRun.id,
        test_case_id: executingCase.id,
        status: execStatus,
        actual_result: execActualResult || `Executed by ${user?.display_name}`,
        create_defect: execStatus === 'fail' && execCreateDefect ? {
          title: `[Defect]: ${executingCase.title}`,
          priority: executingCase.priority,
          description: `Test Case: ${executingCase.title}\nPreconditions: ${executingCase.preconditions}\nExpected: ${executingCase.expected_result}\nActual: ${execActualResult}`
        } : undefined
      });
      setExecutingCase(null);
      setExecActualResult('');
      // Reload executions and metrics
      const [execRes, metricsRes] = await Promise.all([
        api.qa.getExecutions(selectedRun.id),
        api.qa.getMetrics(currentProject!.id)
      ]);
      setExecutions(execRes);
      setMetrics(metricsRes);
    } catch (err: any) {
      alert(err.message || 'Failed to record test execution');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Quality Assurance (CO3)
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              QA & Test Management
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Define test suites, execute test runs, track pass rates, and link failed executions directly to defects.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-white border border-emerald-950/10 shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === 'metrics' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Metrics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === 'cases' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Suites & Test Cases ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === 'runs' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            Test Runs & Runner ({runs.length})
          </button>
        </div>
      </div>

      {/* METRICS DASHBOARD TAB */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Overall Pass Rate
              </div>
              <div className="text-3xl font-extrabold text-emerald-900 mt-1">
                {metrics.pass_rate_percentage}%
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {metrics.pass_count} passed out of {metrics.total_executions} runs
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Total Test Cases
              </div>
              <div className="text-3xl font-bold text-zinc-950 mt-1">
                {metrics.total_test_cases}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Across {suites.length} suites</div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Failed Executions
              </div>
              <div className="text-3xl font-bold text-rose-600 mt-1">
                {metrics.fail_count}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                {metrics.blocked_count} blocked executions
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Open Defects Linked
              </div>
              <div className="text-3xl font-bold text-amber-600 mt-1">
                {metrics.open_defects_count}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Bugs actively in backlog/in-progress</div>
            </div>
          </div>

          {/* Defect Severity Distribution Card */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-zinc-900">Open Defects by Severity</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="font-bold text-rose-800 uppercase text-[10px]">Critical</div>
                <div className="text-2xl font-bold text-rose-900 mt-1">
                  {metrics.defects_by_severity.critical || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200">
                <div className="font-bold text-orange-800 uppercase text-[10px]">High</div>
                <div className="text-2xl font-bold text-orange-900 mt-1">
                  {metrics.defects_by_severity.high || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="font-bold text-amber-800 uppercase text-[10px]">Medium</div>
                <div className="text-2xl font-bold text-amber-900 mt-1">
                  {metrics.defects_by_severity.medium || 0}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="font-bold text-emerald-800 uppercase text-[10px]">Low</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">
                  {metrics.defects_by_severity.low || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUITES & TEST CASES TAB */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900">Test Suites & Verified Test Cases</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsSuiteModalOpen(true)}
                className="px-4 py-2 rounded-full border border-emerald-950/20 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-700" />
                <span>New Suite</span>
              </button>
              <button
                onClick={() => setIsCaseModalOpen(true)}
                disabled={suites.length === 0}
                className="btn-pill-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Test Case</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {suites.map((suite) => {
              const suiteCases = cases.filter((c) => c.suite_id === suite.id);
              return (
                <div
                  key={suite.id}
                  className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950">{suite.title}</h4>
                      <p className="text-xs text-zinc-500">{suite.description || 'Test suite specifications'}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-emerald-950 text-xs font-bold font-mono">
                      {suiteCases.length} Cases
                    </span>
                  </div>

                  <div className="space-y-2">
                    {suiteCases.length === 0 ? (
                      <div className="py-4 text-center text-xs text-zinc-400">
                        No test cases in this suite yet. Add a test case above.
                      </div>
                    ) : (
                      suiteCases.map((tc) => (
                        <div
                          key={tc.id}
                          className="p-3 rounded-2xl bg-white border border-zinc-200 text-xs flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  tc.priority === 'critical'
                                    ? 'bg-rose-100 text-rose-800'
                                    : tc.priority === 'high'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {tc.priority}
                              </span>
                              <span className="font-bold text-zinc-900">{tc.title}</span>
                            </div>
                            {tc.preconditions && (
                              <p className="text-zinc-500 text-[11px]">
                                <span className="font-semibold text-zinc-700">Preconditions:</span> {tc.preconditions}
                              </p>
                            )}
                            <p className="text-zinc-600 text-[11px]">
                              <span className="font-semibold text-zinc-700">Expected:</span> {tc.expected_result}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEST RUNS & RUNNER TAB */}
      {activeTab === 'runs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900">Execution Cycles & Test Runs</h3>
            <button
              onClick={() => setIsRunModalOpen(true)}
              className="btn-pill-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Test Run</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Run Selection Sidebar */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2">
                Select Test Run
              </div>
              {runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRun(r)}
                  className={`w-full text-left p-3.5 rounded-2xl text-xs transition-all flex items-center justify-between border ${
                    selectedRun?.id === r.id
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">{r.title}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedRun?.id === r.id ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              ))}
            </div>

            {/* Test Run Execution Interface */}
            <div className="md:col-span-3 space-y-4">
              {selectedRun ? (
                <div className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <h4 className="font-bold text-base text-zinc-950">{selectedRun.title}</h4>
                      <p className="text-xs text-zinc-500">
                        Execute test cases against this run. Record Pass/Fail with 1-click defect logging.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
                      {executions.length} Executed
                    </span>
                  </div>

                  <div className="space-y-3">
                    {cases.map((tc) => {
                      const exec = executions.find((e) => e.test_case_id === tc.id);
                      return (
                        <div
                          key={tc.id}
                          className="p-4 rounded-2xl bg-white border border-zinc-200/90 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{tc.title}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-semibold">
                                {tc.suite?.title || 'Suite'}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-[11px]">{tc.expected_result}</p>
                            {exec?.defect && (
                              <div className="flex items-center gap-1.5 text-rose-700 font-bold text-[11px] mt-1">
                                <Bug className="h-3 w-3" />
                                <span>Defect Bug Created: {exec.defect.item_key}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {exec ? (
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                  exec.status === 'pass'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : exec.status === 'fail'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {exec.status === 'pass' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                <span>{exec.status}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px] italic mr-2">Not Run</span>
                            )}

                            <button
                              onClick={() => {
                                setExecutingCase(tc);
                                setExecStatus('pass');
                                setExecActualResult('');
                              }}
                              className="px-3 py-1.5 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-800 font-semibold text-xs flex items-center gap-1"
                            >
                              <Play className="h-3 w-3" />
                              <span>{exec ? 'Re-run' : 'Execute'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400">
                  Select or create a test run to start executing tests.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execute Test Case Modal */}
      {executingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Record Test Execution</h3>
            <div className="p-3 rounded-2xl bg-mint-50 text-xs border border-emerald-200">
              <span className="font-bold text-emerald-950">{executingCase.title}</span>
              <p className="text-zinc-600 mt-1">Expected: {executingCase.expected_result}</p>
            </div>

            <form onSubmit={handleExecuteResult} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Execution Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['pass', 'fail', 'blocked', 'not_run'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setExecStatus(st)}
                      className={`py-2 rounded-xl font-bold uppercase text-xs border transition-all ${
                        execStatus === st
                          ? st === 'pass'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'fail'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Actual Result & Notes</label>
                <textarea
                  rows={3}
                  value={execActualResult}
                  onChange={(e) => setExecActualResult(e.target.value)}
                  placeholder="Observed behavior during execution..."
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              {execStatus === 'fail' && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={execCreateDefect}
                      onChange={(e) => setExecCreateDefect(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                    />
                    <span>1-Click Create & Link Defect Bug in Backlog</span>
                  </label>
                  <p className="text-[11px] text-rose-700 leading-snug">
                    Automatically files a defect bug with reproduction details traceable to this test case.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExecutingCase(null)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Save Execution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Suite Modal */}
      {isSuiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Create Test Suite</h3>
            <form onSubmit={handleCreateSuite} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Suite Name</label>
                <input
                  type="text"
                  value={suiteTitle}
                  onChange={(e) => setSuiteTitle(e.target.value)}
                  placeholder="e.g. Authentication & RBAC Suite"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={suiteDesc}
                  onChange={(e) => setSuiteDesc(e.target.value)}
                  placeholder="Scope of testing..."
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSuiteModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Create Suite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Test Case Modal */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Create Test Case</h3>
            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Parent Suite</label>
                <select
                  value={caseSuiteId}
                  onChange={(e) => setCaseSuiteId(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-semibold text-zinc-800"
                >
                  <option value="">Select a suite...</option>
                  {suites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Test Case Title</label>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="e.g. Verify Developer role cannot delete work items"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Priority</label>
                  <select
                    value={casePriority}
                    onChange={(e) => setCasePriority(e.target.value as any)}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-semibold text-zinc-800"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-600 block mb-1">Preconditions</label>
                  <input
                    type="text"
                    value={casePrecond}
                    onChange={(e) => setCasePrecond(e.target.value)}
                    placeholder="e.g. Authenticated as Developer"
                    className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Execution Steps</label>
                <textarea
                  rows={2}
                  value={caseSteps}
                  onChange={(e) => setCaseSteps(e.target.value)}
                  placeholder="1. Navigate to Backlog&#10;2. Click Delete button on a task"
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-600 block mb-1">Expected Result</label>
                <input
                  type="text"
                  value={caseExpected}
                  onChange={(e) => setCaseExpected(e.target.value)}
                  placeholder="e.g. Button is disabled and API returns 403 Forbidden"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCaseModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Create Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Test Run Modal */}
      {isRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-elevated border border-emerald-950/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950">Initialize New Test Run</h3>
            <form onSubmit={handleCreateRun} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-600 block mb-1">Run Title</label>
                <input
                  type="text"
                  value={runTitle}
                  onChange={(e) => setRunTitle(e.target.value)}
                  placeholder="e.g. Sprint 14 Regression Cycle"
                  required
                  className="w-full bg-white border border-zinc-200 rounded-xl p-2.5 font-bold text-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRunModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-300 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary text-xs">
                  Initialize Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
