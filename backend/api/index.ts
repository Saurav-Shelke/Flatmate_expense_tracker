import type { IncomingMessage, ServerResponse } from 'http';
import app from '../app';

let isDbReady = false;
async function ensureDb() {
  if (isDbReady || !process.env.DATABASE_URL) return;
  try {
    const { default: sql } = await import('../db/index');
    // Fast check: if users table exists, schema is already prepared
    const check = await sql`SELECT to_regclass('public.users') AS reg`;
    if (check[0]?.reg) {
      isDbReady = true;
      return;
    }
    const { initDB } = await import('../db/init');
    await initDB();
    isDbReady = true;
  } catch (err: any) {
    console.warn('[Vercel DB Init Notice]:', err?.message);
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // 1. Direct Health / Diagnostics endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        status: 'ok',
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasSessionSecret: Boolean(process.env.SESSION_SECRET),
        nodeEnv: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 2. Clear configuration guidance if DATABASE_URL is missing
  if (!process.env.DATABASE_URL && req.url && req.url !== '/' && !req.url.startsWith('/health')) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'DATABASE_URL environment variable is missing on Vercel.',
        message: 'Please add DATABASE_URL and SESSION_SECRET in Vercel Project Settings > Environment Variables, then redeploy.',
      })
    );
  }

  // 3. Fast schema check (only runs once per container, completes in <30ms if schema exists)
  if (process.env.DATABASE_URL && !isDbReady) {
    await ensureDb();
  }

  // 4. Normalize req.url so Express routers (mounted under /api) always match,
  // regardless of whether Vercel preserves or rewrites the URL prefix.
  let url = req.url || '/';
  const forwardedUrl = req.headers['x-forwarded-url'] as string | undefined;
  if ((url === '/api' || url === '/api/' || url === '/') && forwardedUrl && forwardedUrl.startsWith('/api')) {
    url = forwardedUrl;
  }
  if (!url.startsWith('/api')) {
    url = '/api' + (url.startsWith('/') ? url : '/' + url);
  }
  req.url = url;

  // 5. Execute Express app and PROPERLY WAIT for the HTTP response to end
  return new Promise<void>((resolve, reject) => {
    res.on('finish', () => resolve());
    res.on('close', () => resolve());
    res.on('error', (err) => reject(err));

    try {
      app(req as any, res as any, (err: any) => {
        if (err) {
          if (!res.headersSent) {
            const status = typeof err.status === 'number' ? err.status : 500;
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
          resolve();
        } else {
          resolve();
        }
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Error during serverless request execution',
            message: err?.message,
          })
        );
      }
      resolve();
    }
  });
}
