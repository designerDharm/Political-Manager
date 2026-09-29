'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Shield, ChevronDown } from 'lucide-react';

interface TopHeaderProps {
  roleBadgeText?: string;
  userName?: string;
  userRoleTitle?: string;
}

export function TopHeader({
  roleBadgeText = 'Super Admin',
  userName = 'Rajesh Sharma',
  userRoleTitle = 'System Owner',
  currentCampaignId,
}: TopHeaderProps & { currentCampaignId?: string }) {
  const [campaigns, setCampaigns] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function loadCampaigns() {
      try {
        const res = await fetch('/api/v1/campaigns');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setCampaigns(json.data);
        }
      } catch (e) {
        // silent fallback
      }
    }
    loadCampaigns();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Role Pill & Campaign Switcher */}
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          {roleBadgeText}
        </span>

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
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </button>

        {/* User Card */}
        <Link href="/login" className="flex items-center gap-3 pl-2 border-l border-slate-200 hover:opacity-90 transition">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm overflow-hidden">
            {/* Fallback avatar visual */}
            <span>{userName.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-semibold text-slate-900 leading-tight flex items-center gap-1">
              {userName}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-500">{userRoleTitle}</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
