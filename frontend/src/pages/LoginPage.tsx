import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, Eye, EyeOff, Loader2, AlertCircle, Shield, CheckCircle2 } from '@/components/ui/icons';
import { getApiBase, setApiBase, testBackendConnection } from '@/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend connection state
  const [backendUrl, setBackendUrlInput] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedUrl, setConnectedUrl] = useState<string | null>(null);
  const [serverStatusMessage, setServerStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentBase = getApiBase();
    if (currentBase) {
      setBackendUrlInput(currentBase);
      setConnectedUrl(currentBase);
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // If deployed on Vercel without env var, show the server config panel automatically
      setShowServerConfig(true);
    }
  }, []);

  const handleConnectServer = async () => {
    const trimmed = backendUrl.trim().replace(/\/$/, '');
    if (!trimmed) {
      setApiBase('');
      setConnectedUrl(null);
      setServerStatusMessage('Backend URL reset to same-domain default.');
      return;
    }

    setConnecting(true);
    setServerStatusMessage(null);

    const ok = await testBackendConnection(trimmed);
    setConnecting(false);

    if (ok) {
      setApiBase(trimmed);
      setConnectedUrl(trimmed);
      setError(null);
      setServerStatusMessage('Successfully connected to backend server!');
    } else {
      setServerStatusMessage('Could not reach /api/health on that URL. Ensure the backend is deployed and live.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const msg = err.message || 'Invalid username or password';
      setError(msg);
      if (msg.includes('Backend URL') || msg.includes('404')) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-3 min-[360px]:p-4 bg-background text-foreground">
      <div className="w-full max-w-sm space-y-3">
        <Card className="border-border bg-card shadow-sm rounded-2xl">
          <CardHeader className="text-center pb-4 pt-6 min-[360px]:pb-5 min-[360px]:pt-7">
            <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Home className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Sign in to your household
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1.5">
              Access is limited to invited members
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 min-[360px]:px-6 pb-6">
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-negative/30 bg-negative-soft p-3 text-xs text-negative flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-foreground"
                >
                  Username
                </label>
                <Input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="e.g. virendra, saurav"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground pr-10 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-center text-[11px] text-muted-foreground gap-1.5">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Household data is private to active members</span>
            </div>
          </CardContent>
        </Card>

        {/* Backend Server Configuration Panel */}
        <div className="bg-card/70 border border-border/80 rounded-xl p-3 text-xs text-muted-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              {connectedUrl ? (
                <span className="flex items-center gap-1 text-positive">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Backend Connected
                </span>
              ) : (
                <span>Backend API Server</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-xs text-primary underline hover:text-primary/80"
            >
              {showServerConfig ? 'Hide' : 'Configure'}
            </button>
          </div>

          {showServerConfig && (
            <div className="mt-2.5 space-y-2 pt-2 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground leading-normal">
                If your backend is deployed as a separate Vercel project, paste its URL below (e.g.{' '}
                <code className="text-foreground font-mono">https://flatmate-backend.vercel.app</code>):
              </p>
              <div className="flex gap-1.5">
                <Input
                  type="url"
                  placeholder="https://your-backend.vercel.app"
                  value={backendUrl}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleConnectServer}
                  disabled={connecting}
                  className="h-8 px-3 shrink-0 text-xs"
                >
                  {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Connect'}
                </Button>
              </div>

              {serverStatusMessage && (
                <p
                  className={`text-[11px] ${
                    serverStatusMessage.includes('Success') ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {serverStatusMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
