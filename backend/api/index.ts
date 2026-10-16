import app from '../app';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Crash]:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      const origin = req?.headers?.origin || 'https://flatmate-expense-tracker-lemon.vercel.app';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.end(JSON.stringify({
        error: 'Backend Serverless Execution Error',
        message: err?.message || String(err),
      }));
    }
  }
}


