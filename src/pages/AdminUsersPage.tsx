import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, ShieldAlert, Trash2, UserPlus } from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { User, UserRole } from '../types';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  // Create user state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TECHNICIAN');
  const [creating, setCreating] = useState(false);

  // Reset password modal state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetting, setResetting] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-2">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h1 className="text-lg font-bold text-slate-900">Admin Access Required</h1>
        <p className="text-sm text-slate-600">
          Only administrators can create users, assign roles, reset passwords, or
          remove user access.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBanner(null);
    setCreating(true);
    try {
      const created = await createAdminUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      });
      setBanner(`User '${created.username}' created with role ${created.role}.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('TECHNICIAN');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (target: User, role: UserRole) => {
    setError(null);
    setBanner(null);
    try {
      await updateAdminUser(target.id, { role });
      setBanner(`Updated role for '${target.username}' to ${role}.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    }
  };

  const handleToggleActive = async (target: User) => {
    setError(null);
    setBanner(null);
    try {
      await updateAdminUser(target.id, { is_active: !target.is_active });
      setBanner(
        `${target.is_active ? 'Disabled' : 'Enabled'} access for '${target.username}'.`
      );
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user access.');
    }
  };

  const handleDeleteUser = async (target: User) => {
    setError(null);
    setBanner(null);
    try {
      await deleteAdminUser(target.id);
      setBanner(`Removed user '${target.username}'.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setError(null);
    setBanner(null);
    setResetting(true);
    try {
      await resetAdminUserPassword(resetTarget.id, resetPasswordVal);
      setBanner(`Password updated for '${resetTarget.username}'.`);
      setResetTarget(null);
      setResetPasswordVal('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Administration</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Create accounts, assign Auditor or Technician roles, reset passwords, and
          revoke access
        </p>
      </div>

      {banner && (
        <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900">
          {banner}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* Create User Form */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <UserPlus className="w-4 h-4 text-slate-700" />
          Create New User
        </h2>
        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="new-username" className="block text-xs font-medium text-slate-700 mb-1">
              Username
            </label>
            <input
              id="new-username"
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. tech_maria"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-xs font-medium text-slate-700 mb-1">
              Password (min 6 chars)
            </label>
            <input
              id="new-password"
              type="password"
              minLength={6}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Set password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label htmlFor="new-role" className="block text-xs font-medium text-slate-700 mb-1">
              Role
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="TECHNICIAN">Technician</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 disabled:opacity-50 cursor-pointer"
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </section>

      {/* Users Table */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Accounts ({users.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Access</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} data-testid={`user-row-${u.username}`}>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {u.username}{' '}
                        {isSelf && (
                          <span className="text-xs text-slate-400 font-normal">(you)</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          aria-label={`Role for ${u.username}`}
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium bg-white disabled:opacity-60"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="AUDITOR">AUDITOR</option>
                          <option value="TECHNICIAN">TECHNICIAN</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded border cursor-pointer disabled:opacity-50 ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(u);
                            setResetPasswordVal('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Reset Password
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleDeleteUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-pw-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 id="reset-pw-title" className="font-semibold text-slate-900">
              Reset Password for {resetTarget.username}
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-password-input" className="block text-xs font-medium text-slate-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  id="reset-password-input"
                  type="password"
                  minLength={6}
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                >
                  {resetting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
