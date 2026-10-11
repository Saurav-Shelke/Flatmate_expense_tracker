import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsSkeletonGrid, ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import { formatPaise } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Mic,
  Clock,
  CheckCircle,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
}

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
  onOpenVoice: () => void;
}

export function DashboardPage({ onNavigate, onOpenVoice }: DashboardPageProps) {
  const { user } = useAuth();

  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
    staleTime: 60 * 1000,
  });

  const { data: activity = [], isLoading: isActivityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['recent_activity'],
    queryFn: () => api<ActivityItem[]>('GET', '/activity?limit=6'),
    staleTime: 60 * 1000,
  });

  if (isSummaryLoading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div>
          <div className="h-7 w-48 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
        </div>
        <StatsSkeletonGrid />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveTableSkeleton rows={4} mobileCards={2} />
          <ResponsiveTableSkeleton rows={4} mobileCards={2} />
        </div>
      </div>
    );
  }

  const netBalance = (summary?.owedToMe || 0) - (summary?.owedByMe || 0);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Household overview for{' '}
            <strong className="text-slate-200">{user?.householdName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onOpenVoice}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/20 text-xs sm:text-sm"
          >
            <Mic className="h-4 w-4 mr-2" />
            Voice Add
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('repayments')}
            className="border-slate-800 text-slate-200 hover:bg-slate-850 text-xs sm:text-sm"
          >
            Settle Up
          </Button>
        </div>
      </div>

      {/* Voice Assistant Promotion Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/60 via-cyan-950/40 to-slate-900/80 p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Gemini Voice Expense Assistant
                <Badge className="bg-cyan-500/20 text-cyan-300 border-none text-[10px] py-0">
                  New
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Press <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-cyan-400">Ctrl+M</kbd> or tap the mic to speak expenses naturally.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onOpenVoice}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs shrink-0 self-start sm:self-auto"
          >
            Try Voice Input
          </Button>
        </div>
      </div>

      {/* ── Responsive Stats Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Personal Spending */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-slate-400">Personal Spending</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatPaise(summary?.personalSpending || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">This billing cycle</div>
          </CardContent>
        </Card>

        {/* Common Share */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-slate-400">Common Share</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">
              {formatPaise(summary?.commonShare || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Paid: {formatPaise(summary?.commonPaid || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Advanced for Others */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-slate-400">Bought for Others</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
              {formatPaise(summary?.advancedForOthers || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">On-behalf purchases</div>
          </CardContent>
        </Card>

        {/* Net Outstanding Balance */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-slate-400">Net Position</CardTitle>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                netBalance >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {netBalance >= 0 ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-xl sm:text-2xl font-bold font-mono ${
                netBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {netBalance >= 0 ? '+' : ''}
              {formatPaise(netBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {netBalance >= 0 ? 'You are owed in total' : 'You owe in total'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Debts & Credits Split ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money I Owe (My Debts) */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <CardTitle className="text-sm font-bold text-white">Money You Owe</CardTitle>
            </div>
            <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs font-mono">
              Total: {formatPaise(summary?.owedByMe || 0)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {(!summary?.myDebts || summary.myDebts.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                <CheckCircle className="h-8 w-8 text-emerald-500/40 mb-2" />
                You do not owe anyone money! All settled up.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {summary.myDebts.map((d) => (
                  <div
                    key={d.creditorId}
                    className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{d.creditorName}</div>
                      <div className="text-[11px] text-slate-400">
                        Gross: {formatPaise(d.grossOwe)} &bull; Settled: {formatPaise(d.confirmedPaid)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-red-400">
                        {formatPaise(d.outstanding)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('repayments')}
                        className="text-xs h-8 border-red-500/30 text-red-300 hover:bg-red-950/30"
                      >
                        Pay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Money Owed to Me (My Credits) */}
        <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
          <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <CardTitle className="text-sm font-bold text-white">Owed to You</CardTitle>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs font-mono">
              Total: {formatPaise(summary?.owedToMe || 0)}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {(!summary?.pairwise || summary.pairwise.length === 0) ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                <Clock className="h-8 w-8 text-slate-600 mb-2" />
                No pending debts owed to you currently.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {summary.pairwise.map((c) => (
                  <div
                    key={c.debtorId}
                    className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{c.debtorName}</div>
                      <div className="text-[11px] text-slate-400">
                        Gross: {formatPaise(c.grossOwed)} &bull; Settled: {formatPaise(c.confirmedPaid)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {formatPaise(c.outstanding)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('repayments')}
                        className="text-xs h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/30"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity / Audit Trail ───────────────────────────────────── */}
      <Card className="border-slate-800/80 bg-slate-900/50 backdrop-blur">
        <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Recent Activity & Audit Trail
          </CardTitle>
          <span className="text-[11px] text-slate-400">Live household ledger</span>
        </CardHeader>
        <CardContent className="p-0">
          {isActivityLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-800/50 rounded animate-pulse" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {activity.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-[10px]">
                      {item.actor_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <div className="text-slate-200">
                        <strong className="text-white">{item.actor_name}</strong>{' '}
                        {item.action === 'create'
                          ? 'recorded a new'
                          : item.action === 'delete'
                          ? 'deleted a'
                          : item.action === 'confirm'
                          ? 'confirmed'
                          : item.action}{' '}
                        <span className="text-cyan-400">{item.entity_type}</span>
                        {item.metadata?.amount_paise && (
                          <span className="font-mono font-medium text-emerald-400 ml-1.5">
                            ({formatPaise(item.metadata.amount_paise)})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
