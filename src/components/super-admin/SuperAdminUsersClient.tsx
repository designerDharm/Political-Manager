'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Users, UserCheck, Shield, Plus, X, Check, Mail, Lock, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  phone: string | null;
  status: string;
  organization?: { id: string; name: string } | null;
  devices?: any[];
}

export default function SuperAdminUsersClient({
  initialUsers,
  organizations,
}: {
  initialUsers: UserItem[];
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('CAMPAIGN_ADMIN');
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          email,
          password,
          phone,
          role,
          organizationId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to provision user');
      }

      setUsers([json.data, ...users]);
      setSuccess('User account provisioned successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setDisplayName('');
        setEmail('');
        setPhone('');
        setPassword('password123');
        setSuccess('');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="SUPER_ADMIN" />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader roleBadgeText="Super Admin" userName="Vikramaditya Rao" userRoleTitle="System Administrator" />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Users & Access Control</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage user identities, platform role hierarchy (RBAC), and device authentication state.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Provision User
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Total Platform Users" value={users.length.toString()} subtitle="Super admins & agents" icon={Users} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Active Accounts" value={users.filter((u) => u.status === 'ACTIVE').length.toString()} subtitle="Authorized credentials" icon={UserCheck} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" badge={{ text: 'Live', type: 'success' }} />
            <StatCard title="Role Protection" value="RBAC Strict" subtitle="Enforced on all routes" icon={Shield} iconColor="text-purple-600" iconBgColor="bg-purple-50" />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">User Accounts</h3>
            <div className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No users provisioned yet.</div>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center">
                        {u.displayName ? u.displayName.slice(0, 1).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{u.displayName}</h4>
                        <p className="text-slate-500 text-[11px] font-mono">{u.email} • Phone: {u.phone || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {u.role}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Provision New Platform User</h3>
                </div>

                {error && <div className="p-3 mb-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">{error}</div>}
                {success && <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> {success}</div>}

                <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Chandra"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@campaignops.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98765 00000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                        Platform Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                      >
                        <option value="CAMPAIGN_ADMIN">Campaign Admin</option>
                        <option value="BOOTH_MANAGER">Booth Manager</option>
                        <option value="POLITICAL_AGENT">Political Agent</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                        Organization
                      </label>
                      <select
                        value={organizationId}
                        onChange={(e) => setOrganizationId(e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 font-semibold"
                      >
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="py-2 px-4 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
                    >
                      {loading ? 'Provisioning...' : 'Provision User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
