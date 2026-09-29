import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  Settings,
  Shield,
  Key,
  Database,
  Lock,
  RefreshCw,
  Bell,
  Save,
  Check,
} from 'lucide-react';

import { CampaignSettingsClient } from '@/components/campaign/CampaignSettingsClient';

export const revalidate = 0;

export default async function CampaignSettingsPage({ params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
      election: true,
      _count: {
        select: { wards: true, booths: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Campaign Admin"
          userName="Rajesh Sharma"
          userRoleTitle="Campaign Admin"
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Campaign Settings & Security</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                  {campaign?.name || 'Campaign Settings'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Configure campaign metadata, security scopes, election planning, and safe margins.
              </p>
            </div>
          </div>

          {campaign ? (
            <CampaignSettingsClient campaign={campaign} />
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              Campaign not found
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

