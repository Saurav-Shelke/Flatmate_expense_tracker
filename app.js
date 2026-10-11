'use strict';

const express   = require('express');
const session   = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path      = require('path');

const isProd = process.env.NODE_ENV === 'production';

// ── Route modules ─────────────────────────────────────────────────────────────
const authRouter        = require('./routes/auth');
const membersRouter     = require('./routes/members');
const categoriesRouter  = require('./routes/categories');
const expensesRouter    = require('./routes/expenses');
const purchasesRouter   = require('./routes/purchases');
const balancesRouter    = require('./routes/balances');
const settlementsRouter = require('./routes/settlements');
const profileRouter     = require('./routes/profile');
const activityRouter    = require('./routes/activity');
const aiRouter          = require('./routes/ai');

const app = express();

// ── Reverse Proxy Trust (AUD-09) ──────────────────────────────────────────────
app.set('trust proxy', 1);

// ── Security Headers (AUD-09 / Clickjacking & MIME-sniffing protection) ───────
app.use((req, res, next) => {
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV || 'not_set',
    timestamp: new Date().toISOString(),
  });
});

// ── Persistent PostgreSQL Session (AUD-07) ────────────────────────────────────
const { Pool } = require('pg');

let sessionStore = undefined;
if (process.env.DATABASE_URL) {
  const sessionPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });

  sessionPool.on('error', (err) => {
    console.error('[Session DB Pool error]:', err.message);
  });

  sessionStore = new pgSession({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: false, // Prevent background timers from hanging Lambda functions
  });
}

app.use(session({
  store:             sessionStore,
  secret:            process.env.SESSION_SECRET || 'flatmate_expense_session_secret_fallback',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   isProd,          // only transmit over HTTPS in production
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ── Static files (frontend) ───────────────────────────────────────────────────
const fs = require('fs');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/members',     membersRouter);
app.use('/api/categories',  categoriesRouter);
app.use('/api/expenses',    expensesRouter);
app.use('/api/purchases',   purchasesRouter);
app.use('/api/balances',    balancesRouter);
app.use('/api/settlements', settlementsRouter);
app.use('/api/profile',     profileRouter);
app.use('/api/upi',         profileRouter); // AUD-04 route alias for UPI QR generation
app.use('/api/activity',    activityRouter);
app.use('/api/ai',          aiRouter);

// ── SPA fallback ──────────────────────────────────────────────────────────────
// All non-API GET requests return the frontend (supports client-side routing)
app.get(/^(?!\/api).*/, (req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
