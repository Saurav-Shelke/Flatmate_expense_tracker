import 'dotenv/config';
import { initDB } from './db/init';
import app from './app';

// Validate critical env vars before anything else
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env');
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required in .env');

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
  .catch((err: any) => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
