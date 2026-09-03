import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { User, Role } from '../types';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  Copy,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
  invitedBy?: {
    name: string;
  };
}

export const TeamManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [members, setMembers] = useState<User[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals & Forms
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('SALES');
  const [inviting, setInviting] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  // Edit Role & Delete Member state
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<Role>('SALES');
  const [updatingRole, setUpdatingRole] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/organization/members');
      setMembers(res.data.members);
      setPendingInvitations(res.data.pendingInvitations);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setInviting(true);
    setErrorMsg('');
    setCreatedInviteUrl('');

    try {
      const res = await api.post('/organization/invitations', {
        email: inviteEmail,
        role: inviteRole,
      });

      const rawToken = res.data.invitation.rawToken;
      const inviteUrl = `${window.location.origin}/accept-invitation?token=${rawToken}`;
      setCreatedInviteUrl(inviteUrl);
      setSuccessMsg(`Invitation issued to ${inviteEmail}`);

      setInviteEmail('');
      fetchTeamData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember || !isAdmin) return;

    setUpdatingRole(true);
    setErrorMsg('');
    try {
      const res = await api.patch(`/organization/members/${selectedMember.id}/role`, {
        role: newRole,
      });
      setSuccessMsg(res.data.message);
      setIsRoleModalOpen(false);
      setSelectedMember(null);
      fetchTeamData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !isAdmin) return;

    setDeletingMember(true);
    setErrorMsg('');
    try {
      const res = await api.delete(`/organization/members/${selectedMember.id}`);
      setSuccessMsg(res.data.message);
      setIsDeleteModalOpen(false);
      setSelectedMember(null);
      fetchTeamData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setDeletingMember(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!isAdmin) return;
    try {
      await api.delete(`/organization/invitations/${invitationId}`);
      setSuccessMsg('Invitation revoked successfully');
      fetchTeamData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SALES':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'WAREHOUSE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ACCOUNTS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-48 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-red-700" />
            <span>Team Members & Organization Access</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization user accounts, roles, permissions, and pending invitations
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setCreatedInviteUrl('');
              setIsInviteModalOpen(true);
            }}
            className="bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2.5 rounded-lg text-sm shadow-sm transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Active Team Members Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Active Team Members ({members.length})</h3>
          <button
            onClick={fetchTeamData}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-3">Member Name</th>
                <th className="px-6 py-3">Email Address</th>
                <th className="px-6 py-3">Assigned Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const isSelf = m.id === user?.id;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-700 font-bold text-xs">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <span>{m.name}</span>
                        {isSelf && (
                          <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{m.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getRoleBadgeColor(m.role)}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1 text-emerald-600 text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Active</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isAdmin && !isSelf && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedMember(m);
                              setNewRole(m.role as Role);
                              setIsRoleModalOpen(true);
                            }}
                            className="text-xs text-red-700 hover:text-red-800 font-semibold px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            Change Role
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMember(m);
                              setIsDeleteModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Pending Invitations ({pendingInvitations.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Invited Email</th>
                  <th className="px-6 py-3">Target Role</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getRoleBadgeColor(inv.role)}`}>
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-amber-600 font-medium">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                          Revoke Invitation
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-red-700" />
                <span>Invite New Team Member</span>
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createdInviteUrl ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-sm">Invitation Created Successfully!</div>
                  <p>Share the secure invitation link below with the user to allow them to create their account password.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invitation Signup URL</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={createdInviteUrl}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 select-all"
                    />
                    <button
                      onClick={() => copyToClipboard(createdInviteUrl)}
                      className="bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-800 transition-colors flex items-center space-x-1 flex-shrink-0"
                    >
                      {copiedToken ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedToken ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assign User Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                  >
                    <option value="SALES">SALES — Customer CRM & Challan Management</option>
                    <option value="WAREHOUSE">WAREHOUSE — Inventory Stock Control</option>
                    <option value="ACCOUNTS">ACCOUNTS — Financial Reports & Invoices</option>
                    <option value="ADMIN">ADMIN — Full Organization Control</option>
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {inviting ? 'Generating Invitation...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {isRoleModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-700" />
                <span>Change Member Role</span>
              </h3>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm text-slate-600">
              Update role permissions for <strong className="text-slate-900">{selectedMember.name}</strong> ({selectedMember.email})
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Assigned Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
              >
                <option value="SALES">SALES — Customer CRM & Challan Management</option>
                <option value="WAREHOUSE">WAREHOUSE — Inventory Stock Control</option>
                <option value="ACCOUNTS">ACCOUNTS — Financial Reports & Invoices</option>
                <option value="ADMIN">ADMIN — Full Organization Control</option>
              </select>
            </div>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={updatingRole}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {updatingRole ? 'Updating Role...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {isDeleteModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Remove Team Member?</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900">{selectedMember.name}</strong> ({selectedMember.email}) from your organization? They will immediately lose access to this ERP workspace.
            </p>

            <div className="pt-3 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={deletingMember}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {deletingMember ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
