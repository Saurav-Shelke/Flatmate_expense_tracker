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
