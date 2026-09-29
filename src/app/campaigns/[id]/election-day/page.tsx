import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { ElectionDayClient } from '@/components/campaign/ElectionDayClient';

export const revalidate = 0;

export default async function ElectionDayPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="CAMPAIGN_ADMIN" campaignId={params.id} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader />

        <main className="flex-1 p-8 overflow-y-auto">
          <ElectionDayClient campaignId={params.id} />
        </main>
      </div>
    </div>
  );
}
