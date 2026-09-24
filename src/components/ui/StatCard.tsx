import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  badge?: {
    text: string;
    type?: 'success' | 'warning' | 'danger' | 'info';
  };
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBgColor = 'bg-blue-50',
  badge,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-card hover:shadow-card-hover transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {badge && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              badge.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : badge.type === 'danger'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
