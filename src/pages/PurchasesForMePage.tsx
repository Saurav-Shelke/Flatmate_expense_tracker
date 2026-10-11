import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OnBehalfForMePurchase } from '@/types';
import { formatPaise } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import { Gift, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface PurchasesForMePageProps {
  onNavigateToRepayments: () => void;
}

export function PurchasesForMePage({ onNavigateToRepayments }: PurchasesForMePageProps) {
  const { data: purchases = [], isLoading } = useQuery<OnBehalfForMePurchase[]>({
    queryKey: ['purchases_for_me'],
    queryFn: () => api<OnBehalfForMePurchase[]>('GET', '/purchases/for-me'),
  });

  const totalOwed = purchases.reduce(
    (sum, p) => sum + Math.max(0, p.my_total_paise - (p.my_confirmed_paise || 0)),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Bought For Me</h1>
            <Badge variant="outline" className="border-purple-500/30 text-purple-400 font-mono text-xs">
              {purchases.length} items
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Items your roommates paid for on your behalf
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Total Outstanding</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {formatPaise(totalOwed)}
            </div>
          </div>
          <Button
            onClick={onNavigateToRepayments}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 text-xs sm:text-sm"
          >
            Settle via UPI
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : purchases.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Gift className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No purchases bought for you</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              When flatmates order items or groceries for you, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const outstanding = Math.max(
              0,
              purchase.my_total_paise - (purchase.my_confirmed_paise || 0)
            );
            const isSettled = outstanding === 0;

            return (
              <Card
                key={purchase.id}
                className="border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-sm"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-base">
                        {purchase.description}
                      </h3>
                      {isSettled ? (
                        <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Settled
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-950/60 text-amber-400 border-amber-500/30 text-[10px]">
                          Due: {formatPaise(outstanding)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="h-3 w-3 text-cyan-400" />
                        Paid by: <strong>{purchase.paid_by_name}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-slate-400">{purchase.expense_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold text-slate-300">
                        My Share: {formatPaise(purchase.my_total_paise)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Paid: {formatPaise(purchase.my_confirmed_paise || 0)}
                      </div>
                    </div>

                    {!isSettled && (
                      <Button
                        size="sm"
                        onClick={onNavigateToRepayments}
                        className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs h-8"
                      >
                        Repay
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* My items breakdown */}
                <div className="p-4 bg-slate-950/30">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                    My Items in this Purchase
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {purchase.my_items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-200 truncate mr-2">
                          {item.description}
                        </span>
                        <span className="font-mono font-bold text-white shrink-0">
                          {formatPaise(item.my_share)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
