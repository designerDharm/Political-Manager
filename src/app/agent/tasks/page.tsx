import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AgentBottomNav } from '@/components/layout/AgentBottomNav';
import { prisma } from '@/lib/prisma';
import {
  ListTodo,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const revalidate = 0;

export default async function AgentTasksPage() {
  const [tasks, completedCount, pendingCount, firstHousehold] = await Promise.all([
    prisma.assignment.findMany({
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.assignment.count({ where: { status: 'Completed' } }),
    prisma.assignment.count({ where: { status: 'Active' } }),
    prisma.household.findFirst({ orderBy: { code: 'asc' } }),
  ]);

  const targetHid = firstHousehold?.code || 'H-001';

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-slate-200 relative pb-20 shadow-lg">
        
        {/* Header */}
        <header className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <Link href="/agent" className="p-1 -ml-1 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-base text-slate-900">My Field Tasks</h1>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {pendingCount} Active
          </span>
        </header>

        <main className="p-4 flex-1 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Active Tasks</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-950">{pendingCount || 4}</span>
                <span className="text-xs text-blue-700">assigned</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Completed</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-950">{completedCount || 12}</span>
                <span className="text-xs text-emerald-700">verified</span>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Current Sector Tasks</h3>

            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-blue-400 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mb-1">
                      {task.taskType}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{task.scopeTarget}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    task.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {task.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> Ward 12, Booth 101
                  </span>
                  <Link
                    href={`/agent/visit/${targetHid}`}
                    className="text-xs font-bold text-blue-600 flex items-center gap-0.5 hover:underline"
                  >
                    Start Visit <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>

        <AgentBottomNav />
      </div>
    </div>
  );
}
