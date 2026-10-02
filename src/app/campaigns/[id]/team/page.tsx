import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  UsersRound,
  ShieldAlert,
  Building,
  UserCheck,
  Search,
  Filter,
  Plus,
  Mail,
  MoreVertical,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import { AssignAreaForm } from '@/components/team/AssignAreaForm';
import { AddTeamMemberModal } from '@/components/team/AddTeamMemberModal';
import { TeamMembersList } from '@/components/team/TeamMembersList';

export const revalidate = 0;

export default async function TeamManagementPage({ params }: { params: { id: string } }) {
  const [memberships, wards, booths, assignments] = await Promise.all([
    prisma.campaignMembership.findMany({
      where: { campaignId: params.id, active: true },
      include: {
        user: {
          include: { assignments: { where: { campaignId: params.id } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ward.findMany({ where: { campaignId: params.id }, orderBy: { wardNumber: 'asc' } }),
    prisma.booth.findMany({ where: { campaignId: params.id }, orderBy: { boothNumber: 'asc' } }),
    prisma.assignment.findMany({ where: { campaignId: params.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  const users = memberships.map((m) => ({
    ...m.user,
    role: m.role,
    scopeType: m.scopeType,
    scopeIds: m.scopeIds,
  }));

  const totalMembers = users.length;
  const adminCount = users.filter((u) => u.role === 'CAMPAIGN_ADMIN' || u.role === 'SUPER_ADMIN').length;
  const boothManagerCount = users.filter((u) => u.role === 'BOOTH_MANAGER').length;
  const agentCount = users.filter((u) => u.role === 'POLITICAL_AGENT' || u.role === 'AGENT').length;


  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader currentCampaignId={params.id} />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage your campaign team, assign areas, and track field operations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="py-2 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Invite Member
              </button>
              <AddTeamMemberModal campaignId={params.id} />
            </div>
          </div>


          {/* 4 Metric Cards directly sourced from DB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              title="Total Team Members"
              value={totalMembers.toString()}
              subtitle="Active staff & agents"
              icon={UsersRound}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Campaign Admins"
              value={adminCount.toString()}
              subtitle="Authorized leaders"
              icon={ShieldAlert}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Booth Managers"
              value={boothManagerCount.toString()}
              subtitle="Supervising booths"
              icon={Building}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="Political Agents"
              value={agentCount.toString()}
              subtitle="Active field workers"
              icon={UserCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
            />
          </div>

          {/* Main Grid: Left Table (2 cols) & Right Assignment Panel (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Team Members List (2 Cols) dynamically loaded and filtered */}
            <TeamMembersList
              users={users.map((u) => ({
                id: u.id,
                displayName: u.displayName,
                phone: u.phone,
                email: u.email,
                role: u.role,
                status: u.status,
                assignments: (u.assignments || []).map((a: any) => ({
                  scopeType: a.scopeType,
                  scopeTarget: a.scopeTarget,
                })),
              }))}
              wards={wards.map((w) => ({ id: w.id, name: w.name }))}
              booths={booths.map((b) => ({ id: b.id, name: b.name, boothNumber: b.boothNumber }))}
            />

            {/* Right Assignment Panel directly connected to active campaign */}
            <AssignAreaForm
              campaignId={params.id}
              users={users.map((u) => ({ id: u.id, displayName: u.displayName, role: u.role }))}
              wards={wards.map((w) => ({ id: w.id, name: w.name }))}
              booths={booths.map((b) => ({ id: b.id, name: b.name, boothNumber: b.boothNumber }))}
            />

          </div>
        </main>
      </div>
    </div>
  );
}
