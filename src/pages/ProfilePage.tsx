import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import {
  User,
  QrCode,
  ShieldCheck,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // UPI Form state
  const [upiId, setUpiId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [upiMsg, setUpiMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Query UPI Profile
  const { data: upiProfile, isLoading } = useQuery<{
    upi_id: string;
    display_name: string;
  } | null>({
    queryKey: ['my_upi_profile'],
    queryFn: () => api('GET', '/profile/upi'),
  });

  // Pre-fill on load
  React.useEffect(() => {
    if (upiProfile) {
      setUpiId(upiProfile.upi_id || '');
      setDisplayName(upiProfile.display_name || user?.fullName || '');
    } else if (user) {
      setDisplayName(user.fullName || '');
    }
  }, [upiProfile, user]);

  // Query Personal QR Code
  const { data: qrData } = useQuery<{ qrDataUrl?: string }>({
    queryKey: ['my_qr_code', upiProfile?.upi_id],
    queryFn: () => api('GET', `/profile/qr?userId=${user?.id}`),
    enabled: !!upiProfile?.upi_id && !!user?.id,
    retry: false,
  });

  // Save UPI Profile Mutation
  const saveUpiMutation = useMutation({
    mutationFn: () =>
      api('PUT', '/profile/upi', {
        upi_id: upiId.trim(),
        display_name: displayName.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_upi_profile'] });
      queryClient.invalidateQueries({ queryKey: ['my_qr_code'] });
      setUpiMsg({ text: 'UPI Profile updated successfully! Roommates can now scan to pay you.' });
      setTimeout(() => setUpiMsg(null), 4000);
    },
    onError: (err: any) => {
      setUpiMsg({ text: err.message || 'Failed to update UPI ID', error: true });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">My Profile & Security</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal UPI receiving details and account settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Security */}
        <div className="space-y-6 lg:col-span-1">
          {/* User Card */}
          <Card className="border-slate-800/80 bg-slate-900/60">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-lg font-bold text-white shadow-md shadow-blue-500/20">
                  {user?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    {user?.fullName}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    @{user?.username}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-2 space-y-3">
              <div className="text-xs flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Household:</span>
                <span className="font-semibold text-slate-200">{user?.householdName}</span>
              </div>
              <div className="text-xs flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Role:</span>
                <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 uppercase font-mono">
                  {user?.role}
                </Badge>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* CIA Triad & Audit Security Badge */}
          <Card className="border-slate-800/80 bg-slate-900/40">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Security & CIA Compliance</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-slate-400 text-[11px] leading-relaxed space-y-2">
              <div>
                <strong>Confidentiality:</strong> Encrypted sessions with httpOnly SameSite cookies.
              </div>
              <div>
                <strong>Integrity:</strong> Financial numbers strictly validated in integer paise with audit logging.
              </div>
              <div>
                <strong>Availability:</strong> Ultra-fast indexing on Neon PostgreSQL serverless.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: UPI Settings & QR Preview */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-slate-800/80 bg-slate-900/60">
            <CardHeader className="p-5 pb-3 border-b border-slate-800/60">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="h-4 w-4 text-cyan-400" />
                Receiving UPI Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                When flatmates settle debts with you, your personal UPI ID and dynamic QR code will appear
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {upiMsg && (
                <div
                  className={`rounded-xl border p-3.5 text-xs flex items-start space-x-2.5 ${
                    upiMsg.error
                      ? 'border-red-500/30 bg-red-950/40 text-red-200'
                      : 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200'
                  }`}
                >
                  {upiMsg.error ? (
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{upiMsg.text}</span>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveUpiMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. virendra@oksbi or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="bg-slate-950 border-slate-800 font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    Format: username@bank (Google Pay, PhonePe, Paytm, BHIM)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    UPI Display Name
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Virendra Phirke"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-sm"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    disabled={saveUpiMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs h-9 shadow-md shadow-cyan-600/20"
                  >
                    {saveUpiMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save UPI Profile'
                    )}
                  </Button>
                </div>
              </form>

              {/* QR Preview Card */}
              {qrData?.qrDataUrl && (
                <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-5 bg-slate-950/40 p-4 rounded-xl">
                  <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-700 shrink-0">
                    <img
                      src={qrData.qrDataUrl}
                      alt="My UPI QR Code"
                      className="w-32 h-32 object-contain rounded"
                    />
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 text-center sm:text-left">
                    <div className="font-semibold text-white text-sm">
                      Personal QR Code Preview
                    </div>
                    <div>
                      UPI ID: <strong className="font-mono text-cyan-400">{upiId}</strong>
                    </div>
                    <div>
                      Display Name: <strong className="text-slate-200">{displayName}</strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Whenever someone selects to repay you, their app will display this dynamic QR code with exact amount prefilled!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
    </div>
  );
}
