import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, CheckCircle2, Lock, Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mandatory?: boolean;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  mandatory = false,
}: ChangePasswordModalProps) {
  const { setPasswordChanged } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      await api('POST', '/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setSuccess(true);
      setPasswordChanged();
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!mandatory) onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {mandatory ? 'Initial Password Setup Required' : 'Change Password'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {mandatory
                  ? 'For security compliance, you must set a permanent password before continuing.'
                  : 'Update your account password with a secure new passphrase.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200 flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center space-x-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Current / Temporary Password
            </label>
            <Input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">New Password</label>
            <Input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Confirm New Password</label>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              className="bg-slate-900 border-slate-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            {!mandatory && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 text-slate-300 hover:bg-slate-900"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Password'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
