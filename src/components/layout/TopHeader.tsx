'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, ChevronDown } from 'lucide-react';

interface TopHeaderProps {
  roleBadgeText?: string;
  userName?: string;
  userRoleTitle?: string;
  currentCampaignId?: string;
}

export function TopHeader({
  roleBadgeText: initialRoleBadge,
  userName: initialUserName,
  userRoleTitle: initialRoleTitle,
  currentCampaignId,
}: TopHeaderProps) {
  const [currentUser, setCurrentUser] = React.useState<{
    id?: string;
    displayName?: string;
    email?: string;
    role?: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    async function loadIdentityAndCampaigns() {
      try {
        const [meRes, campaignsRes] = await Promise.all([
          fetch('/api/v1/auth/me'),
          fetch('/api/v1/campaigns'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (isMounted && meData.data?.user) {
            setCurrentUser(meData.data.user);
          }
        }

        if (campaignsRes.ok) {
          const campData = await campaignsRes.json();
          if (isMounted && campData.data && Array.isArray(campData.data)) {
            setCampaigns(campData.data);
          }
        }
      } catch (e) {
        // silent fallback
      }
    }
    loadIdentityAndCampaigns();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      window.location.href = '/login';
    }
  };

  // Canonical identity determination
  const displayName = currentUser?.displayName || initialUserName || '';
  const roleName = currentUser?.role || '';

  const formatRoleTitle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'System Administrator';
      case 'CAMPAIGN_ADMIN':
        return 'Campaign Administrator';
      case 'POLITICAL_AGENT':
        return 'Political Agent';
      default:
        return initialRoleTitle || 'User';
    }
  };

  const formatRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'CAMPAIGN_ADMIN':
        return 'Campaign Admin';
      case 'POLITICAL_AGENT':
        return 'Field Agent';
      default:
        return initialRoleBadge || 'System';
    }
  };

  const userRoleTitle = currentUser?.role ? formatRoleTitle(currentUser.role) : (initialRoleTitle || '');
  const roleBadgeText = currentUser?.role ? formatRoleBadge(currentUser.role) : (initialRoleBadge || 'System');

  const initials = displayName
    ? displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Role Pill & Campaign Switcher */}
      <div className="flex items-center gap-4">
        {roleBadgeText && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            {roleBadgeText}
          </span>
        )}

        {campaigns.length > 0 && currentCampaignId && (
          <select
            value={currentCampaignId}
            onChange={(e) => {
              window.location.href = `/campaigns/${e.target.value}`;
            }}
            aria-label="Switch Campaign Instance"
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none hover:bg-slate-100 transition max-w-[220px] truncate"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Search Input Bar (Center/Right aligned) */}
      <div className="flex-1 max-w-lg mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* Right Controls: Notifications & User profile */}
      <div className="flex items-center gap-5 relative">
        {/* Notification Bell */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        {/* User Card with Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 pl-2 border-l border-slate-200 hover:opacity-90 transition text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm overflow-hidden">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-900 leading-tight flex items-center gap-1">
                <span>{displayName || 'Loading...'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xs text-slate-500">{userRoleTitle}</div>
            </div>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
