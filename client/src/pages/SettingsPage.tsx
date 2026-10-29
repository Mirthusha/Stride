import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Sliders, Database, Layers, FolderPlus, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentWorkspace, currentProject, createWorkspace, createProject } = useProject();
  const { role, mode } = useAuth();

  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [projName, setProjName] = useState('');
  const [projKey, setProjKey] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const canManage = role === 'WorkspaceAdmin';

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    try {
      await createWorkspace(wsName.trim(), wsDesc);
      setWsName('');
      setWsDesc('');
      setMsg('Workspace created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateProj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || !projKey.trim()) return;
    try {
      await createProject({
        name: projName.trim(),
        project_key: projKey.trim().toUpperCase(),
        description: projDesc
      });
      setProjName('');
      setProjKey('');
      setProjDesc('');
      setMsg('Project created successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
            Administration
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
            Workspace & Project Settings
          </h1>
        </div>
        <p className="text-xs text-zinc-500">
          Manage scope, environments, keys, and persistence diagnostics.
        </p>
      </div>

      {msg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Database & Supabase Diagnostics Card */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-emerald-950/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 font-sans">Storage Engine & Cloud Status</h3>
            <p className="text-xs text-zinc-500">PostgreSQL persistence and Supabase integration configuration.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/70 border border-emerald-950/10 space-y-1">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase">Active Mode</span>
            <div className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {mode === 'cloud' ? 'Supabase PostgreSQL Cloud Mode' : 'Stride Local Storage Engine (File DB)'}
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              {mode === 'cloud'
                ? 'All transactions, RLS policies, and realtime channels are backed by live Supabase cloud.'
                : 'Running on local persistent JSON store. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env to switch.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 border border-emerald-950/10 space-y-1">
            <span className="text-[11px] text-zinc-400 font-semibold uppercase">Part 1 Migration State</span>
            <div className="text-sm font-bold text-zinc-900">
              001_initial_schema.sql (Ready)
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              Includes Profiles, Workspaces, Projects, Epics, Sprints, Work Items, and Row Level Security policies.
            </p>
          </div>
        </div>
      </div>

      {/* Current Scope Card */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Current Project Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-2xl bg-white/60 border border-emerald-950/10">
            <span className="text-zinc-400 block text-[11px]">Workspace</span>
            <span className="font-bold text-zinc-900 text-sm">{currentWorkspace?.name}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 border border-emerald-950/10">
            <span className="text-zinc-400 block text-[11px]">Project Name</span>
            <span className="font-bold text-zinc-900 text-sm">{currentProject?.name}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 border border-emerald-950/10">
            <span className="text-zinc-400 block text-[11px]">Project Key</span>
            <span className="font-bold text-emerald-900 text-sm font-mono">{currentProject?.project_key}</span>
          </div>
        </div>
      </div>

      {/* Creation forms for Admin */}
      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Workspace */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-zinc-900">Create New Workspace</h3>
            </div>
            <form onSubmit={handleCreateWs} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="e.g. Enterprise Cloud Org"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-950/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="Workspace scope..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-950/15"
                />
              </div>
              <button type="submit" className="btn-pill-primary text-xs w-full py-2">
                Create Workspace
              </button>
            </form>
          </div>

          {/* Create Project */}
          <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10">
            <div className="flex items-center gap-2 mb-3">
              <FolderPlus className="h-4 w-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-zinc-900">Create New Project</h3>
            </div>
            <form onSubmit={handleCreateProj} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. Mobile iOS Client"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-950/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Project Key (Prefix) *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={projKey}
                  onChange={(e) => setProjKey(e.target.value)}
                  placeholder="e.g. MOB"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-950/15 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Project purpose..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-emerald-950/15"
                />
              </div>
              <button type="submit" className="btn-pill-primary text-xs w-full py-2">
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
