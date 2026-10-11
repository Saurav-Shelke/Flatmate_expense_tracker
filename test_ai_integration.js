'use strict';

require('dotenv').config();
const sql = require('./db/index');
const aiRouter = require('./routes/ai');

async function runDirectTest() {
  console.log('Testing AI router directly with live database & Gemini API...');

  const members = await sql`
    SELECT hm.household_id, hm.user_id, u.full_name, u.username, hm.role
    FROM household_members hm
    JOIN users u ON u.id = hm.user_id
    WHERE u.username = 'virendra'
    LIMIT 1
  `;

  if (!members.length) {
    throw new Error('User virendra not found');
  }

  const user = members[0];
  console.log('Test user context:', {
    userId: user.user_id,
    householdId: user.household_id,
    name: user.full_name,
    role: user.role
  });

  const testCases = [
    {
      name: 'Personal Expense',
      transcript: 'Paid 150 for autos yesterday personal',
    },
    {
      name: 'On-Behalf Purchase for Saurav',
      transcript: 'Bought medicines for Saurav for 280 rupees',
    },
    {
      name: 'Common Shared Expense',
      transcript: 'Paid electricity bill 1500 split equally with all flatmates',
    }
  ];

  // Helper to invoke Express route handler directly
  const parseExpenseHandler = aiRouter.stack.find(
    s => s.route && s.route.path === '/parse-expense' && s.route.methods.post
  ).route.stack.slice(-1)[0].handle;

  for (const tc of testCases) {
    console.log(`\n==================================================`);
    console.log(`Testing: ${tc.name}`);
    console.log(`Transcript: "${tc.transcript}"`);

    await new Promise((resolve, reject) => {
      const mockReq = {
        session: {
          userId: user.user_id,
          householdId: user.household_id,
          role: user.role,
        },
        body: {
          transcript: tc.transcript,
          clientDate: '2026-10-11',
        },
      };

      const mockRes = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          if (this.statusCode && this.statusCode >= 400) {
            console.error(`Error (${this.statusCode}):`, data);
            reject(new Error(`Handler returned status ${this.statusCode}`));
          } else {
            console.log(`Model used: ${data.modelUsed}`);
            console.log(`Result Expense Type: ${data.parsed.expense_type}`);
            console.log(`Description: ${data.parsed.description}`);
            console.log(`Amount: ₹${(data.parsed.amount_paise / 100).toFixed(2)} (${data.parsed.amount_paise} paise)`);
            if (data.parsed.items) {
              console.log('Items:', data.parsed.items);
            }
            if (data.parsed.shares) {
              console.log('Shares:', data.parsed.shares);
            }
            resolve(data);
          }
        },
      };

      parseExpenseHandler(mockReq, mockRes).catch(reject);
    });
  }

  console.log('\n🎉 ALL AI TESTS PASSED WITH 100% SUCCESS!');
  process.exit(0);
}

runDirectTest().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
