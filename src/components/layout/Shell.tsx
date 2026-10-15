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
  X,
  CreditCard,
  MoreHorizontal,
  ChevronRight,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceAssistantModal } from '@/components/voice/VoiceAssistantModal';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { HouseholdMember, Category } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type NavTab =
  | 'dashboard'
  | 'expenses'
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

const mainNavItems = [
  { id: 'dashboard' as NavTab, label: 'Home', icon: LayoutDashboard },
  { id: 'expenses' as NavTab, label: 'Expenses', icon: Receipt },
  { id: 'balances' as NavTab, label: 'Balances', icon: Scale },
  { id: 'repayments' as NavTab, label: 'Repayments', icon: ArrowRightLeft },
];

const householdNavItems = [
  { id: 'common' as NavTab, label: 'Common expenses', icon: Users },
  { id: 'purchases_for_me' as NavTab, label: 'Bought for me', icon: Gift },
];

const accountNavItems = [
  { id: 'profile' as NavTab, label: 'Profile & UPI', icon: UserCircle },
];

const pageTitles: Record<NavTab, string> = {
  dashboard: 'Home',
  expenses: 'Expenses',
  personal: 'Expenses',
  purchases_made: 'Bought for others',
  purchases_for_me: 'Bought for me',
  common: 'Common expenses',
  balances: 'Balances',
  repayments: 'Repayments',
  profile: 'Profile & UPI',
};

export function Shell({ activeTab, onTabChange, children }: ShellProps) {
  const { user, logout } = useAuth();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setVoiceModalOpen((open) => !open);
      }
      if (event.key === 'Escape') setMobileMoreOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [activeTab]);

  const isExpensesActive =
    activeTab === 'expenses' || activeTab === 'personal' || activeTab === 'purchases_made';
  const isMoreContext =
    activeTab === 'purchases_for_me' || activeTab === 'common' || activeTab === 'profile';

  const goTo = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight">Flat Expenses</div>
              <div className="truncate text-xs text-muted-foreground">{user?.householdName || 'Household'}</div>
            </div>
          </div>
          {user?.role === 'admin' && <Badge variant="outline" className="shrink-0 text-xs font-mono">Admin</Badge>}
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <Mic className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">Voice assistant</span>
              <span className="block text-[11px] text-muted-foreground">Dictate expense (Ctrl+M)</span>
            </span>
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {/* Main group */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Overview
            </div>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === 'expenses' ? isExpensesActive : activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Household group */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Household
            </div>
            {householdNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Account group */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </div>
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => goTo(item.id)}
                  className={
                    'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium transition-colors ' +
                    (isActive
                      ? 'bg-brand-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground')
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xs font-semibold text-primary">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{user?.fullName}</div>
              <div className="truncate text-[11px] text-muted-foreground">@{user?.username}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-negative"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-13 min-[360px]:min-h-14 items-center justify-between border-b border-border bg-background/95 px-3 min-[360px]:px-4 py-2.5 min-[360px]:py-3 backdrop-blur md:hidden">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight">{pageTitles[activeTab]}</h1>
            <p className="truncate text-xs text-muted-foreground">{user?.householdName || 'Household ledger'}</p>
          </div>
          {activeTab === 'dashboard' && (
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              aria-label="Add expense by voice"
              className="flex h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </header>

        <main className="min-w-0 flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-6">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 min-[360px]:px-4 min-[360px]:py-5 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* 5-Item Mobile Bottom Navigation (Section 8.1) */}
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 px-0.5 pt-1 backdrop-blur md:hidden"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      >
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'expenses'
              ? isExpensesActive
              : activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => goTo(item.id)}
              className={
                'flex min-h-[52px] min-[360px]:min-h-14 flex-col items-center justify-center gap-0.5 min-[360px]:gap-1 rounded-lg px-0.5 text-[10px] min-[360px]:text-[11px] font-medium leading-tight tracking-tight transition-colors ' +
                (isActive ? 'text-primary font-bold' : 'text-muted-foreground')
              }
            >
              <Icon className="h-4.5 w-4.5 min-[360px]:h-5 min-[360px]:w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate text-center leading-tight">{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setMobileMoreOpen((open) => !open)}
          className={
            'flex min-h-[52px] min-[360px]:min-h-14 flex-col items-center justify-center gap-0.5 min-[360px]:gap-1 rounded-lg px-0.5 text-[10px] min-[360px]:text-[11px] font-medium leading-tight tracking-tight transition-colors ' +
            (mobileMoreOpen || isMoreContext ? 'text-primary font-bold' : 'text-muted-foreground')
          }
        >
          <MoreHorizontal className="h-4.5 w-4.5 min-[360px]:h-5 min-[360px]:w-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full truncate text-center leading-tight">More</span>
        </button>
      </nav>

      {/* Mobile More Sheet (Section 8.3) */}
      {mobileMoreOpen && (
        <>
          <button
            type="button"
            aria-label="Close More menu"
            onClick={() => setMobileMoreOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
          />
          <section
            id="mobile-more-menu"
            aria-label="More destinations"
            className="fixed inset-x-2 min-[360px]:inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 max-h-[75vh] overflow-y-auto rounded-xl sm:rounded-2xl border border-border bg-card p-3 min-[360px]:p-4 shadow-xl md:hidden space-y-3.5 min-[360px]:space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-base font-semibold">More</h2>
                <p className="text-xs text-muted-foreground">Household tools and account settings</p>
              </div>
              <button
                type="button"
                aria-label="Close More menu"
                onClick={() => setMobileMoreOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Household section */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Household
              </div>
              {householdNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.id)}
                    className={
                      'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ' +
                      (isActive ? 'bg-brand-soft text-primary font-semibold' : 'hover:bg-muted text-foreground')
                    }
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-foreground">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-xs font-medium">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            {/* Account section */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Account
              </div>
              {accountNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(item.id)}
                    className={
                      'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ' +
                      (isActive ? 'bg-brand-soft text-primary font-semibold' : 'hover:bg-muted text-foreground')
                    }
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-foreground">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-xs font-medium">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            {/* Session section */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Session
              </div>
              <div className="flex items-center gap-3 px-3 py-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-primary">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{user?.fullName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{user?.username}</p>
                </div>
                {user?.role === 'admin' && <Badge variant="outline" className="text-[10px] font-mono">Admin</Badge>}
              </div>
              <Button
                variant="outline"
                className="w-full justify-center border-border text-negative hover:bg-negative-soft"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          </section>
        </>
      )}

      <VoiceAssistantModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        members={members}
        categories={categories}
      />

      <ChangePasswordModal
        open={passwordModalOpen || !!user?.mustChangePassword}
        onOpenChange={setPasswordModalOpen}
        mandatory={!!user?.mustChangePassword}
      />
    </div>
  );
}
