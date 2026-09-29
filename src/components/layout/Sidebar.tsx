'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Users,
  Database,
  Cpu,
  FileText,
  Archive,
  ShieldCheck,
  Settings,
  UserCheck,
  MapPin,
  BarChart3,
  CalendarCheck,
  UsersRound,
  AlertCircle,
  FileSpreadsheet,
  Home,
} from 'lucide-react';

interface SidebarProps {
  role: 'SUPER_ADMIN' | 'CAMPAIGN_ADMIN' | 'POLITICAL_AGENT';
  campaignId?: string;
}

export function Sidebar({ role, campaignId = 'sharma-assembly-2026' }: SidebarProps) {
  const pathname = usePathname();

  const superAdminLinks = [
    { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Organizations', href: '/super-admin/organizations', icon: Building2 },
    { name: 'Campaigns', href: '/super-admin/campaigns', icon: Megaphone },
    { name: 'Users', href: '/super-admin/users', icon: Users },
    { name: 'Parties & Symbols', href: '/super-admin/parties', icon: UserCheck },
    { name: 'Data Processing', href: '/super-admin/data-processing', icon: Database },
    { name: 'AI Jobs', href: '/super-admin/ai-jobs', icon: Cpu },
    { name: 'System Logs', href: '/super-admin/system-logs', icon: FileText },
    { name: 'Backups', href: '/super-admin/backups', icon: Archive },
    { name: 'Security', href: '/super-admin/security', icon: ShieldCheck },
    { name: 'Settings', href: '/super-admin/settings', icon: Settings },
  ];

  const campaignAdminLinks = [
    { name: 'Dashboard', href: `/campaigns/${campaignId}`, icon: LayoutDashboard },
    { name: 'Campaigns', href: `/campaigns/new`, icon: Megaphone },
    { name: 'Candidates', href: `/campaigns/${campaignId}/candidates`, icon: UserCheck },
    { name: 'Voter Data', href: `/campaigns/${campaignId}/voters`, icon: Users },
    { name: 'Households', href: `/campaigns/${campaignId}/households`, icon: Home },
    { name: 'Field Operations', href: `/campaigns/${campaignId}/field`, icon: MapPin },
    { name: 'Analytics', href: `/campaigns/${campaignId}/analytics`, icon: BarChart3 },
    { name: 'Election Day', href: `/campaigns/${campaignId}/election-day`, icon: CalendarCheck },
    { name: 'Team Management', href: `/campaigns/${campaignId}/team`, icon: UsersRound },
    { name: 'Issues & Follow-up', href: `/campaigns/${campaignId}/issues`, icon: AlertCircle },
    { name: 'Reports', href: `/campaigns/${campaignId}/reports`, icon: FileSpreadsheet },
    { name: 'Settings', href: `/campaigns/${campaignId}/settings`, icon: Settings },
  ];

  const links = role === 'SUPER_ADMIN' ? superAdminLinks : campaignAdminLinks;

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col flex-shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60">
        <Logo variant="light" />
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/super-admin' && item.href !== `/campaigns/${campaignId}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer Switcher Shortcut & Logout */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 text-xs text-slate-400 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-wider font-semibold text-[10px] text-slate-500">Navigation</span>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/v1/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition"
          >
            Sign Out
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/super-admin"
            className="flex-1 py-1.5 px-2 text-center rounded bg-slate-800/80 hover:bg-blue-600 hover:text-white transition text-[11px]"
          >
            Super Admin
          </Link>
          <Link
            href={`/campaigns/${campaignId}`}
            className="flex-1 py-1.5 px-2 text-center rounded bg-slate-800/80 hover:bg-blue-600 hover:text-white transition text-[11px]"
          >
            Campaign
          </Link>
          <Link
            href="/agent"
            className="flex-1 py-1.5 px-2 text-center rounded bg-slate-800/80 hover:bg-blue-600 hover:text-white transition text-[11px]"
          >
            Agent
          </Link>
        </div>
      </div>
    </aside>
  );
}
