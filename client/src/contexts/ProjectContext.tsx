import React, { createContext, useContext, useState, useEffect } from 'react';
import { Workspace, Project } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  switchProject: (projectId: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  createProject: (data: { name: string; project_key: string; description?: string }) => Promise<Project>;
  refreshAll: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setProjects([]);
      setCurrentProject(null);
      localStorage.removeItem('stride_active_workspace_id');
      localStorage.removeItem('stride_active_project_id');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const wsList = await api.workspaces.getAll();
      setWorkspaces(wsList);

      const savedWsId = localStorage.getItem('stride_active_workspace_id');
      const activeWs = wsList.find((w) => w.id === savedWsId) || wsList[0] || null;
      setCurrentWorkspace(activeWs);

      if (activeWs) {
        localStorage.setItem('stride_active_workspace_id', activeWs.id);
        const projList = await api.projects.getAll(activeWs.id);
        setProjects(projList);
        const savedProjId = localStorage.getItem('stride_active_project_id');
        const activeProj = projList.find((p) => p.id === savedProjId) || projList[0] || null;
        setCurrentProject(activeProj);
        if (activeProj) {
          localStorage.setItem('stride_active_project_id', activeProj.id);
        }
      } else {
        setProjects([]);
        setCurrentProject(null);
      }
    } catch (err) {
      console.error('[ProjectContext] Error loading workspaces/projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const switchWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;
    setCurrentWorkspace(ws);
    localStorage.setItem('stride_active_workspace_id', ws.id);
    try {
      setLoading(true);
      const projList = await api.projects.getAll(ws.id);
      setProjects(projList);
      const activeProj = projList[0] || null;
      setCurrentProject(activeProj);
      if (activeProj) {
        localStorage.setItem('stride_active_project_id', activeProj.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchProject = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      setCurrentProject(proj);
      localStorage.setItem('stride_active_project_id', proj.id);
    }
  };

  const createWorkspace = async (name: string, description?: string) => {
    const newWs = await api.workspaces.create({ name, description });
    setWorkspaces((prev) => [...prev, newWs]);
    setCurrentWorkspace(newWs);
    localStorage.setItem('stride_active_workspace_id', newWs.id);
    setProjects([]);
    setCurrentProject(null);
    return newWs;
  };

  const createProject = async (data: { name: string; project_key: string; description?: string }) => {
    if (!currentWorkspace) throw new Error('No active workspace selected');
    const newProj = await api.projects.create({
      workspace_id: currentWorkspace.id,
      name: data.name,
      project_key: data.project_key,
      description: data.description
    });
    setProjects((prev) => [...prev, newProj]);
    setCurrentProject(newProj);
    localStorage.setItem('stride_active_project_id', newProj.id);
    return newProj;
  };

  return (
    <ProjectContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        projects,
        currentProject,
        loading,
        switchWorkspace,
        switchProject,
        createWorkspace,
        createProject,
        refreshAll: loadData
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
