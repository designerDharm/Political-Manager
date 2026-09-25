'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Building2, Plus, Users, ShieldCheck, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count?: { campaigns: number; users: number };
}

export default function SuperAdminOrganizationsClient({ initialOrgs }: { initialOrgs: Organization[] }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>(initialOrgs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create organization');
      }

      setOrgs([json.data, ...orgs]);
      setSuccess('Organization added successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setName('');
        setSlug('');
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organizations & Tenants</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage political consultancies, party state committees, and client accounts in multi-tenant isolation.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Organization
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <StatCard title="Active Organizations" value={orgs.length.toString()} subtitle="Licensed entities" icon={Building2} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
            <StatCard title="Total Associated Users" value={orgs.reduce((acc, o) => acc + (o._count?.users || 0), 0).toString()} subtitle="Across all orgs" icon={Users} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" />
            <StatCard title="Multi-Tenant Isolation" value="100%" subtitle="Enforced in DB layer" icon={ShieldCheck} iconColor="text-purple-600" iconBgColor="bg-purple-50" badge={{ text: 'Compliant', type: 'success' }} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Registered Organizations</h3>
            <div className="divide-y divide-slate-100">
              {orgs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No organizations registered yet.</div>
              ) : (
                orgs.map((o) => (
                  <div key={o.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {o.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{o.name}</h4>
                        <p className="text-xs text-slate-500 font-mono">Slug: {o.slug} • Plan: Enterprise Tier</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                      <span>{o._count?.campaigns || 0} Campaigns</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
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
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Add New Organization</h3>
                </div>

                {error && <div className="p-3 mb-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">{error}</div>}
                {success && <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> {success}</div>}

                <form onSubmit={handleCreate} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. National Campaign Committee"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!slug) {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                        }
                      }}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                      Tenant Slug (Identifier)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. national-campaign-committee"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-mono text-[11px]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
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
                      {loading ? 'Creating...' : 'Create Organization'}
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
