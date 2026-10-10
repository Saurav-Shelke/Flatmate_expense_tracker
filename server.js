'use strict';

require('dotenv').config();

// Validate critical env vars before anything else
if (!process.env.DATABASE_URL)  throw new Error('DATABASE_URL is required in .env');
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in .env');

const { initDB } = require('./db/init');
const app  = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('─────────────────────────────────────────');
      console.log(`  🏠  Flatmate Expense Manager`);
      console.log(`  →   http://localhost:${PORT}`);
      console.log('');
      console.log('  Initial temporary password required for first login.');
      console.log('  ⚠  Users must set a new secure password on first sign-in.');
      console.log('─────────────────────────────────────────\n');
    });
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
