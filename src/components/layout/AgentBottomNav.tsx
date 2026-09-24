'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ListTodo,
  Search,
  MapPin,
  User,
} from 'lucide-react';

export function AgentBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Tasks', href: '/agent/tasks', icon: ListTodo },
    { name: 'Search', href: '/agent/search', icon: Search },
    { name: 'Map', href: '/agent/map', icon: MapPin },
    { name: 'Admin', href: '/super-admin', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200 py-2.5 px-8 flex items-center justify-between z-30 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href === '/agent/tasks' && pathname === '/agent');

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
