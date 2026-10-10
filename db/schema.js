'use strict';

const {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigint,
  numeric,
  date,
  json,
  jsonb,
  varchar,
  primaryKey,
  index,
} = require('drizzle-orm/pg-core');

// ── Households ────────────────────────────────────────────────────────────────
const households = pgTable('households', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  currency: text('currency').notNull().default('INR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Users ─────────────────────────────────────────────────────────────────────
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  username: text('username').notNull().unique('users_username_key'),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Household Members ─────────────────────────────────────────────────────────
const householdMembers = pgTable(
  'household_members',
  {
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.householdId, table.userId] }),
  ]
);

// ── Categories ────────────────────────────────────────────────────────────────
const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  expenseType: text('expense_type'),
  isActive: boolean('is_active').notNull().default(true),
});

// ── Expenses ──────────────────────────────────────────────────────────────────
const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    expenseType: text('expense_type').notNull(),
    description: text('description').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    categoryId: uuid('category_id').references(() => categories.id),
    paidBy: uuid('paid_by')
      .notNull()
      .references(() => users.id),
    expenseDate: date('expense_date').notNull(),
    splitMethod: text('split_method'),
    notes: text('notes'),
    status: text('status').notNull().default('active'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_expenses_household_date').on(table.householdId, table.expenseDate),
    index('idx_expenses_paid_by').on(table.paidBy),
  ]
);

// ── Expense Items ─────────────────────────────────────────────────────────────
const expenseItems = pgTable('expense_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id')
    .notNull()
    .references(() => expenses.id),
  description: text('description').notNull(),
  quantity: numeric('quantity'),
  unitAmountPaise: bigint('unit_amount_paise', { mode: 'number' }),
  amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Expense Shares ────────────────────────────────────────────────────────────
const expenseShares = pgTable(
  'expense_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id),
    expenseItemId: uuid('expense_item_id').references(() => expenseItems.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    shareType: text('share_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_expense_shares_user').on(table.userId),
  ]
);

// ── Member UPI Profiles ───────────────────────────────────────────────────────
const memberUpiProfiles = pgTable('member_upi_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id),
  upiId: text('upi_id').notNull(),
  displayName: text('display_name').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Settlements ───────────────────────────────────────────────────────────────
const settlements = pgTable(
  'settlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    householdId: uuid('household_id')
      .notNull()
      .references(() => households.id),
    payerId: uuid('payer_id')
      .notNull()
      .references(() => users.id),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    method: text('method').notNull(),
    status: text('status').notNull().default('pending'),
    transactionReference: text('transaction_reference'),
    note: text('note'),
    recipientNameSnapshot: text('recipient_name_snapshot'),
    recipientUpiSnapshot: text('recipient_upi_snapshot'),
    expenseShareId: uuid('expense_share_id').references(() => expenseShares.id),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_settlements_payer').on(table.payerId),
    index('idx_settlements_recipient').on(table.recipientId),
  ]
);

// ── Activity Logs ─────────────────────────────────────────────────────────────
const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  householdId: uuid('household_id').references(() => households.id),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  action: text('action').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Session (connect-pg-simple) ───────────────────────────────────────────────
const session = pgTable(
  'session',
  {
    sid: varchar('sid', { length: 255 }).primaryKey().notNull(),
    sess: json('sess').notNull(),
    expire: timestamp('expire', { precision: 6 }).notNull(),
  },
  (table) => [
    index('IDX_session_expire').on(table.expire),
  ]
);

module.exports = {
  households,
  users,
  householdMembers,
  categories,
  expenses,
  expenseItems,
  expenseShares,
  memberUpiProfiles,
  settlements,
  activityLogs,
  session,
};
