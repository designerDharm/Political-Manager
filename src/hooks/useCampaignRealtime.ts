'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEventPayload {
  eventId: string;
  type: string;
  campaignId: string;
  entityType: string;
  entityId: string | null;
  changedAt: string;
}

export type RealtimeConnectionState = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

interface UseCampaignRealtimeOptions {
  campaignId?: string;
  onEvent?: (event: RealtimeEventPayload) => void;
  enabled?: boolean;
}

export function useCampaignRealtime({
  campaignId,
  onEvent,
  enabled = true,
}: UseCampaignRealtimeOptions) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('DISCONNECTED');
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !campaignId) {
      setConnectionState('DISCONNECTED');
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isDestroyed = false;

    function connect() {
      if (isDestroyed || !campaignId) return;

      const url = `/api/v1/realtime?campaignId=${encodeURIComponent(campaignId)}`;
      eventSource = new EventSource(url, { withCredentials: true });

      eventSource.onopen = () => {
        if (!isDestroyed) {
          setConnectionState('CONNECTED');
        }
      };

      eventSource.addEventListener('connected', () => {
        if (!isDestroyed) {
          setConnectionState('CONNECTED');
        }
      });

      // Generic event listener for all operational mutations
      const handleMutation = (e: MessageEvent) => {
        try {
          const payload: RealtimeEventPayload = JSON.parse(e.data);
          if (payload && payload.eventId) {
            // Deduplicate events across reconnects
            if (seenEventIdsRef.current.has(payload.eventId)) {
              return;
            }
            seenEventIdsRef.current.add(payload.eventId);
            // Cap seen buffer
            if (seenEventIdsRef.current.size > 200) {
              const first = Array.from(seenEventIdsRef.current)[0];
              if (first) {
                seenEventIdsRef.current.delete(first);
              }
            }

            if (onEventRef.current) {
              onEventRef.current(payload);
            }
          }
        } catch (err) {
          console.error('Failed to parse realtime SSE message:', err);
        }
      };

      // Listen to specific audit actions
      const actions = [
        'ASSIGNMENT_CREATED',
        'ASSIGNMENT_UPDATED',
        'ASSIGNMENT_CANCELLED',
        'FIELD_VISIT_RECORDED',
        'HOUSEHOLD_UPDATED',
        'HOUSEHOLD_CONFIRMED',
        'HOUSEHOLD_MEMBER_MOVED',
        'HOUSEHOLD_SPLIT',
        'HOUSEHOLD_MERGED',
        'HOUSEHOLD_ADDRESS_CORRECTED',
        'ISSUE_CREATED',
        'ISSUE_UPDATED',
        'AGENT_ADDED_TO_CAMPAIGN',
        'ELECTION_DAY_ACTIVATED',
        'ELECTION_DAY_CLOSED',
        'VIS_ISSUED',
        'VIS_REISSUED',
        'TURNOUT_RECORDED',
      ];

      actions.forEach((act) => {
        eventSource?.addEventListener(act, handleMutation);
      });

      eventSource.onerror = (err) => {
        if (isDestroyed) return;
        setConnectionState('RECONNECTING');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // Debounced reconnection
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };
    }

    connect();

    return () => {
      isDestroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
      setConnectionState('DISCONNECTED');
    };
  }, [campaignId, enabled]);

  return { connectionState };
}
