import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BalanceSummary } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPaise } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Wallet,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Mic,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

import { DashboardSkeleton } from '@/components/ui/skeleton';

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
    refetch: refetchSummary,
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
    return <DashboardSkeleton />;
  }

  if (summaryError || !summary) {
    return (
      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-negative-soft text-negative">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Your summary could not load</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your expenses have not been changed. Try loading the household summary again.
            </p>
            <Button className="mt-4" onClick={() => void refetchSummary()}>
              Try again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const netBalance = summary.owedToMe - summary.owedByMe;
  const hasDebts = summary.myDebts?.some((debt) => debt.outstanding > 0) ?? false;
  const hasCredits = summary.pairwise?.some((credit) => credit.outstanding > 0) ?? false;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{user?.householdName || 'Household ledger'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user?.fullName?.split(' ')[0] || 'there'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is where things stand today.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
          <Button onClick={() => onNavigate('personal')} className="min-h-12 w-full sm:w-auto text-xs sm:text-sm">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add expense
          </Button>
          <Button variant="outline" onClick={() => onNavigate('repayments')} className="min-h-12 w-full sm:w-auto text-xs sm:text-sm">
            Settle up
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={onOpenVoice} className="hidden min-h-11 sm:inline-flex">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Voice input
          </Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        <CardContent className="p-3.5 min-[360px]:p-5 sm:p-6">
          <div className="flex flex-col gap-4 min-[360px]:gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs min-[360px]:text-sm font-medium text-muted-foreground">Your net position</p>
              <p className="mt-1.5 break-words font-mono text-2xl min-[360px]:text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {formatPaise(Math.abs(netBalance))}
              </p>
              <div className="mt-2.5 min-[360px]:mt-3 flex items-center gap-2">
                <span className={"flex h-7 w-7 min-[360px]:h-8 min-[360px]:w-8 items-center justify-center rounded-full shrink-0 " + (netBalance >= 0 ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative')}>
                  {netBalance >= 0
                    ? <ArrowDownLeft className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4" aria-hidden="true" />
                    : <ArrowUpRight className="h-3.5 w-3.5 min-[360px]:h-4 min-[360px]:w-4" aria-hidden="true" />}
                </span>
                <span className="text-xs min-[360px]:text-sm font-semibold truncate">
                  {netBalance > 0 ? 'You are owed overall' : netBalance < 0 ? 'You owe overall' : 'All settled up'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:w-64 sm:grid-cols-1">
              <div className="rounded-xl bg-negative-soft p-2.5 min-[360px]:p-3">
                <p className="text-xs font-medium text-muted-foreground">You owe</p>
                <p className="mt-1 break-words font-mono text-base min-[360px]:text-lg font-semibold text-negative tabular-nums">
                  {formatPaise(summary.owedByMe)}
                </p>
              </div>
              <div className="rounded-xl bg-positive-soft p-2.5 min-[360px]:p-3">
                <p className="text-xs font-medium text-muted-foreground">Owed to you</p>
                <p className="mt-1 break-words font-mono text-base min-[360px]:text-lg font-semibold text-positive tabular-nums">
                  {formatPaise(summary.owedToMe)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="spending-summary-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="spending-summary-heading" className="text-base font-semibold">Spending overview</h2>
          <span className="text-xs text-muted-foreground">Current totals</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
              <span className="flex h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Wallet className="h-4.5 w-4.5 min-[360px]:h-5 min-[360px]:w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs min-[360px]:text-sm text-muted-foreground truncate">Personal spending</p>
                <p className="mt-0.5 break-words font-mono text-base min-[360px]:text-lg font-semibold tabular-nums">{formatPaise(summary.personalSpending || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
              <span className="flex h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Users className="h-4.5 w-4.5 min-[360px]:h-5 min-[360px]:w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs min-[360px]:text-sm text-muted-foreground truncate">Common share</p>
                <p className="mt-0.5 break-words font-mono text-base min-[360px]:text-lg font-semibold tabular-nums">{formatPaise(summary.commonShare || 0)}</p>
                <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground truncate">Paid: {formatPaise(summary.commonPaid || 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
              <span className="flex h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <CreditCard className="h-4.5 w-4.5 min-[360px]:h-5 min-[360px]:w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs min-[360px]:text-sm text-muted-foreground truncate">Bought for others</p>
                <p className="mt-0.5 break-words font-mono text-base min-[360px]:text-lg font-semibold tabular-nums">{formatPaise(summary.advancedForOthers || 0)}</p>
                <button type="button" onClick={() => onNavigate('purchases_made')} className="mt-0.5 text-[11px] min-[360px]:text-xs font-semibold text-primary underline-offset-4 hover:underline">
                  View purchases
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6" aria-label="Outstanding balances">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2.5 min-[360px]:gap-3 border-b border-border p-3.5 sm:p-5">
            <div>
              <CardTitle className="text-sm min-[360px]:text-base">You owe</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Payments you need to make</p>
            </div>
            <Badge variant={hasDebts ? 'neg' : 'secondary'} className="shrink-0 text-xs">{formatPaise(summary.owedByMe)}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {!hasDebts ? (
              <div className="flex flex-col items-center px-4 py-7 text-center">
                <CheckCircle className="h-6 w-6 text-positive" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">Nothing to pay right now</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">You are up to date with your flatmates.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.myDebts.filter((debt) => debt.outstanding > 0).map((debt) => (
                  <div key={debt.creditorId} className="flex items-center justify-between gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs min-[360px]:text-sm font-semibold">{debt.creditorName}</p>
                      <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground truncate">
                        Paid back {formatPaise(debt.confirmedPaid)} of {formatPaise(debt.grossOwe)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 min-[360px]:gap-2">
                      <span className="font-mono text-xs min-[360px]:text-sm font-semibold text-negative tabular-nums">{formatPaise(debt.outstanding)}</span>
                      <Button size="sm" variant="outline" onClick={() => onNavigate('repayments')} className="h-8 px-2.5 text-xs min-[360px]:h-9 min-[360px]:px-3">Repay</Button>
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
              <p className="mt-0.5 text-xs text-muted-foreground">Money flatmates still owe you</p>
            </div>
            <Badge variant={hasCredits ? 'pos' : 'secondary'} className="shrink-0 text-xs">{formatPaise(summary.owedToMe)}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {!hasCredits ? (
              <div className="flex flex-col items-center px-4 py-7 text-center">
                <Clock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium">No outstanding repayments</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">There is nothing waiting to come back to you.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {summary.pairwise.filter((credit) => credit.outstanding > 0).map((credit) => (
                  <div key={credit.debtorId} className="flex items-center justify-between gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs min-[360px]:text-sm font-semibold">{credit.debtorName}</p>
                      <p className="mt-0.5 text-[11px] min-[360px]:text-xs text-muted-foreground truncate">
                        Confirmed {formatPaise(credit.confirmedPaid)} of {formatPaise(credit.grossOwed)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 min-[360px]:gap-2">
                      <span className="font-mono text-xs min-[360px]:text-sm font-semibold text-positive tabular-nums">{formatPaise(credit.outstanding)}</span>
                      <Button size="sm" variant="outline" onClick={() => onNavigate('repayments')} className="h-8 px-2.5 text-xs min-[360px]:h-9 min-[360px]:px-3">View</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2.5 min-[360px]:gap-3 border-b border-border p-3.5 sm:p-5">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm min-[360px]:text-base">
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Recent activity
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Recent changes in your household ledger</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isActivityLoading ? (
            <div className="space-y-3 p-4" aria-label="Loading recent activity" aria-busy="true">
              {[1, 2, 3].map((index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : activity.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium">No activity yet</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">New expenses and repayments will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2.5 min-[360px]:gap-3 p-3 min-[360px]:p-4">
                  <div className="flex h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs min-[360px]:text-sm font-semibold text-secondary-foreground">
                    {item.actor_name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs min-[360px]:text-sm leading-snug min-[360px]:leading-5">
                      <span className="font-semibold">{item.actor_name || 'A household member'}</span>{' '}
                      {item.action === 'create'
                        ? 'recorded a new'
                        : item.action === 'delete'
                          ? 'deleted a'
                          : item.action === 'confirm'
                            ? 'confirmed'
                            : item.action}{' '}
                      <span className="font-medium text-primary">{item.entity_type}</span>
                      {item.metadata?.amount_paise != null && (
                        <span className="ml-1 font-mono text-xs min-[360px]:text-sm font-medium tabular-nums">
                          ({formatPaise(item.metadata.amount_paise)})
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
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
