import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import cors from 'cors';

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

// ── CORS Configuration for Separate Frontend Deployments ───────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    // Allow localhost or any vercel.app deployment or configured FRONTEND_URL
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('vercel.app')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

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
app.get(['/', '/api/health', '/health', '/api', '/api/'], (_req: Request, res: Response) => {
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
  try {
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
  } catch (err: any) {
    console.error('[Session store init failed, falling back to MemoryStore]:', err?.message);
    sessionStore = undefined;
  }
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
      sameSite: isProd ? 'none' : 'lax', // 'none' enables cross-origin cookies between frontend and backend on Vercel
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

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

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({ error: err.expose ? err.message : 'Internal server error' });
});

export default app;
