'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaignRealtime } from '@/hooks/useCampaignRealtime';
import { RotateCw } from 'lucide-react';

interface AgentRealtimeListenerProps {
  campaignId?: string;
}

export function AgentRealtimeListener({ campaignId }: AgentRealtimeListenerProps) {
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { connectionState } = useCampaignRealtime({
    campaignId,
    onEvent: (event) => {
      // If assignment or visit or issue changes, refresh server-component view
      if (
        event.type.startsWith('ASSIGNMENT_') ||
        event.type === 'FIELD_VISIT_RECORDED' ||
        event.type === 'ISSUE_CREATED' ||
        event.entityType === 'Assignment'
      ) {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
          router.refresh();
        }, 300);
      }
    },
  });

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border">
      {connectionState === 'CONNECTED' ? (
        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      ) : connectionState === 'RECONNECTING' ? (
        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200">
          <RotateCw className="w-2.5 h-2.5 animate-spin" />
          Syncing
        </span>
      ) : (
        <span className="text-slate-400">Offline</span>
      )}
    </div>
  );
}
