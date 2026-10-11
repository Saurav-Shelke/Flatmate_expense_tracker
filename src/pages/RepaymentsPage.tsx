import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settlement, BalanceSummary, HouseholdMember } from '@/types';
import { formatPaise, rupeesToPaise } from '@/lib/utils';
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
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRightLeft,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';

interface RepaymentsPageProps {
  initialRecipientId?: string;
}

export function RepaymentsPage({ initialRecipientId }: RepaymentsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [recipientId, setRecipientId] = useState(initialRecipientId || '');
  const [amountRupees, setAmountRupees] = useState('');
  const [method, setMethod] = useState<'upi' | 'cash'>('upi');
  const [txRef, setTxRef] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: settlements = [], isLoading: isSettlementsLoading } = useQuery<
    Settlement[]
  >({
    queryKey: ['settlements'],
    queryFn: () => api<Settlement[]>('GET', '/settlements'),
  });

  const { data: members = [] } = useQuery<HouseholdMember[]>({
    queryKey: ['members'],
    queryFn: () => api<HouseholdMember[]>('GET', '/members'),
  });

  const { data: summary } = useQuery<BalanceSummary>({
    queryKey: ['balances_summary'],
    queryFn: () => api<BalanceSummary>('GET', '/balances/summary'),
  });

  // Filter members excluding self
  const otherMembers = members.filter((m) => m.id !== user?.id);

  // Pre-select recipient if passed or default to first other member
  React.useEffect(() => {
    if (initialRecipientId) {
      setRecipientId(initialRecipientId);
      // Auto prefill debt amount if available
      const foundDebt = summary?.myDebts?.find(
        (d) => d.creditorId === initialRecipientId
      );
      if (foundDebt && foundDebt.outstanding > 0) {
        setAmountRupees((foundDebt.outstanding / 100).toFixed(2));
      }
      setModalOpen(true);
    } else if (!recipientId && otherMembers.length > 0) {
      setRecipientId(otherMembers[0].id);
    }
  }, [initialRecipientId, members, summary]);

  // UPI QR Query for selected recipient & amount
  const selectedPaise = rupeesToPaise(amountRupees);
  const { data: upiQrData, isFetching: isQrLoading } = useQuery<{
    qrDataUrl?: string;
    upiUri?: string;
    upiId?: string;
    displayName?: string;
  }>({
    queryKey: ['recipient_qr', recipientId, selectedPaise],
    queryFn: async () => {
      if (!recipientId || method !== 'upi') return {};
      return api('GET', `/profile/qr?userId=${recipientId}&amount=${selectedPaise || 0}`);
    },
    enabled: !!recipientId && method === 'upi' && modalOpen,
    retry: false,
  });

  // Submit Claim Mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!recipientId) throw new Error('Please select a recipient.');
      if (selectedPaise <= 0) throw new Error('Please enter a valid repayment amount.');

      return api('POST', '/settlements', {
        recipient_id: recipientId,
        amount_paise: selectedPaise,
        method,
        transaction_reference: txRef.trim() || undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
      setModalOpen(false);
      setAmountRupees('');
      setTxRef('');
      setNote('');
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to submit payment claim.');
    },
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: (id: string) => api('POST', `/settlements/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: (id: string) => api('POST', `/settlements/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['balances_summary'] });
    },
  });

  // Segregate incoming vs outgoing settlements
  const incomingPending = settlements.filter(
    (s) => s.recipient_id === user?.id && s.status === 'verification_pending'
  );
  const otherSettlements = settlements.filter(
    (s) => !(s.recipient_id === user?.id && s.status === 'verification_pending')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Repayments & UPI</h1>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono text-xs">
              {settlements.length} total
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pay roommates via UPI QR code and verify incoming repayments
          </p>
        </div>
        <Button
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 text-xs sm:text-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Settle / Pay Flatmate
        </Button>
      </div>

      {/* ── Pending Verification Callout Banner (Action Required) ──────────── */}
      {incomingPending.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-5 space-y-3 shadow-lg animate-in fade-in-50">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <Clock className="h-4 w-4 animate-spin text-amber-400" />
            Action Required: {incomingPending.length} Incoming Payment Claim(s) to Verify
          </div>
          <div className="space-y-2.5">
            {incomingPending.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-white">
                    <strong className="text-amber-300">{s.payer_name}</strong> claims they paid you{' '}
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatPaise(s.amount_paise)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Method: <span className="uppercase text-slate-300 font-medium">{s.method}</span>
                    {s.transaction_reference && (
                      <span> &bull; UTR / Ref: {s.transaction_reference}</span>
                    )}
                    {s.note && <span> &bull; Note: {s.note}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(s.id)}
                    disabled={rejectMutation.isPending}
                    className="border-red-500/30 text-red-300 hover:bg-red-950/40 text-xs h-8"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(s.id)}
                    disabled={confirmMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Confirm Received
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Settlement History ──────────────────────────────────────────────── */}
      <Card className="border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-sm">
        <CardHeader className="p-5 pb-3 border-b border-slate-800/60">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-slate-400" />
            Settlement Claims History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isSettlementsLoading ? (
            <ResponsiveTableSkeleton rows={5} mobileCards={3} />
          ) : settlements.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No settlements recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {settlements.map((s) => {
                const isPayer = s.payer_id === user?.id;

                return (
                  <div
                    key={s.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/20 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200">
                        {isPayer ? (
                          <>
                            You paid <strong className="text-white">{s.recipient_name}</strong>
                          </>
                        ) : (
                          <>
                            <strong className="text-white">{s.payer_name}</strong> paid you
                          </>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-400">
                          {new Date(s.claimed_at || s.created_at).toLocaleDateString()}
                        </span>
                        <span> &bull; </span>
                        <span className="uppercase text-slate-300">{s.method}</span>
                        {s.transaction_reference && (
                          <span> &bull; Ref: {s.transaction_reference}</span>
                        )}
                        {s.note && <span> &bull; {s.note}</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="font-mono font-bold text-sm text-white">
                        {formatPaise(s.amount_paise)}
                      </div>
                      <div>
                        {s.status === 'confirmed' && (
                          <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-500/30 text-[10px]">
                            Confirmed
                          </Badge>
                        )}
                        {s.status === 'verification_pending' && (
                          <Badge className="bg-amber-950/60 text-amber-400 border-amber-500/30 text-[10px]">
                            Pending Verification
                          </Badge>
                        )}
                        {s.status === 'rejected' && (
                          <Badge className="bg-red-950/60 text-red-400 border-red-500/30 text-[10px]">
                            Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Settle Up / Pay Modal ───────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-cyan-400" />
              Settle / Pay Roommate
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
              claimMutation.mutate();
            }}
            className="space-y-4 pt-1"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Recipient Roommate</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                aria-label="Select roommate to pay"
                className="w-full h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {otherMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Amount to Pay (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="bg-slate-900 border-slate-700 font-mono text-base"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 h-10">
                <button
                  type="button"
                  onClick={() => setMethod('upi')}
                  className={`rounded-lg border text-xs font-medium transition-all ${
                    method === 'upi'
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  UPI (QR Code)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`rounded-lg border text-xs font-medium transition-all ${
                    method === 'cash'
                      ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Cash / Direct
                </button>
              </div>
            </div>

            {/* UPI QR Code Container if UPI selected */}
            {method === 'upi' && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col items-center justify-center space-y-3">
                {isQrLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <span className="text-xs text-slate-400">Loading UPI profile...</span>
                  </div>
                ) : upiQrData?.qrDataUrl ? (
                  <>
                    <div className="bg-white p-2.5 rounded-xl shadow-lg border border-slate-700">
                      <img
                        src={upiQrData.qrDataUrl}
                        alt="UPI QR Code"
                        className="w-40 h-40 object-contain rounded-lg"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-semibold text-cyan-400">
                        {upiQrData.upiId}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {upiQrData.displayName}
                      </div>
                    </div>
                    {upiQrData.upiUri && (
                      <a
                        href={upiQrData.upiUri}
                        className="inline-flex items-center text-xs font-medium text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Open in UPI App (GPay / PhonePe)
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    <AlertCircle className="h-6 w-6 text-amber-400 mx-auto mb-1.5" />
                    This roommate has not added a UPI ID yet.
                    <div className="text-[11px] text-slate-500 mt-1">
                      You can pay via cash or ask them to add their UPI ID in their Profile.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                UTR / Transaction Ref (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. 331458921829"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                className="bg-slate-900 border-slate-700 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Note (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. WiFi share, dinner settlement"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
                disabled={claimMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                {claimMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
