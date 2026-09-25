import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/ui/Logo';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import {
  Bell,
  Home,
  Users,
  MapPin,
  ListTodo,
  CheckCircle2,
  Clock,
  Play,
  ChevronRight,
  Shield,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';

export const revalidate = 0;

export default async function AgentHomePage() {
  const [activeCampaign, totalHouseholds, completedHouseholds, firstHousehold, assignment] = await Promise.all([
    prisma.campaign.findFirst({ where: { status: 'ACTIVE' } }),
    prisma.household.count(),
    prisma.household.count({ where: { status: 'Verified' } }),
    prisma.household.findFirst({ orderBy: { code: 'asc' } }),
    prisma.assignment.findFirst({ orderBy: { createdAt: 'desc' }, include: { user: true } }),
  ]);

  const pendingHouseholds = Math.max(0, totalHouseholds - completedHouseholds);
  const targetHid = firstHousehold?.code || 'H-001';
  const assignedAgentName = assignment?.user?.displayName || 'Rakesh';
  const assignedArea = assignment?.scopeTarget ? `${assignment.scopeType}: ${assignment.scopeTarget}` : 'Ward 12 • Booth 118';

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      {/* Mobile container matching dashboard _ Mobile view.png */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Top Status Bar & App Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0B132B] flex items-center justify-center p-1 shadow-sm">
              <Logo variant="icon-white" width={22} height={22} />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">CampaignOps</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Greeting */}
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <h1 className="text-xl font-black text-slate-900">
                Good Morning, <span className="text-blue-600">{assignedAgentName}</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Field Operations Active</p>
            </div>
          </div>

          {/* Today's Assigned Area Card directly matching screenshot */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                Today&apos;s Assigned Area
              </span>
              <h2 className="text-lg font-black text-slate-900">
                {assignedArea}
              </h2>
            </div>
            <button className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-50 transition">
              Change
            </button>
          </div>

          {/* 3 Quick Metrics directly sourced from database SSoT */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center mx-auto mb-1.5">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-slate-900 block leading-tight">{totalHouseholds}</span>
              <span className="text-[10px] text-slate-500 font-medium">Households</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-slate-900 block leading-tight">{completedHouseholds}</span>
              <span className="text-[10px] text-slate-500 font-medium">Completed</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
              <div className="w-8 h-8 rounded-xl bg-rose-100/70 text-rose-600 flex items-center justify-center mx-auto mb-1.5">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-lg font-black text-slate-900 block leading-tight">{pendingHouseholds}</span>
              <span className="text-[10px] text-slate-500 font-medium">Pending</span>
            </div>
          </div>

          {/* Big "Start Visit" CTA Button */}
          <Link
            href={`/agent/visit/${targetHid}`}
            className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Visit</span>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </Link>

          {/* Today's Tasks */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-900">Today&apos;s Tasks</h3>
              <a href="#" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="space-y-2.5">
              <Link
                href="/agent/visit/H-001"
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Household 101-120</h4>
                    <p className="text-[11px] text-slate-500">20 households</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Follow-up Visits</h4>
                    <p className="text-[11px] text-slate-500">12 households</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Issue Follow-ups</h4>
                    <p className="text-[11px] text-slate-500">5 households</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

        </main>

        {/* Fixed Mobile Bottom Navigation directly matching attached screenshot */}
        <AgentBottomNav />

      </div>
    </div>
  );
}
