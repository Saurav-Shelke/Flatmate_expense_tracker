import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OnBehalfPurchase, HouseholdMember } from '@/types';
import { formatPaise, rupeesToPaise, getLocalDateString } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResponsiveTableSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  ShoppingBag,
  User,
  Tag,
  Loader2,
  AlertCircle,
  X,
} from '@/components/ui/icons';

interface PurchaseItemInput {
  description: string;
  amountRupees: string;
  beneficiary_id: string;
  category: string;
}

interface PurchasesMadePageProps {
  hideTitle?: boolean;
}

export function PurchasesMadePage({ hideTitle = false }: PurchasesMadePageProps = {}) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
  });

  const [items, setItems] = useState<PurchaseItemInput[]>([
    { description: '', amountRupees: '', beneficiary_id: '', category: 'Groceries' },
  ]);

  // Set default beneficiary when members load
  React.useEffect(() => {
    if (members.length > 0 && !items[0].beneficiary_id) {
      setItems((prev) =>
        prev.map((it) => (it.beneficiary_id ? it : { ...it, beneficiary_id: members[0].id }))
      );
    }
  }, [members]);

  const { data: purchases = [], isLoading } = useQuery<OnBehalfPurchase[]>({
    queryKey: ['purchases_made'],
    queryFn: () => api<OnBehalfPurchase[]>('GET', '/purchases/made'),
  });

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        amountRupees: '',
        beneficiary_id: members[0]?.id || '',
        category: 'Groceries',
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PurchaseItemInput, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const totalPaiseCalc = items.reduce(
    (sum, it) => sum + rupeesToPaise(it.amountRupees),
    0
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Purchase title is required.');
      if (items.length === 0) throw new Error('At least one item is required.');

      const parsedItems = items.map((it) => {
        const p = rupeesToPaise(it.amountRupees);
        if (p <= 0) throw new Error(`Invalid amount for item "${it.description || 'unnamed'}"`);
        if (!it.description.trim()) throw new Error('Item description cannot be empty');
        if (!it.beneficiary_id) throw new Error('Select a flatmate for each item');

        return {
          description: it.description.trim(),
          amount_paise: p,
          beneficiary_id: it.beneficiary_id,
          category: it.category || 'General',
        };
      });

      return api('POST', '/purchases', {
        description: description.trim(),
        expense_date: expenseDate,
        notes: notes.trim() || undefined,
        items: parsedItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases_made'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      setModalOpen(false);
      setDescription('');
      setNotes('');
      setItems([
        {
          description: '',
          amountRupees: '',
          beneficiary_id: members[0]?.id || '',
          category: 'Groceries',
        },
      ]);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save purchase.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api('DELETE', `/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases_made'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
    },
  });

  const totalAdvanced = purchases.reduce((sum, p) => sum + (p.amount_paise || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">
                Bought for others
              </h1>
              <Badge variant="outline" className="font-mono text-xs">
                {purchases.length} purchases
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Items you purchased on behalf of individual flatmates
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs uppercase font-semibold text-muted-foreground">Total advanced</div>
              <div className="text-lg font-bold font-mono text-foreground">
                {formatPaise(totalAdvanced)}
              </div>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className="min-h-11 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              New purchase
            </Button>
          </div>
        </div>
      )}

      {hideTitle && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total advanced: <strong className="font-mono text-sm text-foreground">{formatPaise(totalAdvanced)}</strong>
            </span>
            <Badge variant="outline" className="text-xs">
              {purchases.length} purchases
            </Badge>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="min-h-10 text-xs sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            New purchase
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-12 text-center flex flex-col items-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold">No purchases made for others yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
              When you buy groceries, snacks, or medicine specifically for a flatmate, record it here.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="min-h-11"
            >
              Record First Purchase
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const isSettled =
              purchase.confirmed_paid_paise >= purchase.amount_paise &&
              purchase.amount_paise > 0;

            return (
              <Card
                key={purchase.id}
                className="overflow-hidden"
              >
                <div className="p-3.5 min-[360px]:p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm min-[360px]:text-base">
                        {purchase.description}
                      </h3>
                      {isSettled ? (
                        <Badge variant="pos" className="text-[10px]">
                          Fully Settled
                        </Badge>
                      ) : (
                        <Badge variant="warn" className="text-[10px]">
                          Pending Repayment
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Date: <span className="font-mono text-foreground">{purchase.expense_date}</span>
                      {purchase.notes && <span> &bull; {purchase.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 min-[360px]:gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-base min-[360px]:text-lg font-bold font-mono text-foreground">
                        {formatPaise(purchase.amount_paise)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Received: {formatPaise(purchase.confirmed_paid_paise || 0)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this purchase and its item shares?')) {
                          deleteMutation.mutate(purchase.id);
                        }
                      }}
                      title="Delete purchase"
                      className="min-h-10 min-w-10 inline-flex items-center justify-center text-muted-foreground hover:text-negative transition-colors rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Itemized Line Items */}
                <div className="p-3 min-[360px]:p-4 bg-muted/30">
                  <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">
                    Itemized Breakdown
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {purchase.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 min-[360px]:p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {item.description}
                          </div>
                          <div className="text-[11px] text-primary flex items-center gap-1 mt-0.5 truncate">
                            <User className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.beneficiary_name}</span>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-foreground shrink-0">
                          {formatPaise(item.amount_paise)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add On-Behalf Purchase Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden="true" />
              New Purchase for Flatmates
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div role="alert" className="rounded-lg border border-negative/30 bg-negative-soft p-3 text-xs text-negative flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-negative shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="space-y-4 pt-1"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="pm-title" className="block text-xs font-semibold text-foreground">Purchase Title</label>
                <Input
                  id="pm-title"
                  type="text"
                  required
                  placeholder="e.g. Zepto groceries, Swiggy dinner"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="pm-date" className="block text-xs font-semibold text-foreground">Date</label>
                <Input
                  id="pm-date"
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {/* Line items header */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Items & Beneficiary Flatmates
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="text-xs h-7 text-primary"
                >
                  <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 min-[360px]:p-3 rounded-xl border border-border bg-card flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-2.5 items-stretch sm:items-center"
                  >
                    <div className="flex items-center gap-2 sm:contents">
                      <div className="flex-1 sm:col-span-5">
                        <Input
                          type="text"
                          required
                          placeholder="Item name (e.g. Bread, Milk)"
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="bg-background border-border text-xs min-h-10 sm:min-h-9"
                        />
                      </div>
                      <div className="sm:hidden">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length <= 1}
                          title="Remove item"
                          className="text-muted-foreground hover:text-negative disabled:opacity-20 p-2 min-h-10 min-w-10 flex items-center justify-center rounded-lg"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:contents">
                      <div className="sm:col-span-3">
                        <select
                          value={item.beneficiary_id}
                          onChange={(e) => updateItem(idx, 'beneficiary_id', e.target.value)}
                          aria-label="Select beneficiary flatmate"
                          className="w-full min-h-10 sm:min-h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="₹ Amount"
                          value={item.amountRupees}
                          onChange={(e) => updateItem(idx, 'amountRupees', e.target.value)}
                          className="bg-background border-border font-mono text-xs min-h-10 sm:min-h-9"
                        />
                      </div>
                    </div>

                    <div className="hidden sm:flex sm:col-span-1 justify-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        title="Remove item"
                        className="text-muted-foreground hover:text-negative disabled:opacity-20 p-1"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Running total */}
              <div className="flex justify-end pt-2 text-xs text-muted-foreground">
                Total:{' '}
                <strong className="font-mono text-foreground ml-1.5 text-sm">
                  {formatPaise(totalPaiseCalc)}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pm-notes" className="block text-xs font-semibold text-foreground">Notes (Optional)</label>
              <Input
                id="pm-notes"
                type="text"
                placeholder="Any special remarks or receipt reference..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border text-xs min-h-10"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto min-h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="w-full sm:w-auto min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Recording...
                  </>
                ) : (
                  'Save purchase'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
