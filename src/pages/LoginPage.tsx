import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Home className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-white">
              Flatmate Expenses
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Sign in to manage your shared expenses & voice tracker
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-200 flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  Username
                </label>
                <Input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. virendra, saurav"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-slate-950/70 border-slate-700/80 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-slate-950/70 border-slate-700/80 text-white placeholder:text-slate-600 pr-10 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-blue-600/25 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center text-[11px] text-slate-500 space-x-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Protected with Argon2/Bcrypt & CIA Triad Integrity</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
