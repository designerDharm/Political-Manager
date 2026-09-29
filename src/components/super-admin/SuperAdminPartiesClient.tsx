'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Flag, Plus, Trash2, X, Check, AlertCircle, ShieldCheck, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PartyItem {
  id: string;
  name: string;
  abbreviation: string;
  symbolUrl: string;
  createdAt: string;
  _count?: { candidates: number };
}

export default function SuperAdminPartiesClient({ initialParties }: { initialParties: PartyItem[] }) {
  const router = useRouter();
  const [parties, setParties] = useState<PartyItem[]>(initialParties);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [symbolUrl, setSymbolUrl] = useState('');
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
      const res = await fetch('/api/v1/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          abbreviation: abbreviation.trim() || undefined,
          symbolUrl: symbolUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to create political party');
      }

      setParties([...parties, json.data]);
      setSuccess('Political party / entity added successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setName('');
        setAbbreviation('');
        setSymbolUrl('');
        setSuccess('');
        router.refresh();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, partyName: string) => {
    if (!confirm(`Are you sure you want to delete ${partyName}?`)) return;

    try {
      const res = await fetch(`/api/v1/parties/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || 'Failed to delete party');
        return;
      }
      setParties(parties.filter((p) => p.id !== id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting party');
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Political Parties & Independent Entities</h1>
              <p className="text-xs text-slate-500 mt-1">
                Configure approved national & regional political parties, independent categories, registered symbols, and brand identifiers.
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Political Party / Entity
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <StatCard
              title="Registered Parties"
              value={parties.length.toString()}
              subtitle="Configured in database"
              icon={Flag}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Independent Support"
              value="Active"
              subtitle="Free symbol allocation"
              icon={Tag}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Enabled', type: 'success' }}
            />
            <StatCard
              title="Super Admin Governed"
              value="100%"
              subtitle="Zero hardcoded strings"
              icon={ShieldCheck}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Configured Parties & Free Symbols Directory</h3>
            <div className="divide-y divide-slate-100">
              {parties.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No political parties configured yet.</div>
              ) : (
                parties.map((p) => (
                  <div key={p.id} className="py-4 flex items-center justify-between hover:bg-slate-50/50 p-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-lg">
                        {p.symbolUrl ? p.symbolUrl.slice(0, 2) : '🏛️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                          {p.abbreviation && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {p.abbreviation}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Symbol: <span className="font-medium text-slate-700">{p.symbolUrl || 'Assigned by Election Commission / Free Symbol'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Delete Party"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Provision Political Party / Entity</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="mt-4 space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{success}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Party / Candidate Entity Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Independent Candidate, Samaj Kalyan Party"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Abbreviation / Short Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IND, SKP, BVP"
                      value={abbreviation}
                      onChange={(e) => setAbbreviation(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Election Symbol Description / Emoji / Logo Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ⚖️ Scales of Justice, 🚜 Tractor, 🪁 Kite"
                      value={symbolUrl}
                      onChange={(e) => setSymbolUrl(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
                    >
                      {loading ? 'Creating...' : 'Save Party'}
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
