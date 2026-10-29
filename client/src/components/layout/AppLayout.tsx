import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { TopNavbar } from './TopNavbar';
import { Sidebar } from './Sidebar';
import { AmbientBackground } from './AmbientBackground';
import { CreateWorkItemModal } from '../modals/CreateWorkItemModal';
import { CreateWorkspaceModal } from '../modals/CreateWorkspaceModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { Layers, FolderPlus } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, currentWorkspace, projects, currentProject, loading: projLoading } = useProject();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleItemCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-800 border-t-transparent" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col relative selection:bg-mint-200">
      <AmbientBackground />
      <TopNavbar onOpenCreateItemModal={() => setIsCreateModalOpen(true)} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <Sidebar />
        <main className="flex-1 min-w-0">
          {!projLoading && workspaces.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto mt-10">
              <div className="h-12 w-12 rounded-2xl bg-mint-200 text-emerald-900 flex items-center justify-center mx-auto mb-4">
                <Layers className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2 font-sans">
                Welcome to Stride, {user.display_name}!
              </h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                To start managing agile deliverables, sprints, and Kanban workflows, create your first team workspace.
              </p>
              <button
                onClick={() => setIsWsModalOpen(true)}
                className="btn-pill-primary text-xs px-6 py-2.5"
              >
                + Create Workspace
              </button>
            </div>
          ) : !projLoading && workspaces.length > 0 && projects.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center max-w-xl mx-auto mt-10">
              <div className="h-12 w-12 rounded-2xl bg-mint-200 text-emerald-900 flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2 font-sans">
                No Projects in {currentWorkspace?.name}
              </h2>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Create an Agile project under this workspace to manage backlogs, sprints, and boards.
              </p>
              <button
                onClick={() => setIsProjModalOpen(true)}
                className="btn-pill-primary text-xs px-6 py-2.5"
              >
                + Create Project
              </button>
            </div>
          ) : (
            <Outlet context={{ refreshTrigger, onOpenCreateItemModal: () => setIsCreateModalOpen(true) }} />
          )}
        </main>
      </div>

      <CreateWorkItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onItemCreated={handleItemCreated}
      />
      <CreateWorkspaceModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
      />
      <CreateProjectModal
        isOpen={isProjModalOpen}
        onClose={() => setIsProjModalOpen(false)}
      />
    </div>
  );
};
