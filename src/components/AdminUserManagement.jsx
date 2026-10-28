import React, { useCallback, useEffect, useState } from 'react';
import api from '../api';

const AdminUserManagement = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState('');

  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (user, role) => {
    setBusyUserId(user.id);
    setError('');
    try {
      const response = await api.patch('/admin/users', { id: user.id, role });
      setUsers((currentUsers) => currentUsers.map((currentUser) => (
        currentUser.id === user.id ? { ...currentUser, role: response.data.data.role } : currentUser
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this user’s role. Please try again.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleDelete = async (user) => {
    const hasActivity = user._count.listings > 0 || user._count.bids > 0;
    const warning = hasActivity
      ? 'This user has listings or bids and cannot be deleted until their trading activity is removed or transferred.'
      : `Permanently delete ${user.fullName} (${user.email})? This cannot be undone.`;
    if (hasActivity || !window.confirm(warning)) return;

    setBusyUserId(user.id);
    setError('');
    try {
      await api.delete('/admin/users', { data: { id: user.id } });
      setUsers((currentUsers) => currentUsers.filter((currentUser) => currentUser.id !== user.id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete this user. Please try again.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <section className="my-8 rounded-2xl bg-white p-6 shadow">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User management</h2>
          <p className="mt-1 text-sm text-slate-600">Update account types or remove accounts without trading activity.</p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-sm text-slate-600">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="py-6 text-sm text-slate-600">No user accounts found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-3 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Phone</th>
                <th className="px-3 py-3 font-semibold">County</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Activity</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isAdmin = user.role === 'ADMIN';
                const hasActivity = user._count.listings > 0 || user._count.bids > 0;
                const isBusy = busyUserId === user.id;
                return (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{user.fullName}</p>
                      <p className="text-slate-600">{user.email}</p>
                    </td>
                    <td className="px-3 py-4 text-slate-700">{user.phone}</td>
                    <td className="px-3 py-4 text-slate-700">{user.county}</td>
                    <td className="px-3 py-4">
                      <select
                        aria-label={`Role for ${user.fullName}`}
                        value={user.role}
                        disabled={isAdmin || isBusy}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {isAdmin && <option value="ADMIN">Administrator</option>}
                        <option value="FARMER">Farmer / seller</option>
                        <option value="BUYER">Buyer</option>
                      </select>
                    </td>
                    <td className="px-3 py-4 text-slate-700">
                      {user._count.listings} listings, {user._count.bids} bids
                    </td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={isAdmin || user.id === currentUserId || hasActivity || isBusy}
                        title={
                          isAdmin || user.id === currentUserId
                            ? 'Administrator accounts cannot be deleted here.'
                            : hasActivity
                              ? 'Users with listings or bids cannot be deleted.'
                              : 'Delete user'
                        }
                        className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? 'Please wait...' : 'Delete'}
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
  );
};

export default AdminUserManagement;
