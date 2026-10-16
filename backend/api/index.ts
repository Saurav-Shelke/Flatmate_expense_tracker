import app from '../app';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Crash]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({
        error: 'Backend Serverless Execution Error',
        message: err?.message || String(err),
      }));
    }
  }
}


