import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { Notification, ActiveTimer } from '../../types';
import { api } from '../../lib/api';
import {
  ChevronDown,
  Layers,
  Plus,
  Database,
  Bell,
  Clock,
  Square,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { CreateWorkspaceModal } from '../modals/CreateWorkspaceModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';

interface TopNavbarProps {
  onOpenCreateItemModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenCreateItemModal }) => {
  const { user, role, mode, logout } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, currentProject, projects, switchProject } = useProject();
  const navigate = useNavigate();

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isWsModalOpen, setIsWsModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);

  // Notifications State
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Timer State
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerLoading, setIsTimerLoading] = useState(false);

  // Load Notifications
  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch {
      // ignore
    }
  };

  // Load Active Timer
  const loadActiveTimer = async () => {
    if (!user) return;
    try {
      const timer = await api.timeTracking.getActiveTimer();
      setActiveTimer(timer);
      if (timer) {
        const start = new Date(timer.start_time).getTime();
        const diffSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
        setElapsedSeconds(diffSecs);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    loadActiveTimer();

    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  // Timer ticker
  useEffect(() => {
    if (!activeTimer) return;
    const ticker = setInterval(() => {
      const start = new Date(activeTimer.start_time).getTime();
      const diffSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setElapsedSeconds(diffSecs);
    }, 1000);
    return () => clearInterval(ticker);
  }, [activeTimer]);

  const handleStopTimer = async () => {
    setIsTimerLoading(true);
    try {
      await api.timeTracking.stopTimer();
      setActiveTimer(null);
      setElapsedSeconds(0);
      loadNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to stop timer');
    } finally {
      setIsTimerLoading(false);
    }
  };

  const handleStartTimerQuick = async () => {
    if (!currentProject) return;
    setIsTimerLoading(true);
    try {
      const timer = await api.timeTracking.startTimer(
        currentProject.id,
        null,
        `Quick work session on ${currentProject.name}`
      );
      setActiveTimer(timer);
      setElapsedSeconds(0);
    } catch (err: any) {
      alert(err.message || 'Failed to start timer');
    } finally {
      setIsTimerLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTimerDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-emerald-950/10 bg-mint-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Brand + Scope Switchers */}
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-900 text-white shadow-sm transition-transform group-hover:scale-105">
                <span className="font-bold tracking-tight text-base font-sans">S</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 font-sans">
                Stride
              </span>
            </Link>

            {/* Workspace Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setWsMenuOpen(!wsMenuOpen);
                  setProjectMenuOpen(false);
                  setUserMenuOpen(false);
                  setNotifMenuOpen(false);
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs font-medium text-zinc-800 border border-emerald-950/10 transition-colors shadow-sm"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-700" />
                <span className="truncate max-w-[140px] font-medium">
                  {currentWorkspace?.name || 'Workspaces'}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-500" />
              </button>

              {wsMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-card border border-emerald-950/10 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Workspaces</span>
                    <button
                      onClick={() => {
                        setWsMenuOpen(false);
                        setIsWsModalOpen(true);
                      }}
                      className="text-emerald-800 hover:text-emerald-950 font-bold lowercase text-xs"
                    >
                      + new
                    </button>
                  </div>
                  {workspaces.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      <p className="mb-2">No workspaces found</p>
                      <button
                        onClick={() => {
                          setWsMenuOpen(false);
                          setIsWsModalOpen(true);
                        }}
                        className="btn-pill-primary text-xs py-1 px-3 w-full"
                      >
                        Create Workspace
                      </button>
                    </div>
                  ) : (
                    <>
                      {workspaces.map((ws) => (
                        <button
                          key={ws.id}
                          onClick={() => {
                            switchWorkspace(ws.id);
                            setWsMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            currentWorkspace?.id === ws.id
                              ? 'bg-mint-100 text-emerald-950 font-semibold'
                              : 'hover:bg-zinc-100/80 text-zinc-700'
                          }`}
                        >
                          <span className="truncate">{ws.name}</span>
                          {currentWorkspace?.id === ws.id && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          )}
                        </button>
                      ))}
                      <div className="pt-1 mt-1 border-t border-zinc-100">
                        <button
                          onClick={() => {
                            setWsMenuOpen(false);
                            setIsWsModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-mint-50 transition-colors flex items-center gap-1.5"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Create Workspace</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Project Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setProjectMenuOpen(!projectMenuOpen);
                  setWsMenuOpen(false);
                  setUserMenuOpen(false);
                  setNotifMenuOpen(false);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-xs font-semibold text-zinc-900 border border-zinc-900/80 hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
              >
                <span className="px-1.5 py-0.5 rounded bg-mint-200 text-emerald-900 text-[10px] font-bold group-hover:bg-zinc-800 group-hover:text-mint-300">
                  {currentProject?.project_key || 'PRJ'}
                </span>
                <span className="truncate max-w-[150px]">
                  {currentProject?.name || 'Select Project'}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {projectMenuOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-card border border-emerald-950/10 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Projects</span>
                    {currentWorkspace && (
                      <button
                        onClick={() => {
                          setProjectMenuOpen(false);
                          setIsProjModalOpen(true);
                        }}
                        className="text-emerald-800 hover:text-emerald-950 font-bold lowercase text-xs"
                      >
                        + new
                      </button>
                    )}
                  </div>
                  {projects.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      <p className="mb-2">No projects in this workspace</p>
                      {currentWorkspace ? (
                        <button
                          onClick={() => {
                            setProjectMenuOpen(false);
                            setIsProjModalOpen(true);
                          }}
                          className="btn-pill-primary text-xs py-1 px-3 w-full"
                        >
                          Create Project
                        </button>
                      ) : (
                        <p className="text-[11px] text-zinc-400">Select or create a workspace first</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {projects.map((proj) => (
                        <button
                          key={proj.id}
                          onClick={() => {
                            switchProject(proj.id);
                            setProjectMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-colors ${
                            currentProject?.id === proj.id
                              ? 'bg-mint-100 text-emerald-950 font-semibold'
                              : 'hover:bg-zinc-100/80 text-zinc-700'
                          }`}
                        >
                          <span className="px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                            {proj.project_key}
                          </span>
                          <span className="truncate flex-1">{proj.name}</span>
                        </button>
                      ))}
                      {currentWorkspace && (
                        <div className="pt-1 mt-1 border-t border-zinc-100">
                          <button
                            onClick={() => {
                              setProjectMenuOpen(false);
                              setIsProjModalOpen(true);
                            }}
                            className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-mint-50 transition-colors flex items-center gap-1.5"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Create Project</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Timer, Notifications, Actions, Mode, Avatar */}
          <div className="flex items-center gap-3">
            {/* Live Timer Widget */}
            {activeTimer ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-400 text-emerald-950 text-xs font-bold shadow-sm animate-pulse">
                <Clock className="h-3.5 w-3.5 text-emerald-700" />
                <span>{formatTimerDuration(elapsedSeconds)}</span>
                <button
                  onClick={handleStopTimer}
                  disabled={isTimerLoading}
                  className="ml-1 p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                  title="Stop & Log Timer"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                </button>
              </div>
            ) : (
              currentProject && (
                <button
                  onClick={handleStartTimerQuick}
                  disabled={isTimerLoading}
                  className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-xs font-semibold text-zinc-700 border border-emerald-950/15 shadow-sm transition-all"
                  title="Start quick tracking session"
                >
                  <Clock className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Start Timer</span>
                </button>
              )
            )}

            {/* Notifications Bell Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifMenuOpen(!notifMenuOpen);
                    setUserMenuOpen(false);
                    setProjectMenuOpen(false);
                    setWsMenuOpen(false);
                  }}
                  className="relative p-2 rounded-full bg-white/80 hover:bg-white text-zinc-700 border border-emerald-950/15 shadow-sm transition-all"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl bg-white/95 backdrop-blur-md p-3 shadow-elevated border border-emerald-950/10 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-mint-200 text-emerald-950 text-[10px] font-bold">
                            {unreadCount} unread
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-semibold text-emerald-800 hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-500">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={`p-2.5 rounded-xl text-xs transition-colors flex items-start gap-2.5 ${
                              n.read ? 'bg-zinc-50/70 text-zinc-600' : 'bg-mint-50 border border-emerald-200 text-zinc-900 font-medium'
                            }`}
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {n.event_type === 'task_assigned' || n.event_type === 'mention' ? (
                                <AlertCircle className="h-4 w-4 text-emerald-700" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="leading-snug text-xs">{n.message}</p>
                              <span className="text-[10px] text-zinc-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => handleMarkNotificationRead(n.id)}
                                className="text-[10px] text-emerald-800 hover:text-emerald-950 font-bold px-1.5 py-0.5 rounded bg-white border border-emerald-300"
                                title="Mark read"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Database Storage Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 border border-emerald-950/10 text-[11px] font-medium text-zinc-700">
              <Database className="h-3 w-3 text-emerald-600" />
              <span>Storage:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {mode === 'cloud' ? 'Supabase Cloud' : 'Stride Local Engine'}
              </span>
            </div>

            {/* Quick Create Work Item Pill Button */}
            {currentProject && (
              <button
                onClick={onOpenCreateItemModal}
                className="btn-pill-primary flex items-center gap-1.5"
                title="Create Task, Story, or Bug"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New Work Item</span>
              </button>
            )}

            {/* User Profile Pill or Sign In Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setWsMenuOpen(false);
                    setProjectMenuOpen(false);
                    setNotifMenuOpen(false);
                  }}
                  className="flex items-center gap-2 pl-1 p-1 rounded-full hover:bg-white/60 transition-colors"
                >
                  <img
                    src={
                      user.avatar_url ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        user.display_name
                      )}`
                    }
                    alt={user.display_name}
                    className="h-8 w-8 rounded-full border border-emerald-900/20 object-cover shadow-sm"
                  />
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-xs font-semibold text-zinc-900 leading-tight">
                      {user.display_name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {role || user.role}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-zinc-400 hidden xl:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-elevated border border-emerald-950/10 z-50">
                    <div className="px-3 py-2 border-b border-zinc-100">
                      <div className="text-xs font-bold text-zinc-900">{user.display_name}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{user.email}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-mint-100 text-emerald-900 text-[10px] font-bold">
                        {role || user.role}
                      </span>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-pill-subtle text-xs">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-pill-primary text-xs">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Creation Modals */}
      <CreateWorkspaceModal
        isOpen={isWsModalOpen}
        onClose={() => setIsWsModalOpen(false)}
      />
      <CreateProjectModal
        isOpen={isProjModalOpen}
        onClose={() => setIsProjModalOpen(false)}
      />
    </>
  );
};
