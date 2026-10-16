import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// ── Route modules ─────────────────────────────────────────────────────────────
import authRouter from './routes/auth';
import membersRouter from './routes/members';
import categoriesRouter from './routes/categories';
import expensesRouter from './routes/expenses';
import purchasesRouter from './routes/purchases';
import balancesRouter from './routes/balances';
import settlementsRouter from './routes/settlements';
import profileRouter from './routes/profile';
import activityRouter from './routes/activity';
import aiRouter from './routes/ai';

const isProd = process.env.NODE_ENV === 'production';
const pgSession = connectPgSimple(session);

export const app = express();

// ── Reverse Proxy Trust (AUD-09) ──────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Security Headers (AUD-09 / Clickjacking & MIME-sniffing protection) ───────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── Health / Diagnostics Endpoint ─────────────────────────────────────────────
app.get(['/api/health', '/health', '/api', '/api/'], (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'Flatmate Expense Manager API',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    nodeEnv: process.env.NODE_ENV || 'not_set',
    timestamp: new Date().toISOString(),
  });
});

// ── Persistent PostgreSQL Session (AUD-07) ────────────────────────────────────
let sessionStore: any = undefined;
if (process.env.DATABASE_URL) {
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });

  sessionPool.on('error', (err: any) => {
    console.error('[Session DB Pool error]:', err.message);
  });

  sessionStore = new pgSession({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: false, // Prevent background timers from hanging Lambda functions
  });
}

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'flatmate_expense_session_secret_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // only transmit over HTTPS in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ── Static files (frontend) ───────────────────────────────────────────────────
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.resolve(process.cwd(), 'public'), { index: false }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/balances', balancesRouter);
app.use('/api/settlements', settlementsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/upi', profileRouter); // AUD-04 route alias for UPI QR generation
app.use('/api/activity', activityRouter);
app.use('/api/ai', aiRouter);

// ── Root route aliases (resilience against proxies or serverless rewriting that strips /api) ──
app.use('/auth', authRouter);
app.use('/members', membersRouter);
app.use('/categories', categoriesRouter);
app.use('/expenses', expensesRouter);
app.use('/purchases', purchasesRouter);
app.use('/balances', balancesRouter);
app.use('/settlements', settlementsRouter);
app.use('/profile', profileRouter);
app.use('/upi', profileRouter);
app.use('/activity', activityRouter);
app.use('/ai', aiRouter);

// ── SPA fallback ──────────────────────────────────────────────────────────────
// All non-API GET requests return the frontend (supports client-side routing)
app.get(/^(?!\/(api|auth|members|categories|expenses|purchases|balances|settlements|profile|upi|activity|ai)).*/, (_req: Request, res: Response) => {
  const distIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  const rootIndex = path.resolve(process.cwd(), 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  res.status(404).send('Not Found');
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({ error: err.expose ? err.message : 'Internal server error' });
});

export default app;
