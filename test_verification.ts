import 'dotenv/config';
import http from 'http';
import app from './app';
import handler from './api/index';

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3002, () => resolve()));
  console.log('--- Express Direct Endpoint Tests ---');

  // Test 1: GET /api/auth/me
  const t1 = await fetch('http://localhost:3002/api/auth/me');
  console.log('1. GET /api/auth/me:', t1.status, await t1.json());

  // Test 2: GET /auth/me (root alias)
  const t2 = await fetch('http://localhost:3002/auth/me');
  console.log('2. GET /auth/me (root alias):', t2.status, await t2.json());

  // Test 3: POST /api/auth/login (bad creds)
  const t3 = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'virendra', password: 'badpassword' }),
  });
  console.log('3. POST /api/auth/login (bad creds):', t3.status, await t3.json());

  // Test 4: POST /auth/login (root alias, bad creds)
  const t4 = await fetch('http://localhost:3002/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'virendra', password: 'badpassword' }),
  });
  console.log('4. POST /auth/login (root alias):', t4.status, await t4.json());

  // Test 5: Health endpoints
  const t5a = await fetch('http://localhost:3002/api/health');
  console.log('5a. GET /api/health:', t5a.status, (await t5a.json()).status);
  const t5b = await fetch('http://localhost:3002/health');
  console.log('5b. GET /health:', t5b.status, (await t5b.json()).status);

  server.close();

  console.log('\n--- Vercel Serverless Handler Tests ---');
  const serverlessServer = http.createServer((req, res) => {
    handler(req, res);
  });
  await new Promise<void>((resolve) => serverlessServer.listen(3003, () => resolve()));

  // Test 6: Vercel serverless request to /api/auth/me
  const t6 = await fetch('http://localhost:3003/api/auth/me');
  console.log('6. Serverless GET /api/auth/me:', t6.status, await t6.json());

  // Test 7: Vercel serverless request where Vercel stripped prefix: /auth/me
  const t7 = await fetch('http://localhost:3003/auth/me');
  console.log('7. Serverless GET /auth/me (prefix stripped):', t7.status, await t7.json());

  // Test 8: Vercel serverless POST /auth/login (prefix stripped)
  const t8 = await fetch('http://localhost:3003/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'virendra', password: 'badpassword' }),
  });
  console.log('8. Serverless POST /auth/login (prefix stripped):', t8.status, await t8.json());

  serverlessServer.close();
  console.log('\nAll tests passed successfully!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
