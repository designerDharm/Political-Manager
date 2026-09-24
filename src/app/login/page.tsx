'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@campaignops.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (email.includes('admin') || email.includes('super')) {
        router.push('/super-admin');
      } else if (email.includes('agent') || email.includes('rakesh')) {
        router.push('/agent');
      } else {
        router.push('/campaigns/sharma-assembly-2026');
      }
    }, 400);
  };

  const selectRoleDemo = (roleEmail: string) => {
    setEmail(roleEmail);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Container Box matching Login page.png */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-slate-200">
        
        {/* Left Rally Hero Banner */}
        <div className="relative bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Info */}
          <div className="relative z-10 space-y-3">
            <Logo variant="logo-white" width={170} height={56} />
            <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-blue-200 border border-white/10">
              Trusted Campaign Infrastructure
            </span>
          </div>

          {/* Slogan Text directly matching reference screenshot */}
          <div className="relative z-10 my-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Stronger <br />
              People <br />
              Stronger <br />
              Democracy
            </h1>
            <div className="w-12 h-1 bg-blue-500 rounded-full my-4" />
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              Data. People. Progress.<br />
              Together for a Better Tomorrow.
            </p>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 text-xs text-slate-400">
            Enterprise Grade • End-to-End Encryption
          </div>
        </div>

        {/* Right Form Card */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <Logo variant="dark" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to continue to CampaignOps</p>
          </div>

          {/* Official Login Credentials Notice */}
          <div className="mb-6 p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
            <span className="font-bold text-blue-950 block">Super Admin Access</span>
            <p className="text-[11px] text-blue-800 mt-0.5">
              Enter your authorized credentials below to access the Super Admin control panel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email / Mobile
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email or mobile"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>Remember me</span>
              </label>
              <a href="#" className="font-medium text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-70"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative px-3 bg-white text-xs text-slate-400 font-medium">
              or continue with
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push('/super-admin')}
              className="py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition"
            >
              <span className="text-red-500 font-bold">G</span> Google
            </button>
            <button
              type="button"
              onClick={() => router.push('/super-admin')}
              className="py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition"
            >
              <span className="text-blue-500 font-bold">田</span> Microsoft
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-400 mt-6">
            A secure platform for effective and transparent campaigns.
          </p>
        </div>

      </div>
    </div>
  );
}
