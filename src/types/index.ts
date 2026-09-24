export type UserRole = 'SUPER_ADMIN' | 'CAMPAIGN_ADMIN' | 'BOOTH_MANAGER' | 'POLITICAL_AGENT';

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  campaignId?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
