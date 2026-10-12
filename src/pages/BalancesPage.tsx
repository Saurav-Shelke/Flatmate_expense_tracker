import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, ArrowRight, ArrowUpRight, ArrowDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';

import { BalancesSkeleton } from '@/components/ui/skeleton';

interface BalancesPageProps {
  onNavigateToRepayments: (targetMemberId?: string) => void;
}

export function BalancesPage({ onNavigateToRepayments }: BalancesPageProps) {
  const { data: summary, isLoading, error, refetch } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
  });

  if (isLoading) {
    return <BalancesSkeleton />;
  }

  if (error || !summary) {
    return (
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="font-semibold">Balances could not load</h2>
            <p className="mt-1 text-sm text-muted-foreground">Try again to refresh your household totals.</p>
            <Button className="mt-4" onClick={() => void refetch()}>Try again</Button>
          </div>
        </div>
      </Card>
    );
  }

  const netBalance = summary.owedToMe - summary.owedByMe;
  const debts = summary.myDebts?.filter((item) => item.outstanding > 0) ?? [];
  const credits = summary.pairwise?.filter((item) => item.outstanding > 0) ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Balances</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">See who you need to pay and who still owes you.</p>
        </div>
        <Button onClick={() => onNavigateToRepayments()} className="min-h-12 w-full sm:w-auto">
          Initiate repayment
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <Card>
        <CardContent className="p-3.5 min-[360px]:p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs min-[360px]:text-sm font-medium text-muted-foreground">Net position</p>
              <p className="mt-1.5 break-words font-mono text-2xl min-[360px]:text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {formatPaise(Math.abs(netBalance))}
              </p>
              <p className="mt-1.5 text-xs min-[360px]:text-sm font-medium">
                {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'Everything is settled'}
              </p>
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:w-72 sm:grid-cols-1">
              <div className="rounded-xl bg-negative-soft p-2.5 min-[360px]:p-3">
                <p className="text-xs font-medium text-muted-foreground">You owe</p>
                <p className="mt-1 break-words font-mono text-base min-[360px]:text-lg font-semibold text-negative tabular-nums">{formatPaise(summary.owedByMe)}</p>
              </div>
              <div className="rounded-xl bg-positive-soft p-2.5 min-[360px]:p-3">
                <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
                <p className="mt-1 break-words font-mono text-base min-[360px]:text-lg font-semibold text-positive tabular-nums">{formatPaise(summary.owedToMe)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="other-totals-heading" className="space-y-3">
        <h2 id="other-totals-heading" className="text-base font-semibold">Spending totals</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Card>
            <CardContent className="p-3 min-[360px]:p-4">
              <p className="text-xs min-[360px]:text-sm text-muted-foreground">Your common-expense share</p>
              <p className="mt-0.5 break-words font-mono text-lg min-[360px]:text-xl font-semibold tabular-nums">{formatPaise(summary.commonShare || 0)}</p>
              <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground">Paid so far: {formatPaise(summary.commonPaid || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 min-[360px]:p-4">
              <p className="text-xs min-[360px]:text-sm text-muted-foreground">Personal spending</p>
              <p className="mt-0.5 break-words font-mono text-lg min-[360px]:text-xl font-semibold tabular-nums">{formatPaise(summary.personalSpending || 0)}</p>
              <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground">Expenses not shared with the household</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6" aria-label="Outstanding balances by member">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2.5 min-[360px]:gap-3 border-b border-border p-3.5 sm:p-5">
            <div>
              <CardTitle className="text-sm min-[360px]:text-base">You owe</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Flatmates you need to pay</p>
            </div>
            <Badge variant={debts.length ? 'neg' : 'secondary'} className="shrink-0 text-xs">{formatPaise(summary.owedByMe)}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {debts.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-7 text-center">
                <CheckCircle2 className="h-6 w-6 text-positive" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">No outstanding payments</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">You do not owe any flatmates right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {debts.map((debt) => (
                  <div key={debt.creditorId} className="flex items-center justify-between gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs min-[360px]:text-sm font-semibold">{debt.creditorName}</p>
                      <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground truncate">
                        Repaid {formatPaise(debt.confirmedPaid)} of {formatPaise(debt.grossOwe)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 min-[360px]:gap-3">
                      <span className="font-mono text-xs min-[360px]:text-sm font-semibold text-negative tabular-nums">{formatPaise(debt.outstanding)}</span>
                      <Button size="sm" variant="outline" onClick={() => onNavigateToRepayments(debt.creditorId)} className="h-8 px-2.5 text-xs min-[360px]:h-9 min-[360px]:px-3">
                        Settle up
                        <ArrowRight className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4 ml-1" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2.5 min-[360px]:gap-3 border-b border-border p-3.5 sm:p-5">
            <div>
              <CardTitle className="text-sm min-[360px]:text-base">Owed to you</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Flatmates who still need to repay you</p>
            </div>
            <Badge variant={credits.length ? 'pos' : 'secondary'} className="shrink-0 text-xs">{formatPaise(summary.owedToMe)}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {credits.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-7 text-center">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">No pending repayments</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">No flatmates currently owe you money.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {credits.map((credit) => (
                  <div key={credit.debtorId} className="flex items-center justify-between gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs min-[360px]:text-sm font-semibold">{credit.debtorName}</p>
                      <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground truncate">
                        Confirmed {formatPaise(credit.confirmedPaid)} of {formatPaise(credit.grossOwed)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 min-[360px]:gap-3">
                      <span className="font-mono text-xs min-[360px]:text-sm font-semibold text-positive tabular-nums">{formatPaise(credit.outstanding)}</span>
                      <Button size="sm" variant="outline" onClick={() => onNavigateToRepayments(credit.debtorId)} className="h-8 px-2.5 text-xs min-[360px]:h-9 min-[360px]:px-3">
                        View claim
                        <ArrowRight className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4 ml-1" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
