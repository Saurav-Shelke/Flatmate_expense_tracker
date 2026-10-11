import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Expense, Category } from '@/types';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  Receipt,
  Calendar,
  Tag,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function PersonalExpensesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [categoryName, setCategoryName] = useState('Groceries');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['personal_expenses'],
    queryFn: () => api<Expense[]>('GET', '/expenses?type=personal'),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('GET', '/categories'),
  });

  // Add Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      const paise = rupeesToPaise(amountRupees);
      if (paise <= 0) throw new Error('Please enter a valid amount.');
      if (!description.trim()) throw new Error('Description is required.');

      return api('POST', '/expenses/personal', {
        description: description.trim(),
        amount_paise: paise,
        category_id: categoryName,
        expense_date: expenseDate,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      setModalOpen(false);
      setDescription('');
      setAmountRupees('');
      setNotes('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to add expense.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api('DELETE', `/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
    },
  });

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount_paise || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Personal Expenses</h1>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono text-xs">
              {expenses.length} records
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Expenses only for yourself that are not shared with room-mates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Total Spent</div>
            <div className="text-lg font-bold font-mono text-white">{formatPaise(totalSpent)}</div>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <ResponsiveTableSkeleton rows={6} mobileCards={3} />
      ) : expenses.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <Receipt className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No personal expenses yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Keep track of individual spending like snacks, subscriptions, or personal items.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="border-slate-700 text-slate-300"
            >
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">{exp.description}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{exp.expense_date}</span>
                      {exp.category_name && (
                        <>
                          <span>&bull;</span>
                          <span className="text-purple-400">{exp.category_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-white">
                      {formatPaise(exp.amount_paise)}
                    </div>
                  </div>
                </div>

                {exp.notes && (
                  <div className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded border border-slate-800/50">
                    {exp.notes}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this expense?')) {
                        deleteMutation.mutate(exp.id);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-xs font-mono text-slate-400">
                      {exp.expense_date}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-100">{exp.description}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{exp.notes}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[11px]">
                        {exp.category_name || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-white">
                      {formatPaise(exp.amount_paise)}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense?')) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        title="Delete expense"
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Add Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-400" />
              Add Personal Expense
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
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Amount (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="e.g. 250.00"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="bg-slate-900 border-slate-700 font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <Input
                type="text"
                required
                placeholder="e.g. Swiggy lunch, Coffee, Gym snacks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Category</label>
                <Input
                  type="text"
                  placeholder="e.g. Food, Transport"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="bg-slate-900 border-slate-700"
                />
              </div>
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
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Notes (Optional)</label>
              <Input
                type="text"
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-slate-900 border-slate-700"
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
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Record Expense'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
