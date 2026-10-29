import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  PipelineExecution,
  GitIntegrationLink,
  IntegrationStatus
} from '../types';
import {
  GitPullRequest,
  GitBranch,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Shield,
  Key,
  FolderGit2,
  Unlink,
  Link as LinkIcon
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { currentProject } = useProject();
  const { role } = useAuth();
  const canManageIntegrations = role === 'WorkspaceAdmin' || role === 'ProductOwner';

  const [activeTab, setActiveTab] = useState<'github' | 'gitlab' | 'cicd'>('github');
  const [loading, setLoading] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // GitHub state
  const [ghStatus, setGhStatus] = useState<any>(null);
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [ghSecret, setGhSecret] = useState('');
  const [ghTesting, setGhTesting] = useState(false);
  const [ghFeedback, setGhFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // GitLab state
  const [glStatus, setGlStatus] = useState<any>(null);
  const [glOwner, setGlOwner] = useState('');
  const [glRepo, setGlRepo] = useState('');
  const [glApiUrl, setGlApiUrl] = useState('https://gitlab.com/api/v4');
  const [glToken, setGlToken] = useState('');
  const [glSecret, setGlSecret] = useState('');
  const [glTesting, setGlTesting] = useState(false);
  const [glFeedback, setGlFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // CI/CD state
  const [pipelines, setPipelines] = useState<PipelineExecution[]>([]);
  const [triggerBranch, setTriggerBranch] = useState('main');
  const [triggerPipelineName, setTriggerPipelineName] = useState('CI Build & Verification');
  const [triggering, setTriggering] = useState(false);
  const [gitLinks, setGitLinks] = useState<GitIntegrationLink[]>([]);

  const loadData = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const [ghRes, glRes, runsRes, linksRes] = await Promise.all([
        api.integrations.getGithubStatus(currentProject.id),
        api.integrations.getGitlabStatus(currentProject.id),
        api.integrations.getPipelineRuns(currentProject.id),
        api.integrations.getGitLinks(currentProject.id)
      ]);

      setGhStatus(ghRes);
      if (ghRes.configured) {
        setGhOwner(ghRes.repo_owner || '');
        setGhRepo(ghRes.repo_name || '');
      }

      setGlStatus(glRes);
      if (glRes.configured) {
        setGlOwner(glRes.repo_owner || '');
        setGlRepo(glRes.repo_name || '');
        if (glRes.api_url) setGlApiUrl(glRes.api_url);
      }

      setPipelines(runsRes);
      setGitLinks(linksRes);
    } catch (err) {
      console.error('[Integrations] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject]);

  // GitHub Handlers
  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !ghOwner || !ghRepo) return;
    try {
      setGhTesting(true);
      setGhFeedback(null);
      await api.integrations.saveGithubConfig({
        project_id: currentProject.id,
        repo_owner: ghOwner.trim(),
        repo_name: ghRepo.trim(),
        access_token: ghToken.trim() || undefined,
        webhook_secret: ghSecret.trim() || undefined
      });
      setGhFeedback({ success: true, message: 'Configuration saved. Testing repository connection...' });

      // Run live test connection
      const testRes = await api.integrations.testGithubConnection(currentProject.id);
      if (testRes.success) {
        setGhFeedback({
          success: true,
          message: `Connected successfully to GitHub repository: ${testRes.repository?.full_name}`
        });
      }
      loadData();
    } catch (err: any) {
      setGhFeedback({ success: false, message: err.message || 'Failed to connect to GitHub' });
    } finally {
      setGhTesting(false);
    }
  };

  const handleTestGithub = async () => {
    if (!currentProject) return;
    try {
      setGhTesting(true);
      setGhFeedback(null);
      const testRes = await api.integrations.testGithubConnection(currentProject.id);
      if (testRes.success) {
        setGhFeedback({
          success: true,
          message: `Connection verified! Repository: ${testRes.repository?.full_name} (${testRes.repository?.default_branch})`
        });
      }
      loadData();
    } catch (err: any) {
      setGhFeedback({ success: false, message: err.message || 'Verification failed' });
    } finally {
      setGhTesting(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!currentProject || !confirm('Are you sure you want to disconnect GitHub?')) return;
    try {
      await api.integrations.disconnectGithub(currentProject.id);
      setGhToken('');
      setGhSecret('');
      setGhFeedback({ success: true, message: 'GitHub repository disconnected.' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  // GitLab Handlers
  const handleSaveGitlab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !glRepo) return;
    try {
      setGlTesting(true);
      setGlFeedback(null);
      await api.integrations.saveGitlabConfig({
        project_id: currentProject.id,
        repo_owner: glOwner.trim() || undefined,
        repo_name: glRepo.trim(),
        api_url: glApiUrl.trim(),
        access_token: glToken.trim() || undefined,
        webhook_secret: glSecret.trim() || undefined
      });
      setGlFeedback({ success: true, message: 'Configuration saved. Testing repository connection...' });

      const testRes = await api.integrations.testGitlabConnection(currentProject.id);
      if (testRes.success) {
        setGlFeedback({
          success: true,
          message: `Connected successfully to GitLab project: ${testRes.repository?.name}`
        });
      }
      loadData();
    } catch (err: any) {
      setGlFeedback({ success: false, message: err.message || 'Failed to connect to GitLab' });
    } finally {
      setGlTesting(false);
    }
  };

  const handleTestGitlab = async () => {
    if (!currentProject) return;
    try {
      setGlTesting(true);
      setGlFeedback(null);
      const testRes = await api.integrations.testGitlabConnection(currentProject.id);
      if (testRes.success) {
        setGlFeedback({
          success: true,
          message: `Connection verified! Project: ${testRes.repository?.name} (${testRes.repository?.default_branch})`
        });
      }
      loadData();
    } catch (err: any) {
      setGlFeedback({ success: false, message: err.message || 'Verification failed' });
    } finally {
      setGlTesting(false);
    }
  };

  const handleDisconnectGitlab = async () => {
    if (!currentProject || !confirm('Are you sure you want to disconnect GitLab?')) return;
    try {
      await api.integrations.disconnectGitlab(currentProject.id);
      setGlToken('');
      setGlSecret('');
      setGlFeedback({ success: true, message: 'GitLab repository disconnected.' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect');
    }
  };

  // CI/CD Trigger
  const handleTriggerPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      setTriggering(true);
      await api.integrations.triggerPipeline({
        project_id: currentProject.id,
        branch: triggerBranch.trim() || 'main',
        pipeline_name: triggerPipelineName.trim()
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to trigger pipeline');
    } finally {
      setTriggering(false);
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const renderStatusBadge = (status?: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </span>
        );
      case 'auth_expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            Token Expired
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="h-3.5 w-3.5" />
            Error
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            <Unlink className="h-3.5 w-3.5" />
            Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
            Not Configured
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              DevOps & Engineering
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              DevOps & External Integrations
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Connect code repositories, validate webhooks, track CI/CD pipelines, and link commits to work items.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('github')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'github'
              ? 'border-emerald-900 text-emerald-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <FolderGit2 className="h-4 w-4" />
          <span>GitHub Integration</span>
          {ghStatus?.status === 'connected' && (
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('gitlab')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'gitlab'
              ? 'border-emerald-900 text-emerald-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <GitBranch className="h-4 w-4" />
          <span>GitLab Integration</span>
          {glStatus?.status === 'connected' && (
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('cicd')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'cicd'
              ? 'border-emerald-900 text-emerald-950'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>CI/CD Pipelines & Feeds</span>
          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-1.5 py-0.2 rounded-full">
            {pipelines.length}
          </span>
        </button>
      </div>

      {/* TAB 1: GITHUB */}
      {activeTab === 'github' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Config Form */}
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-zinc-900 text-white">
                  <FolderGit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 font-sans">GitHub Repository Connection</h3>
                  <p className="text-xs text-zinc-500">Connect an authorized GitHub repository using supported GitHub REST APIs</p>
                </div>
              </div>
              {renderStatusBadge(ghStatus?.status)}
            </div>

            {ghFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                  ghFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {ghFeedback.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-700" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{ghFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveGithub} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Repository Owner / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canManageIntegrations}
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    placeholder="e.g. facebook, vercel, or your-username"
                    className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canManageIntegrations}
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="e.g. react, next.js, or core-app"
                    className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  GitHub Personal Access Token (classic or fine-grained)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    disabled={!canManageIntegrations}
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder={ghStatus?.masked_token ? `Current: ${ghStatus.masked_token}` : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                    className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Requires <code className="bg-zinc-100 px-1 py-0.5 rounded">repo</code> scope for private repos or read access for public repos. Stored securely on the server.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Webhook Secret (Optional, for HMAC signature validation)
                </label>
                <input
                  type="password"
                  disabled={!canManageIntegrations}
                  value={ghSecret}
                  onChange={(e) => setGhSecret(e.target.value)}
                  placeholder="Secret used when configuring Webhook in GitHub Settings"
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              {canManageIntegrations && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={ghTesting}
                      className="btn-pill-primary text-xs py-2 px-5"
                    >
                      {ghTesting ? 'Testing & Saving...' : 'Save & Verify Connection'}
                    </button>
                    {ghStatus?.configured && (
                      <button
                        type="button"
                        onClick={handleTestGithub}
                        disabled={ghTesting}
                        className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>

                  {ghStatus?.configured && (
                    <button
                      type="button"
                      onClick={handleDisconnectGithub}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-3 py-1.5"
                    >
                      Disconnect Repository
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Webhook & Setup Guide */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <h4 className="font-bold text-sm text-zinc-900 font-sans flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-800" />
              <span>Real-Time Webhook Setup</span>
            </h4>
            <p className="text-xs text-zinc-500">
              Configure a webhook in your GitHub Repository settings to automatically link commits, branches, and PRs to Stride work items.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Payload URL
              </label>
              <div className="flex items-center gap-1.5 bg-zinc-100 p-2 rounded-2xl text-[11px] font-mono break-all text-zinc-800">
                <span className="flex-1 select-all">{ghStatus?.webhook_url || 'http://localhost:4000/api/integrations/github/webhook'}</span>
                <button
                  onClick={() => copyWebhookUrl(ghStatus?.webhook_url || 'http://localhost:4000/api/integrations/github/webhook')}
                  className="p-1 rounded-lg hover:bg-white text-zinc-600 transition-colors"
                  title="Copy URL"
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 text-xs text-zinc-600">
              <div className="font-bold text-zinc-800">GitHub Webhook Instructions:</div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                <li>Go to your GitHub repo <strong>Settings → Webhooks → Add webhook</strong>.</li>
                <li>Paste the <strong>Payload URL</strong> above.</li>
                <li>Set <strong>Content type</strong> to <code className="bg-zinc-100 px-1 py-0.5 rounded">application/json</code>.</li>
                <li>Enter the same <strong>Secret</strong> you configured in Stride.</li>
                <li>Select events: <strong>Pushes</strong> and <strong>Pull requests</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GITLAB */}
      {activeTab === 'gitlab' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-600 text-white">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 font-sans">GitLab Repository Connection</h3>
                  <p className="text-xs text-zinc-500">Connect an authorized GitLab.com or self-hosted GitLab project</p>
                </div>
              </div>
              {renderStatusBadge(glStatus?.status)}
            </div>

            {glFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                  glFeedback.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {glFeedback.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-700" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                )}
                <span>{glFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveGitlab} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    GitLab API Base URL
                  </label>
                  <input
                    type="text"
                    disabled={!canManageIntegrations}
                    value={glApiUrl}
                    onChange={(e) => setGlApiUrl(e.target.value)}
                    placeholder="https://gitlab.com/api/v4"
                    className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Project Path with Namespace or Project ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canManageIntegrations}
                    value={glRepo}
                    onChange={(e) => setGlRepo(e.target.value)}
                    placeholder="e.g. gitlab-org/gitlab or 278964"
                    className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  GitLab Private Token / Personal Access Token
                </label>
                <input
                  type="password"
                  disabled={!canManageIntegrations}
                  value={glToken}
                  onChange={(e) => setGlToken(e.target.value)}
                  placeholder={glStatus?.masked_token ? `Current: ${glStatus.masked_token}` : 'glpat-xxxxxxxxxxxxxxxxxxxx'}
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Requires <code className="bg-zinc-100 px-1 py-0.5 rounded">read_api</code> scope.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Secret Token (Optional, sent in X-Gitlab-Token header)
                </label>
                <input
                  type="password"
                  disabled={!canManageIntegrations}
                  value={glSecret}
                  onChange={(e) => setGlSecret(e.target.value)}
                  placeholder="Secret token configured in GitLab Webhook"
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              {canManageIntegrations && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={glTesting}
                      className="btn-pill-primary text-xs py-2 px-5"
                    >
                      {glTesting ? 'Testing & Saving...' : 'Save & Verify GitLab'}
                    </button>
                    {glStatus?.configured && (
                      <button
                        type="button"
                        onClick={handleTestGitlab}
                        disabled={glTesting}
                        className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>

                  {glStatus?.configured && (
                    <button
                      type="button"
                      onClick={handleDisconnectGitlab}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-3 py-1.5"
                    >
                      Disconnect Repository
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <h4 className="font-bold text-sm text-zinc-900 font-sans flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-800" />
              <span>GitLab Webhook Configuration</span>
            </h4>
            <p className="text-xs text-zinc-500">
              Configure Webhooks in GitLab to automatically stream commits and merge requests into Stride.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                URL
              </label>
              <div className="flex items-center gap-1.5 bg-zinc-100 p-2 rounded-2xl text-[11px] font-mono break-all text-zinc-800">
                <span className="flex-1 select-all">{glStatus?.webhook_url || 'http://localhost:4000/api/integrations/gitlab/webhook'}</span>
                <button
                  onClick={() => copyWebhookUrl(glStatus?.webhook_url || 'http://localhost:4000/api/integrations/gitlab/webhook')}
                  className="p-1 rounded-lg hover:bg-white text-zinc-600 transition-colors"
                >
                  {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 text-xs text-zinc-600">
              <div className="font-bold text-zinc-800">GitLab Webhook Instructions:</div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] leading-relaxed">
                <li>Navigate to your project in GitLab <strong>Settings → Webhooks</strong>.</li>
                <li>Paste the URL above into <strong>URL</strong>.</li>
                <li>Enter the <strong>Secret Token</strong>.</li>
                <li>Enable trigger events: <strong>Push events</strong> and <strong>Merge request events</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CI/CD PIPELINES & COMMITS */}
      {activeTab === 'cicd' && (
        <div className="space-y-6">
          {/* Trigger Pipeline Section */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 mb-4">
              <div>
                <h3 className="font-bold text-base text-zinc-900 font-sans">Trigger CI/CD Pipeline Execution</h3>
                <p className="text-xs text-zinc-500">
                  Manually dispatch build and verification workflows on connected providers.
                </p>
              </div>
              <form onSubmit={handleTriggerPipeline} className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={triggerBranch}
                  onChange={(e) => setTriggerBranch(e.target.value)}
                  placeholder="Target Branch (e.g. main)"
                  className="text-xs px-3.5 py-2 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
                <button
                  type="submit"
                  disabled={triggering}
                  className="btn-pill-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{triggering ? 'Triggering...' : 'Dispatch Pipeline'}</span>
                </button>
              </form>
            </div>

            {/* Pipeline Execution List */}
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Recent Pipeline Executions ({pipelines.length})
              </div>

              {pipelines.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                  No pipeline executions recorded yet. Connect GitHub Actions or dispatch a manual pipeline above.
                </div>
              ) : (
                <div className="space-y-2">
                  {pipelines.map((pipe) => {
                    const statusColor =
                      pipe.status === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : pipe.status === 'failure'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : pipe.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-200';

                    return (
                      <div
                        key={pipe.id}
                        className="p-4 rounded-2xl bg-white border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              pipe.status === 'success'
                                ? 'bg-emerald-50 text-emerald-700'
                                : pipe.status === 'failure'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            <Terminal className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900">{pipe.pipeline_name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColor}`}>
                                {pipe.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-500 text-[11px] mt-0.5">
                              <span>Branch: <strong className="text-zinc-700 font-mono">{pipe.branch}</strong></span>
                              <span>Commit: <strong className="text-zinc-700 font-mono">{pipe.commit_sha}</strong></span>
                              <span>Triggered by: {pipe.triggered_by}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto text-zinc-500 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(pipe.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {pipe.web_url && (
                            <a
                              href={pipe.web_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-900 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Logs</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Linked Work Items Commits & PRs Feed */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft space-y-4">
            <h3 className="font-bold text-base text-zinc-900 font-sans">Work Item Git Activity Stream</h3>
            <p className="text-xs text-zinc-500">
              Commits, branches, and pull requests associated with work items in this project.
            </p>

            {gitLinks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-2xl">
                No linked commits or pull requests yet. Reference item keys (e.g. STRIDE-101) in commit messages or PR titles.
              </div>
            ) : (
              <div className="space-y-2">
                {gitLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3.5 rounded-2xl bg-white border border-zinc-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-mint-100 text-emerald-900">
                        {link.link_type === 'pull_request' ? (
                          <GitPullRequest className="h-4 w-4" />
                        ) : (
                          <GitBranch className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-900 text-[10px]">
                            {link.external_id}
                          </span>
                          <span className="font-medium text-zinc-800">{link.title}</span>
                          {link.status && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-100 text-zinc-600 uppercase font-bold">
                              {link.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          By {link.author} • {new Date(link.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded text-zinc-400 hover:text-emerald-900 transition-colors"
                      title="View external link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
