import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense, HouseholdMember } from '@/types';
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
  Users,
  Plus,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  Tag,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function CommonExpensesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [paidBy, setPaidBy] = useState(user?.id || '');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
  });

  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Initialize paidBy when user or members load
  React.useEffect(() => {
    if (!paidBy && user?.id) setPaidBy(user.id);
  }, [user, members]);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['common_expenses'],
    queryFn: () => api<Expense[]>('GET', '/expenses?type=common'),
  });

  const totalPaise = rupeesToPaise(amountRupees);

  // Calculate equal split shares
  const calculateShares = () => {
    if (splitMethod === 'equal') {
      const activeCount = members.length || 1;
      const baseShare = Math.floor(totalPaise / activeCount);
      let remainder = totalPaise % activeCount;

      return members.map((m) => {
        const share = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        return {
          user_id: m.id,
          amount_paise: share,
        };
      });
    } else {
      // Custom shares
      return members.map((m) => ({
        user_id: m.id,
        amount_paise: rupeesToPaise(customShares[m.id] || '0'),
      }));
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error('Description is required.');
      if (totalPaise <= 0) throw new Error('Please enter a valid amount.');
      if (!paidBy) throw new Error('Please select who paid for the expense.');

      const shares = calculateShares();
      const shareSum = shares.reduce((sum, s) => sum + s.amount_paise, 0);

      if (shareSum !== totalPaise) {
        throw new Error(
          `Total of shares (${formatPaise(shareSum)}) does not match expense amount (${formatPaise(totalPaise)})`
        );
      }

      return api('POST', '/expenses/common', {
        description: description.trim(),
        amount_paise: totalPaise,
        category_id: 'Household Common',
        expense_date: expenseDate,
        paid_by: paidBy,
        split_method: splitMethod,
        notes: notes.trim() || undefined,
        shares,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['common_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      setModalOpen(false);
      setDescription('');
      setAmountRupees('');
      setNotes('');
      setCustomShares({});
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record common expense.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['common_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
    },
  });

  const totalCommon = expenses.reduce((sum, e) => sum + (e.amount_paise || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Common Expenses</h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono text-xs">
              {expenses.length} records
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Shared flat costs split among all flatmates (WiFi, cook, maid, utilities)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Total Common</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {formatPaise(totalCommon)}
            </div>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Common Expense
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ResponsiveTableSkeleton rows={5} mobileCards={3} />
      ) : expenses.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Users className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No common expenses yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Record shared bills like monthly Wi-Fi, electricity, or common groceries here.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              Add First Common Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((exp) => (
            <Card
              key={exp.id}
              className="border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-sm"
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-base">{exp.description}</h3>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                      {exp.split_method === 'equal' ? 'Equal Split' : 'Custom Split'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>
                      Paid by: <strong className="text-slate-200">{exp.paid_by_name}</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="font-mono text-slate-400">{exp.expense_date}</span>
                    {exp.notes && <span>&bull; {exp.notes}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {formatPaise(exp.amount_paise)}
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this common expense?')) {
                          deleteMutation.mutate(exp.id);
                        }
                      }}
                      title="Delete expense"
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Shares breakdown if available */}
              {exp.shares && exp.shares.length > 0 && (
                <div className="p-4 bg-slate-950/30">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2">
                    Participant Allocations
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {exp.shares.map((sh) => (
                      <div
                        key={sh.id}
                        className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 text-xs"
                      >
                        <div className="font-medium text-slate-300 truncate">{sh.full_name}</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          {formatPaise(sh.amount_paise)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Common Expense Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Add Common Shared Expense
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
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
                <label className="text-xs font-semibold text-slate-300">Total Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className="bg-slate-900 border-slate-700 font-mono text-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Paid By</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  aria-label="Select member who paid"
                  className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <Input
                type="text"
                required
                placeholder="e.g. Airtel Fiber Wi-Fi, Drinking Water Cans"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Date</label>
                <Input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Split Method</label>
                <div className="grid grid-cols-2 gap-1.5 h-10">
                  <button
                    type="button"
                    onClick={() => setSplitMethod('equal')}
                    className={`rounded-lg border text-xs font-medium transition-all ${
                      splitMethod === 'equal'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('custom')}
                    className={`rounded-lg border text-xs font-medium transition-all ${
                      splitMethod === 'custom'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Split breakdown preview */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Split Allocations ({members.length} members)
              </div>
              <div className="space-y-2">
                {members.map((m) => {
                  const equalSharePaise = members.length
                    ? Math.floor(totalPaise / members.length)
                    : 0;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800/60"
                    >
                      <span className="text-slate-200">{m.full_name}</span>
                      {splitMethod === 'equal' ? (
                        <span className="font-mono font-medium text-emerald-400">
                          {formatPaise(equalSharePaise)}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0"
                            value={customShares[m.id] || ''}
                            onChange={(e) =>
                              setCustomShares({ ...customShares, [m.id]: e.target.value })
                            }
                            className="w-24 h-7 text-xs font-mono bg-slate-900 border-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Notes (Optional)</label>
              <Input
                type="text"
                placeholder="Bill number or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-800 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record Common Expense'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
