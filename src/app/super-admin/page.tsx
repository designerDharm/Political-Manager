import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/ui/StatCard';
import { prisma } from '@/lib/prisma';
import {
  Users,
  Megaphone,
  UserCheck,
  HardDrive,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // Dynamic data directly from DB Single Source of Truth

export default async function SuperAdminDashboard() {
  // Query dynamic database counts to guarantee SSoT
  const [orgCount, campaignCount, userCount, importCount] = await Promise.all([
    prisma.organization.count(),
    prisma.campaign.count(),
    prisma.user.count(),
    prisma.electoralRollImport.count(),
  ]);

  const recentActivities = [
    {
      id: 1,
      icon: Megaphone,
      iconBg: 'bg-rose-50 text-rose-600',
      title: 'New campaign created - Sharma for Assembly',
      desc: 'Campaign setup completed successfully',
      time: '5 min ago',
    },
    {
      id: 2,
      icon: Database,
      iconBg: 'bg-emerald-50 text-emerald-600',
      title: 'Voter data processed - Ward 12',
      desc: '2,640 voters processed & normalized',
      time: '18 min ago',
    },
    {
      id: 3,
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      title: 'New users added - Team Rajasthan',
      desc: '12 users invited and activated',
      time: '1 hour ago',
    },
    {
      id: 4,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      title: 'Backup completed successfully',
      desc: 'Daily system backup finished (snapshot encrypted)',
      time: '2 hours ago',
    },
    {
      id: 5,
      icon: Cpu,
      iconBg: 'bg-purple-50 text-purple-600',
      title: 'AI processing completed - 2,64,000 voters',
      desc: 'Voter analysis and household suggestions completed',
      time: '3 hours ago',
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Dark Navy Sidebar directly matching Dashboard.png */}
      <Sidebar role="SUPER_ADMIN" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          roleBadgeText="Super Admin"
          userName="Rajesh Sharma"
          userRoleTitle="System Owner"
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header Title Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Overview</h1>
            <p className="text-sm text-slate-500 mt-1">
              System-wide statistics and activity overview for CampaignOps platform.
            </p>
          </div>

          {/* 6 Stat Cards directly matching Dashboard.png */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            <StatCard
              title="Total Clients"
              value={orgCount.toLocaleString()}
              subtitle="Registered organizations"
              icon={Users}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
            />
            <StatCard
              title="Active Campaigns"
              value={campaignCount.toLocaleString()}
              subtitle="Currently running"
              icon={Megaphone}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
            />
            <StatCard
              title="Total Users"
              value={userCount.toLocaleString()}
              subtitle="Platform users"
              icon={UserCheck}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
            />
            <StatCard
              title="Storage Used"
              value="0.2 GB"
              subtitle="Database storage allocated"
              icon={HardDrive}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
            />
            <StatCard
              title="AI Processing Jobs"
              value={importCount.toLocaleString()}
              subtitle="Electoral roll batches"
              icon={Cpu}
              iconColor="text-rose-600"
              iconBgColor="bg-rose-50"
            />
            <StatCard
              title="System Health"
              value="Healthy"
              subtitle="All systems operational"
              icon={ShieldCheck}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              badge={{ text: 'Operational', type: 'success' }}
            />
          </div>

          {/* Bottom Grid: Activity Chart & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Campaigns Activity Trends Chart Card (2 Cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Campaigns Overview</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Monthly campaign activity trends across all clients</p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-slate-600">Active Campaigns</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-600">Scheduled</span>
                  </div>

                  <select className="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 bg-slate-50 text-xs focus:outline-none">
                    <option>Jan 2024 - Dec 2024</option>
                  </select>
                </div>
              </div>

              {/* Trend Chart Mock SVG directly matching visual curvature */}
              <div className="h-64 relative flex items-end pt-4 pb-2 border-b border-slate-100">
                <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="0" y1="30" x2="700" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="80" x2="700" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="130" x2="700" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="180" x2="700" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Green completed curve */}
                  <path
                    d="M 20 160 C 80 130, 150 145, 230 115 C 310 85, 370 120, 450 150 C 530 150, 610 110, 680 100"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                  />

                  {/* Blue active curve */}
                  <path
                    d="M 20 180 C 80 170, 150 175, 230 130 C 310 110, 370 145, 450 100 C 530 80, 610 60, 680 40"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                  />
                  {/* Area fill */}
                  <path
                    d="M 20 180 C 80 170, 150 175, 230 130 C 310 110, 370 145, 450 100 C 530 80, 610 60, 680 40 L 680 200 L 20 200 Z"
                    fill="url(#blueGrad)"
                  />

                  {/* Data Points on blue line */}
                  {[
                    { cx: 20, cy: 180 },
                    { cx: 120, cy: 172 },
                    { cx: 230, cy: 130 },
                    { cx: 340, cy: 120 },
                    { cx: 450, cy: 100 },
                    { cx: 560, cy: 75 },
                    { cx: 680, cy: 40 },
                  ].map((pt, i) => (
                    <circle key={i} cx={pt.cx} cy={pt.cy} r="4" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
                  ))}
                </svg>
              </div>

              {/* Month Labels */}
              <div className="flex justify-between text-[11px] text-slate-400 mt-3 px-2">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>

            {/* Recent Activities Feed (1 Col) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Recent Activities</h3>
                  </div>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View All <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 -mt-3 mb-5">Latest platform activities and system events</p>

                <div className="space-y-4">
                  {recentActivities.map((act) => {
                    const ActIcon = act.icon;
                    return (
                      <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${act.iconBg}`}>
                          <ActIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{act.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">{act.desc}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{act.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>System status: Normal</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime Active
                </span>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
