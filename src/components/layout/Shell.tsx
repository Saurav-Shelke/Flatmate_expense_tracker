import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Gift,
  Users,
  Scale,
  ArrowRightLeft,
  UserCircle,
  Mic,
  LogOut,
  Sparkles,
  Menu,
  X,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceAssistantModal } from '@/components/voice/VoiceAssistantModal';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { HouseholdMember, Category } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NavTab =
  | 'dashboard'
  | 'personal'
  | 'purchases_made'
  | 'purchases_for_me'
  | 'common'
  | 'balances'
  | 'repayments'
  | 'profile';

interface ShellProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export function Shell({ activeTab, onTabChange, children }: ShellProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Auto-fetch household members & categories globally for voice AI & selects
  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
    staleTime: 10 * 60 * 1000,
  });

  // Global hotkey: Ctrl+M / Cmd+M opens voice assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setVoiceModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'personal', label: 'Personal', icon: Receipt },
    { id: 'purchases_made', label: 'Bought for Others', icon: ShoppingBag },
    { id: 'purchases_for_me', label: 'Bought for Me', icon: Gift },
    { id: 'common', label: 'Common Expenses', icon: Users },
    { id: 'balances', label: 'Balances', icon: Scale },
    { id: 'repayments', label: 'Repayments', icon: ArrowRightLeft },
    { id: 'profile', label: 'Profile & UPI', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shrink-0 h-screen sticky top-0">
        {/* Brand / Logo */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-tight leading-tight">
                Flat Expenses
              </div>
              <div className="text-[11px] text-slate-400">
                {user?.householdName || 'Household'}
              </div>
            </div>
          </div>
          {user?.role === 'admin' && (
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 py-0">
              Admin
            </Badge>
          )}
        </div>

        {/* Voice AI Action Callout in Sidebar */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-blue-600/10 border border-cyan-500/30 hover:border-cyan-500/60 transition-all group shadow-sm"
          >
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                <Mic className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  Voice Assistant
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                </div>
                <div className="text-[10px] text-slate-400">Speak to add expense</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              ^M
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">
                  {user?.fullName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">@{user?.username}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header ─────────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-lg sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">Flat Expenses</div>
            <div className="text-[10px] text-slate-400">@{user?.username}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Voice Button on Mobile Header */}
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            aria-label="Open Voice AI Assistant"
            className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20"
          >
            <Mic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Dropdown Sheet Menu ─────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 z-40 p-4 space-y-1 animate-in slide-in-from-top-4 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id as NavTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-xs font-medium ${
                  isActive
                    ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between px-2">
            <span className="text-xs text-slate-400">Signed in as {user?.fullName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs border-slate-800 text-red-400 hover:bg-red-950/30"
            >
              Sign out
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Content Area ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* ── Floating Voice Assistant FAB (Mobile & Desktop) ───────────────────── */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setVoiceModalOpen(true)}
          className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all"
        >
          <div className="relative">
            <Mic className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
          </div>
          <span className="hidden sm:inline">Voice Assistant</span>
          <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
        </button>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        members={members}
        categories={categories}
      />

      {/* Mandatory / Optional Password Change Modal */}
      <ChangePasswordModal
        open={passwordModalOpen || !!user?.mustChangePassword}
        onOpenChange={setPasswordModalOpen}
        mandatory={!!user?.mustChangePassword}
      />
    </div>
  );
}
