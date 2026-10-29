import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { WorkspaceMember, RolePermissionMatrix, UserRole, WorkspaceInvitation } from '../types';
import { Users, UserPlus, AlertCircle, Mail, X } from 'lucide-react';

export const TeamRolesPage: React.FC = () => {
  const { currentWorkspace } = useProject();
  const { role: currentRole, user: currentUser } = useAuth();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [matrix, setMatrix] = useState<RolePermissionMatrix[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Developer');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const canManageMembers = currentRole === 'WorkspaceAdmin' || currentUser?.role === 'WorkspaceAdmin';

  const loadData = async () => {
    if (!currentWorkspace) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [membersRes, matrixRes, invRes] = await Promise.all([
        api.workspaces.getMembers(currentWorkspace.id),
        api.team.getPermissionsMatrix(),
        api.collaborate.getInvitations(currentWorkspace.id)
      ]);
      setMembers(membersRes);
      setMatrix(matrixRes);
      setInvitations(invRes);
    } catch (err) {
      console.error('[Team] Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace]);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail.trim()) return;
    try {
      setInviteError(null);
      await api.collaborate.createInvitation(currentWorkspace.id, inviteEmail.trim().toLowerCase(), inviteRole);
      setInviteEmail('');
      setIsInviteOpen(false);
      loadData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation');
    }
  };

  const handleRespondInvitation = async (id: string, action: 'accept' | 'reject') => {
    try {
      await api.collaborate.respondToInvitation(id, action);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to invitation');
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!currentWorkspace) return;
    try {
      await api.collaborate.updateMemberRole(userId, currentWorkspace.id, newRole);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="glass-panel rounded-3xl p-10 text-center">
        <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
        <h2 className="text-base font-bold text-zinc-900 mb-2">No Workspace Selected</h2>
        <p className="text-xs text-zinc-500 mb-4">Please select or create a workspace to view team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold font-mono">
              Team & Governance
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
              Workspace Members & Access Roles
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Authorized collaborators for <span className="font-semibold text-zinc-800">{currentWorkspace.name}</span>.
          </p>
        </div>

        {canManageMembers && (
          <button
            onClick={() => setIsInviteOpen(true)}
            className="btn-pill-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Collaborator</span>
          </button>
        )}
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Active Workspace Members ({members.length})
        </h3>

        {members.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center text-xs text-zinc-500">
            <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
            <p className="font-semibold text-zinc-700">No members in this workspace yet</p>
            <p className="mt-1 mb-4">Invite registered users or colleagues using the invite button.</p>
            {canManageMembers && (
              <button
                onClick={() => setIsInviteOpen(true)}
                className="btn-pill-primary text-xs"
              >
                + Invite Collaborator
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {members.map((m) => {
              const u = m.user;
              const displayName = u?.display_name || 'Member';
              const email = u?.email || 'user@workspace';
              return (
                <div
                  key={m.id}
                  className="glass-panel rounded-3xl p-5 border border-emerald-950/10 shadow-soft flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <img
                        src={
                          u?.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            displayName
                          )}`
                        }
                        alt={displayName}
                        className="h-11 w-11 rounded-full border-2 border-emerald-950/15 object-cover"
                      />

                      {canManageMembers ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value as UserRole)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-200 bg-white"
                        >
                          <option value="Developer">Developer</option>
                          <option value="ScrumMaster">ScrumMaster</option>
                          <option value="ProductOwner">ProductOwner</option>
                          <option value="WorkspaceAdmin">WorkspaceAdmin</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.role === 'WorkspaceAdmin'
                              ? 'bg-purple-100 text-purple-800'
                              : m.role === 'ProductOwner'
                              ? 'bg-blue-100 text-blue-800'
                              : m.role === 'ScrumMaster'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 font-sans">{displayName}</h4>
                    <p className="text-xs text-zinc-500 truncate mb-4">{email}</p>
                  </div>

                  <div className="pt-3 border-t border-emerald-950/10 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      Joined {new Date(m.joined_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint-100 text-emerald-900 font-medium">
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspace Invitations Management */}
      <div className="glass-panel rounded-3xl border border-emerald-950/10 shadow-soft overflow-hidden">
        <div className="p-4 border-b border-emerald-950/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-zinc-900">Workspace Invitations</h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{invitations.length} invitations</span>
        </div>

        {invitations.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No pending invitations. Click "Invite Collaborator" above to invite team members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-emerald-950/[0.03] border-b border-emerald-950/10 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Recipient Email</th>
                  <th className="py-3 px-4">Invited Role</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/5">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-900">{inv.email}</td>
                    <td className="py-3 px-4 font-mono font-medium text-emerald-900">{inv.role}</td>
                    <td className="py-3 px-4 text-zinc-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inv.status === 'accepted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleRespondInvitation(inv.id, 'accept')}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespondInvitation(inv.id, 'reject')}
                            className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Permission Matrix */}
      <div className="glass-panel rounded-3xl p-6 border border-emerald-950/10 shadow-soft">
        <h3 className="font-bold text-sm text-zinc-900 mb-2">Role Permissions Matrix</h3>
        <p className="text-xs text-zinc-500 mb-4">Defines capabilities granted to each Agile role across this platform.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matrix.map((m) => (
            <div key={m.role} className="p-4 rounded-2xl bg-white/70 border border-emerald-950/10 text-xs">
              <div className="font-bold text-zinc-900 mb-1">{m.title}</div>
              <p className="text-[11px] text-zinc-500 leading-snug mb-3">{m.description}</p>
              <div className="space-y-1 text-[11px] text-zinc-600">
                <div className="flex items-center justify-between">
                  <span>Manage Workspaces</span>
                  <span className={m.canManageWorkspace ? 'text-emerald-700 font-bold' : 'text-zinc-300'}>
                    {m.canManageWorkspace ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Manage Sprints</span>
                  <span className={m.canManageSprints ? 'text-emerald-700 font-bold' : 'text-zinc-300'}>
                    {m.canManageSprints ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Plan Backlog</span>
                  <span className={m.canPlanBacklog ? 'text-emerald-700 font-bold' : 'text-zinc-300'}>
                    {m.canPlanBacklog ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-elevated w-full max-w-md rounded-3xl p-6 shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-950/10 mb-4">
              <h3 className="text-base font-bold text-zinc-900">Invite Team Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Assign Agile Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-2xl bg-white border border-emerald-950/15 focus:outline-none focus:ring-2 focus:ring-emerald-700/30"
                >
                  <option value="Developer">Developer</option>
                  <option value="ScrumMaster">Scrum Master</option>
                  <option value="ProductOwner">Product Owner</option>
                  <option value="WorkspaceAdmin">Workspace Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="btn-pill-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary text-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
