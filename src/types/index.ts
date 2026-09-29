export type UserRole = 'SUPER_ADMIN' | 'CAMPAIGN_ADMIN' | 'BOOTH_MANAGER' | 'POLITICAL_AGENT';

export interface CampaignAccess {
  campaignId: string;
  role: string;
  scopeType: string;
  scopeIds: string[];
}

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  campaignId?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  campaigns?: CampaignAccess[];
}

export interface AuthPrincipal {
  userId: string;
  email: string;
  displayName: string;
  platformRole: UserRole;
  organizationId: string;
  campaignMemberships: CampaignAccess[];
  sessionId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

