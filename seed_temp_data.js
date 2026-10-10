'use strict';

const { randomUUID: uuidv4 } = require('crypto');
const { hashPassword } = require('./utils/password');
const sql = require('./db/index');

async function seed() {
  console.log('🚀 Starting realistic temp data seeding...');

  // 1. Fetch Household
  let [hh] = await sql`SELECT id FROM households LIMIT 1`;
  if (!hh) {
    const newId = uuidv4();
    await sql`INSERT INTO households (id, name) VALUES (${newId}, 'The Flat')`;
    hh = { id: newId };
  }
  const hid = hh.id;
  console.log(`✓ Household ID: ${hid}`);

  // 2. Fetch or Create Users
  const userDefs = [
    { name: 'Virendra',  username: 'virendra',  role: 'admin',  upi: 'virendra@oksbi' },
    { name: 'Saurav',    username: 'saurav',    role: 'member', upi: 'saurav.k@icici' },
    { name: 'Prathmesh', username: 'prathmesh', role: 'member', upi: 'prathmesh.p@paytm' },
    { name: 'Harshal',   username: 'harshal',   role: 'member', upi: 'harshal.tech@okhdfcbank' },
    { name: 'Pranay',    username: 'pranay',    role: 'member', upi: 'pranay.99@axisbank' },
  ];

  const userMap = {};
  for (const def of userDefs) {
    let rows = await sql`SELECT id, full_name, username FROM users WHERE username = ${def.username}`;
    let uid;
    if (rows.length === 0) {
      uid = uuidv4();
      const hash = await hashPassword('123456');
      await sql`
        INSERT INTO users (id, full_name, username, password_hash, must_change_password)
        VALUES (${uid}, ${def.name}, ${def.username}, ${hash}, TRUE)`;
      await sql`
        INSERT INTO household_members (household_id, user_id, role)
        VALUES (${hid}, ${uid}, ${def.role})
        ON CONFLICT (household_id, user_id) DO UPDATE SET role = ${def.role}, is_active = TRUE`;
    } else {
      uid = rows[0].id;
      const hash = await hashPassword('123456');
      await sql`UPDATE users SET password_hash = ${hash}, must_change_password = TRUE WHERE id = ${uid}`;
      await sql`
        INSERT INTO household_members (household_id, user_id, role)
        VALUES (${hid}, ${uid}, ${def.role})
        ON CONFLICT (household_id, user_id) DO UPDATE SET role = ${def.role}, is_active = TRUE`;
    }
    userMap[def.username] = { id: uid, name: def.name, upi: def.upi };

    // Update UPI Profile
    await sql`
      INSERT INTO member_upi_profiles (user_id, upi_id, display_name, updated_at)
      VALUES (${uid}, ${def.upi}, ${def.name}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET upi_id = ${def.upi}, display_name = ${def.name}, updated_at = NOW()`;
  }
  console.log('✓ Users and UPI profiles synced.');

  // 3. Ensure Categories
  const categoryNames = [
    'Rent', 'Electricity', 'Water', 'Gas', 'Groceries',
    'Eating Out', 'Transport', 'Medicines', 'Entertainment',
    'Household Supplies', 'Internet', 'Miscellaneous',
    'Gym & Fitness', 'Coffee & Snacks'
  ];

  const categoryMap = {};
  for (const cat of categoryNames) {
    let rows = await sql`SELECT id FROM categories WHERE LOWER(name) = LOWER(${cat}) LIMIT 1`;
    let cid;
    if (rows.length === 0) {
      cid = uuidv4();
      await sql`INSERT INTO categories (id, name, is_active) VALUES (${cid}, ${cat}, TRUE)`;
    } else {
      cid = rows[0].id;
    }
    categoryMap[cat] = cid;
  }
  console.log('✓ Categories verified and populated.');

  // 4. Clean up previous test expenses and settlements to avoid messy duplicate spikes if re-run
  await sql`DELETE FROM activity_logs WHERE household_id = ${hid}`;
  await sql`DELETE FROM settlements WHERE household_id = ${hid}`;
  await sql`DELETE FROM expense_shares WHERE expense_id IN (SELECT id FROM expenses WHERE household_id = ${hid})`;
  await sql`DELETE FROM expense_items WHERE expense_id IN (SELECT id FROM expenses WHERE household_id = ${hid})`;
  await sql`DELETE FROM expenses WHERE household_id = ${hid}`;
  console.log('✓ Cleared previous transactional data for fresh seed.');

  const allUids = [
    userMap.virendra.id,
    userMap.saurav.id,
    userMap.prathmesh.id,
    userMap.harshal.id,
    userMap.pranay.id,
  ];

  // 5. Insert Common Expenses
  const commonExpenses = [
    {
      desc: 'ACT Fibernet 300 Mbps Broadband',
      amount: 149900, // ₹1499.00
      paidBy: userMap.virendra.id,
      date: '2026-10-01',
      cat: categoryMap['Internet'],
      splitWith: allUids,
      notes: 'October monthly fiber bill with tax',
    },
    {
      desc: 'Torrent Power Electricity Bill (Sep-Oct)',
      amount: 375000, // ₹3750.00 (₹750 each)
      paidBy: userMap.saurav.id,
      date: '2026-10-03',
      cat: categoryMap['Electricity'],
      splitWith: allUids,
      notes: 'Bi-monthly flat electricity meter reading',
    },
    {
      desc: 'Maid & Cook Monthly Salary',
      amount: 500000, // ₹5000.00 (₹1000 each)
      paidBy: userMap.harshal.id,
      date: '2026-10-05',
      cat: categoryMap['Household Supplies'],
      splitWith: allUids,
      notes: 'October stipend for cooking & daily cleaning',
    },
    {
      desc: 'Bisleri 20L Water Cans (10 Cans)',
      amount: 80000, // ₹800.00 (₹200 each)
      paidBy: userMap.prathmesh.id,
      date: '2026-10-06',
      cat: categoryMap['Water'],
      splitWith: [userMap.virendra.id, userMap.saurav.id, userMap.prathmesh.id, userMap.harshal.id], // Pranay out of station
      notes: 'Drinking water cans package for the month',
    },
    {
      desc: 'Urban Company Deep Kitchen & Bathroom Cleaning',
      amount: 250000, // ₹2500.00 (₹500 each)
      paidBy: userMap.virendra.id,
      date: '2026-10-08',
      cat: categoryMap['Household Supplies'],
      splitWith: allUids,
      notes: 'Pre-festival thorough deep cleaning & pest control',
    },
    {
      desc: 'Indane Gas Cylinder Refill x 2',
      amount: 195000, // ₹1950.00 (₹390 each)
      paidBy: userMap.pranay.id,
      date: '2026-10-09',
      cat: categoryMap['Gas'],
      splitWith: allUids,
      notes: 'Kitchen twin cylinder refilling',
    }
  ];

  for (const exp of commonExpenses) {
    const eid = uuidv4();
    await sql`
      INSERT INTO expenses
        (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, category_id, split_method, notes)
      VALUES
        (${eid}, ${hid}, ${exp.paidBy}, 'common', ${exp.desc}, ${exp.amount}, ${exp.paidBy}, ${exp.date}, ${exp.cat}, 'equal', ${exp.notes})`;

    const shareCount = exp.splitWith.length;
    const baseShare = Math.floor(exp.amount / shareCount);
    let remainder = exp.amount - (baseShare * shareCount);

    for (let i = 0; i < shareCount; i++) {
      const shareAmount = baseShare + (i === 0 ? remainder : 0);
      await sql`
        INSERT INTO expense_shares (id, expense_id, user_id, amount_paise, share_type)
        VALUES (${uuidv4()}, ${eid}, ${exp.splitWith[i]}, ${shareAmount}, 'equal')`;
    }

    await sql`
      INSERT INTO activity_logs (id, actor_user_id, household_id, entity_type, entity_id, action, after_state)
      VALUES (${uuidv4()}, ${exp.paidBy}, ${hid}, 'expense', ${eid}, 'create', ${JSON.stringify({ description: exp.desc, amount_paise: exp.amount, type: 'common' })})`;
  }
  console.log(`✓ Seeded ${commonExpenses.length} common expenses.`);

  // 6. Insert Personal Expenses for each Flatmate
  const personalExpenses = [
    // Virendra
    { user: userMap.virendra.id, desc: "Gold's Gym 3-Month Membership", amount: 450000, cat: categoryMap['Gym & Fitness'], date: '2026-10-02' },
    { user: userMap.virendra.id, desc: 'Starbucks Cold Brew & Bagel', amount: 45000, cat: categoryMap['Coffee & Snacks'], date: '2026-10-06' },
    { user: userMap.virendra.id, desc: 'Metro Smart Card Recharge', amount: 50000, cat: categoryMap['Transport'], date: '2026-10-09' },
    // Saurav
    { user: userMap.saurav.id, desc: 'Zepto Late Night Snacks & Energy Drinks', amount: 68000, cat: categoryMap['Groceries'], date: '2026-10-03' },
    { user: userMap.saurav.id, desc: 'Kindle Books & Audible Subscription', amount: 89900, cat: categoryMap['Entertainment'], date: '2026-10-05' },
    { user: userMap.saurav.id, desc: 'Uber Ride to Tech Park', amount: 42000, cat: categoryMap['Transport'], date: '2026-10-08' },
    // Prathmesh
    { user: userMap.prathmesh.id, desc: 'Cult.fit Monthly Pass', amount: 180000, cat: categoryMap['Gym & Fitness'], date: '2026-10-01' },
    { user: userMap.prathmesh.id, desc: 'Zomato Biryani & Chicken Kebab', amount: 56000, cat: categoryMap['Eating Out'], date: '2026-10-04' },
    { user: userMap.prathmesh.id, desc: 'Pharmacy Multivitamins & Whey Shaker', amount: 125000, cat: categoryMap['Medicines'], date: '2026-10-07' },
    // Harshal
    { user: userMap.harshal.id, desc: 'Mechanical Keyboard Custom Keycaps', amount: 165000, cat: categoryMap['Miscellaneous'], date: '2026-10-02' },
    { user: userMap.harshal.id, desc: 'Blue Tokai Roasted Coffee Beans', amount: 78000, cat: categoryMap['Coffee & Snacks'], date: '2026-10-06' },
    { user: userMap.harshal.id, desc: 'Decathlon Jogging Shoes', amount: 299900, cat: categoryMap['Gym & Fitness'], date: '2026-10-09' },
    // Pranay
    { user: userMap.pranay.id, desc: 'Blinkit Instant Groceries & Milk', amount: 42000, cat: categoryMap['Groceries'], date: '2026-10-04' },
    { user: userMap.pranay.id, desc: 'PVR IMAX 3D Movie Tickets & Popcorn', amount: 95000, cat: categoryMap['Entertainment'], date: '2026-10-07' },
    { user: userMap.pranay.id, desc: 'Cough Syrup & Strepsils', amount: 31000, cat: categoryMap['Medicines'], date: '2026-10-09' },
  ];

  for (const exp of personalExpenses) {
    const eid = uuidv4();
    await sql`
      INSERT INTO expenses
        (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, category_id, notes)
      VALUES
        (${eid}, ${hid}, ${exp.user}, 'personal', ${exp.desc}, ${exp.amount}, ${exp.user}, ${exp.date}, ${exp.cat}, null)`;
  }
  console.log(`✓ Seeded ${personalExpenses.length} personal expenses.`);

  // 7. Insert On-Behalf Shopping Trips
  // Purchase 1: D-Mart Bulk Supermarket Run (Paid by Virendra)
  const p1Eid = uuidv4();
  const p1Items = [
    { desc: 'Optimum Nutrition Gold Whey 1kg', amount: 165000, cat: categoryMap['Groceries'], beneficiary: userMap.saurav.id },
    { desc: 'California Almonds & Cashews 500g', amount: 85000, cat: categoryMap['Groceries'], beneficiary: userMap.prathmesh.id },
    { desc: 'Ariel Matic Detergent 4kg Pack', amount: 62000, cat: categoryMap['Household Supplies'], beneficiary: userMap.harshal.id },
  ];
  const p1Total = p1Items.reduce((acc, i) => acc + i.amount, 0);

  await sql`
    INSERT INTO expenses (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
    VALUES (${p1Eid}, ${hid}, ${userMap.virendra.id}, 'on_behalf', 'D-Mart Monthly Grocery Run', ${p1Total}, ${userMap.virendra.id}, '2026-10-04', 'D-Mart shopping for individual requests')`;

  for (const item of p1Items) {
    const iid = uuidv4();
    await sql`
      INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
      VALUES (${iid}, ${p1Eid}, ${item.desc}, ${item.amount}, ${item.cat})`;
    await sql`
      INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
      VALUES (${uuidv4()}, ${p1Eid}, ${iid}, ${item.beneficiary}, ${item.amount}, 'on_behalf')`;
  }

  // Purchase 2: Swiggy Dinner Order (Paid by Saurav)
  const p2Eid = uuidv4();
  const p2Items = [
    { desc: 'Paneer Lababdar + Garlic Naan Meal', amount: 58000, cat: categoryMap['Eating Out'], beneficiary: userMap.virendra.id },
    { desc: 'Special Chicken Dum Biryani Handi', amount: 54000, cat: categoryMap['Eating Out'], beneficiary: userMap.pranay.id },
  ];
  const p2Total = p2Items.reduce((acc, i) => acc + i.amount, 0);

  await sql`
    INSERT INTO expenses (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
    VALUES (${p2Eid}, ${hid}, ${userMap.saurav.id}, 'on_behalf', 'Swiggy Weekend Late Night Order', ${p2Total}, ${userMap.saurav.id}, '2026-10-07', 'Late night food order for flatmates')`;

  for (const item of p2Items) {
    const iid = uuidv4();
    await sql`
      INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
      VALUES (${iid}, ${p2Eid}, ${item.desc}, ${item.amount}, ${item.cat})`;
    await sql`
      INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
      VALUES (${uuidv4()}, ${p2Eid}, ${iid}, ${item.beneficiary}, ${item.amount}, 'on_behalf')`;
  }

  // Purchase 3: Apollo Pharmacy First-Aid & Meds (Paid by Harshal)
  const p3Eid = uuidv4();
  const p3Items = [
    { desc: 'Volini Pain Relief Spray & Crepe Bandage', amount: 45000, cat: categoryMap['Medicines'], beneficiary: userMap.prathmesh.id },
    { desc: 'Electral ORS Pack & Vitamin C Chewables', amount: 35000, cat: categoryMap['Medicines'], beneficiary: userMap.virendra.id },
  ];
  const p3Total = p3Items.reduce((acc, i) => acc + i.amount, 0);

  await sql`
    INSERT INTO expenses (id, household_id, created_by, expense_type, description, amount_paise, paid_by, expense_date, notes)
    VALUES (${p3Eid}, ${hid}, ${userMap.harshal.id}, 'on_behalf', 'Apollo Pharmacy Emergency Supplies', ${p3Total}, ${userMap.harshal.id}, '2026-10-09', 'First aid and hydration supplies')`;

  for (const item of p3Items) {
    const iid = uuidv4();
    await sql`
      INSERT INTO expense_items (id, expense_id, description, amount_paise, category_id)
      VALUES (${iid}, ${p3Eid}, ${item.desc}, ${item.amount}, ${item.cat})`;
    await sql`
      INSERT INTO expense_shares (id, expense_id, expense_item_id, user_id, amount_paise, share_type)
      VALUES (${uuidv4()}, ${p3Eid}, ${iid}, ${item.beneficiary}, ${item.amount}, 'on_behalf')`;
  }
  console.log('✓ Seeded 3 on-behalf multi-item purchases.');

  // 8. Insert Settlements / Repayments
  const settlements = [
    // Saurav paid Virendra ₹500 via UPI (confirmed)
    {
      payer: userMap.saurav.id,
      recipient: userMap.virendra.id,
      amount: 50000,
      method: 'upi',
      status: 'confirmed',
      ref: 'UPI/428910283471/saurav',
      note: 'Partial repayment for D-Mart whey protein',
      confirmedBy: userMap.virendra.id,
      claimedAt: new Date(Date.now() - 3600000 * 48),
      confirmedAt: new Date(Date.now() - 3600000 * 46),
    },
    // Prathmesh paid Virendra ₹300 via UPI (confirmed)
    {
      payer: userMap.prathmesh.id,
      recipient: userMap.virendra.id,
      amount: 30000,
      method: 'upi',
      status: 'confirmed',
      ref: 'UPI/428999812490/prathmesh',
      note: 'ACT Broadband share repayment',
      confirmedBy: userMap.virendra.id,
      claimedAt: new Date(Date.now() - 3600000 * 36),
      confirmedAt: new Date(Date.now() - 3600000 * 34),
    },
    // Pranay claimed payment to Saurav ₹540 via UPI (pending verification)
    {
      payer: userMap.pranay.id,
      recipient: userMap.saurav.id,
      amount: 54000,
      method: 'upi',
      status: 'verification_pending',
      ref: 'UPI/429104882103/pranay',
      note: 'Repaid Biryani share via GPay',
      confirmedBy: null,
      claimedAt: new Date(Date.now() - 3600000 * 4),
      confirmedAt: null,
    }
  ];

  for (const s of settlements) {
    const sid = uuidv4();
    await sql`
      INSERT INTO settlements
        (id, household_id, payer_id, recipient_id, amount_paise, method, status,
         transaction_reference, note, claimed_at, confirmed_at, confirmed_by)
      VALUES
        (${sid}, ${hid}, ${s.payer}, ${s.recipient}, ${s.amount}, ${s.method}, ${s.status},
         ${s.ref}, ${s.note}, ${s.claimedAt}, ${s.confirmedAt}, ${s.confirmedBy})`;

    await sql`
      INSERT INTO activity_logs (id, actor_user_id, household_id, entity_type, entity_id, action, after_state)
      VALUES (${uuidv4()}, ${s.payer}, ${hid}, 'settlement', ${sid}, ${s.status === 'confirmed' ? 'confirm' : 'claim'},
              ${JSON.stringify({ amount_paise: s.amount, method: s.method, status: s.status })})`;
  }
  console.log(`✓ Seeded ${settlements.length} settlement / repayment records.`);

  console.log('\n🎉 ALL REALISTIC TEMP DATA SUCCESSFULLY SEEDED!\n');
  console.log('Account Usernames for testing:');
  console.log('----------------------------------------------------');
  for (const u of userDefs) {
    console.log(`👤 ${u.name.padEnd(10)} | Username: ${u.username.padEnd(10)} (First-time password change required)`);
  }
  console.log('----------------------------------------------------\n');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
