import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AgentLogoutButton } from '@/components/agent/AgentLogoutButton';
import {
  ArrowLeft,
  User,
  Shield,
  MapPin,
  ListTodo,
  LogOut,
  Mail,
  Phone,
  CheckCircle2,
} from 'lucide-react';

export const revalidate = 0;

export default async function AgentProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  // Get agent's active campaign memberships
  const membership = await prisma.campaignMembership.findFirst({
    where: { userId: currentUser.id, active: true },
    include: { campaign: true },
  });

  const activeCampaignId = membership?.campaignId || (await prisma.campaign.findFirst({ where: { status: 'ACTIVE' } }))?.id;

  // Resolve scope info
  let scopeBooths: any[] = [];
  if (membership?.scopeIds) {
    try {
      const boothIds: string[] = JSON.parse(membership.scopeIds);
      if (boothIds.length > 0) {
        scopeBooths = await prisma.booth.findMany({
          where: { id: { in: boothIds } },
          include: { ward: true },
        });
      }
    } catch {
      scopeBooths = [];
    }
  }

  // Assignment counts
  const [totalAssigned, completedAssigned, fieldInteractionsCount] = await Promise.all([
    prisma.assignment.count({
      where: {
        userId: currentUser.id,
        ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
      },
    }),
    prisma.assignment.count({
      where: {
        userId: currentUser.id,
        status: 'Completed',
        ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
      },
    }),
    prisma.interaction.count({
      where: {
        agentId: currentUser.id,
        ...(activeCampaignId ? { campaignId: activeCampaignId } : {}),
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base text-slate-900">Agent Profile</h1>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {currentUser.role}
          </span>
        </header>

        <main className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* User Profile Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
              {currentUser.displayName ? currentUser.displayName.slice(0, 1).toUpperCase() : 'A'}
            </div>
            <h2 className="text-base font-bold text-slate-900">{currentUser.displayName}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{currentUser.email}</p>
            {currentUser.phone && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.phone}</p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-around text-center">
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">{totalAssigned}</span>
                <span className="text-[10px] text-slate-500">Tasks</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">{completedAssigned}</span>
                <span className="text-[10px] text-slate-500">Completed</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <span className="text-lg font-black text-slate-900 block leading-tight">{fieldInteractionsCount}</span>
                <span className="text-[10px] text-slate-500">Visits Done</span>
              </div>
            </div>
          </div>

          {/* Active Campaign Context */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Campaign
            </span>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {membership?.campaign?.name || 'No Active Campaign'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Level: {membership?.campaign?.electionLevel || 'State Assembly'}
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Precinct Scope */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Assigned Field Scope
            </span>

            {scopeBooths.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {membership?.scopeType === 'ALL' ? 'Full precinct access authorized.' : 'No specific polling booth assigned yet.'}
              </p>
            ) : (
              <div className="space-y-2">
                {scopeBooths.map((b) => (
                  <div key={b.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <div>
                        <span className="font-bold text-slate-800">Booth #{b.boothNumber}</span>
                        <span className="text-[10px] text-slate-400 block">{b.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{b.ward?.name || 'Ward'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logout Action with Pending Work Check */}
          <AgentLogoutButton />
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}
