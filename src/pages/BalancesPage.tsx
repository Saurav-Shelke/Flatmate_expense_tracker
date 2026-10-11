import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTableSkeleton, StatsSkeletonGrid } from '@/components/ui/skeleton';
import { Scale, ArrowRight, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface BalancesPageProps {
  onNavigateToRepayments: (targetMemberId?: string) => void;
}

export function BalancesPage({ onNavigateToRepayments }: BalancesPageProps) {
  const { data: summary, isLoading } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-48 bg-slate-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-slate-800/60 rounded animate-pulse" />
        </div>
        <StatsSkeletonGrid />
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      </div>
    );
  }

  const netBalance = (summary?.owedToMe || 0) - (summary?.owedByMe || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Balances & Matrix</h1>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${
                netBalance >= 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'
              }`}
            >
              Net: {netBalance >= 0 ? '+' : ''}
              {formatPaise(netBalance)}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Exact pairwise financial ledger computed with integer paise precision
          </p>
        </div>
        <Button
          onClick={() => onNavigateToRepayments()}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 text-xs sm:text-sm self-start sm:self-auto"
        >
          Initiate Repayment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-400">Total Owed To You</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatPaise(summary?.owedToMe || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">From all roommates</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-400">Total You Owe</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-red-400">
              {formatPaise(summary?.owedByMe || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">To all roommates</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-400">Common Share</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-purple-300">
              {formatPaise(summary?.commonShare || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Paid: {formatPaise(summary?.commonPaid || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-slate-400">Personal Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold font-mono text-white">
              {formatPaise(summary?.personalSpending || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Non-shared spending</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Debts Matrix List ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Money I Owe (My Debts) */}
        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-red-400" />
              <CardTitle className="text-sm font-bold text-white">You Owe These Flatmates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!summary?.myDebts || summary.myDebts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/40 mb-2" />
                You do not owe any money!
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
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Gross: {formatPaise(d.grossOwe)} &bull; Confirmed Paid:{' '}
                        {formatPaise(d.confirmedPaid)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-red-400">
                        {formatPaise(d.outstanding)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => onNavigateToRepayments(d.creditorId)}
                        className="text-xs h-8 bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30"
                      >
                        Settle Up
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Money Owed to Me */}
        <Card className="border-slate-800/80 bg-slate-900/50">
          <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm font-bold text-white">These Flatmates Owe You</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!summary?.pairwise || summary.pairwise.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No roommates currently owe you money.
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
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Gross: {formatPaise(c.grossOwed)} &bull; Confirmed Paid:{' '}
                        {formatPaise(c.confirmedPaid)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        {formatPaise(c.outstanding)}
                      </span>
                      <div className="text-[10px] text-slate-500">pending repayment</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
