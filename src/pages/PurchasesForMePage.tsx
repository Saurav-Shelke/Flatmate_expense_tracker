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
            <h1 className="text-2xl font-bold tracking-tight">Bought for me</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {purchases.length} items
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Items your flatmates paid for on your behalf
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs uppercase font-semibold text-muted-foreground">Total outstanding</div>
            <div className="text-lg font-bold font-mono text-negative">
              {formatPaise(totalOwed)}
            </div>
          </div>
          {totalOwed > 0 && (
            <Button
              onClick={onNavigateToRepayments}
              className="min-h-11 text-xs sm:text-sm"
            >
              Settle up
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-12 text-center flex flex-col items-center">
            <Gift className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold">No purchases bought for you</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
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
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base text-foreground">
                        {purchase.description}
                      </h3>
                      {isSettled ? (
                        <Badge variant="pos" className="text-[10px]">
                          Settled
                        </Badge>
                      ) : (
                        <Badge variant="neg" className="text-[10px]">
                          Due: {formatPaise(outstanding)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" aria-hidden="true" />
                        Paid by: <strong className="text-foreground">{purchase.paid_by_name}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono">{purchase.expense_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-semibold text-foreground">
                        My share: {formatPaise(purchase.my_total_paise)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Confirmed paid: {formatPaise(purchase.my_confirmed_paise || 0)}
                      </div>
                    </div>

                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onNavigateToRepayments}
                        className="text-sm min-h-11"
                      >
                        Repay
                        <ArrowRight className="h-3 w-3 ml-1" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* My items breakdown */}
                <div className="p-4 bg-muted/30">
                  <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                    My items in this purchase
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {purchase.my_items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground truncate mr-2">
                          {item.description}
                        </span>
                        <span className="font-mono font-bold text-foreground shrink-0">
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
