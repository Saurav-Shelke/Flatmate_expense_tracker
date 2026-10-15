import type { IncomingMessage, ServerResponse } from 'http';

let app: any = null;
let loadError: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const importedApp = await import('../app');
  app = importedApp.default || importedApp;
} catch (err: any) {
  loadError = {
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  };
  console.error('[CRITICAL MODULE LOAD ERROR]', err);
}

let dbInitPromise: Promise<void> | null = null;
async function ensureDbInit() {
  if (!dbInitPromise && process.env.DATABASE_URL) {
    dbInitPromise = (async () => {
      try {
        const { initDB } = await import('../db/init');
        await initDB();
      } catch (err: any) {
        console.warn('[Vercel DB Init Warning]:', err?.message);
      }
    })();
  }
  return dbInitPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify(
        {
          error: 'Backend failed to initialize on Vercel',
          details: loadError,
          env: {
            hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
            hasSessionSecret: Boolean(process.env.SESSION_SECRET),
            nodeVersion: process.version,
          },
        },
        null,
        2
      )
    );
  }

  // Ensure DB schema and default seed data are initialized
  if (process.env.DATABASE_URL) {
    try {
      await ensureDbInit();
    } catch (dbErr: any) {
      console.warn('[DB Init background check]:', dbErr?.message);
    }
  }

  // Normalize req.url so Express routers (mounted under /api) always match,
  // regardless of whether Vercel preserves or strips the /api rewrite prefix.
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  try {
    return app(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'Error during request execution',
        message: err?.message,
        stack: err?.stack,
      })
    );
  }
}

