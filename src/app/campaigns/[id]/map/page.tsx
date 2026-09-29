import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { CampaignMapClient } from '@/components/map/CampaignMapClient';

export const revalidate = 0;

export default async function CoverageMapPage({ params }: { params: { id: string } }) {
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
          <CampaignMapClient campaignId={params.id} userRole="CAMPAIGN_ADMIN" />
        </main>
      </div>
    </div>
  );
}
