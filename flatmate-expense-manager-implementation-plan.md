# Flatmate Expense Manager — Implementation Plan

**Status:** Ready for repository audit and implementation  
**Stack:** React + TypeScript, shadcn/ui, Tailwind CSS, Neon PostgreSQL  
**Version:** 1.0  
**Date:** 10 October 2026

## 1. Purpose

Build a responsive expense and reimbursement app for five predefined flatmates. It must track personal expenses, purchases made on behalf of another flatmate, common household expenses, and repayments without mixing these financial flows.

For every transaction, the system must identify who paid, who benefited, each person's allocated amount, repayments received, and outstanding balances.

## 2. Technology and architecture

- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui, Lucide icons.
- **Forms and validation:** React Hook Form + Zod; validate again on the server.
- **Server state:** TanStack Query if useful; React Router for a Vite SPA.
- **Backend:** Server-only API (existing framework routes, or Express/Fastify for a new Vite app).
- **Database:** Neon PostgreSQL + Drizzle ORM + Drizzle Kit migrations.
- **Authentication:** Established session-based auth library where compatible; otherwise carefully implemented server-managed sessions and Argon2id password hashing.
- **QR codes:** `qrcode` or equivalent library for rendering UPI payment URIs.
- **Currency:** INR; store all amounts as integer paise.
- **Deployment:** Frontend and API on a suitable host; database connection string only in server-side environment variables.

```text
React + shadcn/ui
        | HTTPS + secure session cookie
        v
Server API: authentication, authorization, validation, financial rules
        | Drizzle ORM
        v
Neon PostgreSQL
```

**Critical:** Never connect to Neon directly from browser code. Never expose database credentials or session secrets through `VITE_`/`NEXT_PUBLIC_` environment variables. If the repository already uses a working framework, adapt to it rather than adding a competing framework.

## 3. Roles and access rules

Five accounts are provisioned privately; public signup is disabled.

- **Admin:** One designated household member. Can create, edit, and correct common expenses; manage household configuration and account activation.
- **Member:** Can manage their own personal expenses, create purchases on behalf of others, view purchases in which they are involved, manage their own UPI profile, and submit repayment claims.
- All members can view authorized common expenses and their own allocations.
- Members cannot change their own role or edit another person's personal expense or UPI profile.
- Only the recipient of a repayment can confirm receipt.
- Purchase-on-behalf details are visible to the purchaser and the relevant beneficiary, not automatically to all household members.
- Admin access does not automatically expose private personal expense histories. Any exceptional dispute access should be explicit, authorized, and audited.

Provision accounts using a secure seed/admin workflow. Do not put real passwords in source control. Hash passwords with Argon2id or use the chosen auth provider's secure implementation. If temporary passwords are used, require a password change at first login.

## 4. Expense types

### 4.1 Personal expense
For an expense belonging only to the logged-in user. It affects personal spending, not shared balances or other members' debts. The server derives the owner from the authenticated session.

### 4.2 Purchase on behalf of a flatmate
A member buys something for another member and initially pays the merchant.

Example: Virendra buys ₹200 of medicines and ₹300 of chicken for Rahul. Rahul owes Virendra ₹500 until repayments are confirmed.

A shopping trip can contain multiple items and beneficiaries:

| Item | Beneficiary | Amount |
|---|---|---:|
| Medicines | Rahul | ₹200 |
| Chicken | Rahul | ₹300 |
| Groceries | Purchaser | ₹200 |
| Snacks | Amit | ₹300 |
| **Total paid by purchaser** | | **₹1,000** |

Results:
- Purchaser's own personal spending: ₹200.
- Rahul owes purchaser: ₹500.
- Amit owes purchaser: ₹300.
- Reimbursable outstanding: ₹800.

Each line item should have a description, optional quantity, amount, category, and beneficiary allocation. A purchaser may allocate one trip to several beneficiaries. Their own items are not reimbursable.

Views:
- **Purchases I made:** purchases where the current user paid.
- **Purchases made for me:** purchases where the current user is a beneficiary.
- Each participant sees item details, repayments, and balance relevant to them.
- Other members cannot access the record by guessing its URL or ID.

### 4.3 Common household expense
Examples: electricity, rent, shared cleaning products, or shared groceries.

- Only the admin can create, edit, or correct common expenses.
- Members can view common expense details and their applicable shares.
- Split methods: equal, custom amounts, percentages, or selected members.
- Track payer separately from beneficiaries.
- A common expense can be shared by a subset of members; do not assume all five participate.
- Edits after repayments require an audited correction/reversal process, not silent rewriting.

### 4.4 Repayment / settlement
A repayment is money transferred between members, not a new expense. Support:
- Cash and UPI.
- Full and partial repayments.
- Multiple repayments against a debt.
- Pending, verification-pending, confirmed, rejected, and cancelled states as applicable.
- Optional transaction reference and note.
- Recipient confirmation for the manual UPI workflow.

Only confirmed repayments reduce outstanding balances. Pending and rejected claims do not.

## 5. UPI profile and payment QR

### Profile settings
Each member can add, edit, preview, and remove their own UPI ID. Include:
- UPI ID and confirmation field.
- Display name.
- QR preview.
- Save and remove actions.
- Last-updated time.

Normalize and validate UPI ID syntax, but do not claim syntax validation proves the ID exists. If not independently verified, label it as “Not independently verified.” Never generate a fake or placeholder QR.

### Payment flow
1. Identify the person owed money (usually the member who paid the original purchase/expense).
2. Show their name, saved UPI ID, exact outstanding amount, and reference.
3. Generate a UPI URI/QR for that recipient and amount.
4. Offer copy UPI ID and open-UTI-app actions where supported.
5. Payer selects “I've paid” and can enter a UTR/reference and note.
6. The claim becomes `verification_pending`, not paid.
7. Recipient confirms receipt or rejects the claim.
8. On confirmation, the server records the settlement transactionally and recomputes the balance.

A QR scan, app launch, client callback, or submitted UTR alone is not proof of receipt. The first release uses recipient confirmation. If Razorpay is added later, verify the payment server-side through signed webhooks/API verification, handle retries idempotently, and never trust a client-only success callback.

Snapshot the recipient display name and UPI ID when a payment claim is created so future profile changes do not rewrite historical evidence. New claims use the current saved UPI ID.

## 6. Dashboard, navigation, and filters

### Dashboard metrics
Show separate values for:
- My personal spending (period-based).
- My share of common expenses.
- Amount I paid on behalf of others.
- Amount owed to me.
- Amount I owe.
- Common expense summary.
- Recent authorized activity.

“Paid by me” is not the same as “my spending.” Separate period spending from outstanding debt, which carries across months.

### Navigation
Desktop sidebar:
- Overview
- Expenses
- Purchases I Made
- Purchases Made for Me
- Common Expenses
- Balances
- Repayments
- Reports
- Profile & UPI
- Settings (admin options only)

Mobile bottom navigation:
- Home
- Expenses
- Balances
- Repayments
- More

### Filters
Combine filters for:
- Member.
- Payer/purchaser.
- Beneficiary/person the purchase is for.
- Expense type.
- Category.
- Day, week, month, year, custom date range.
- Payment status.
- Description/item text search.
- Optional amount range.

Use separate labels for **Paid by** and **For / Beneficiary**. Use server-side filtering and pagination. Sync filters to URL query parameters where feasible. The household timezone governs dates; use half-open ranges and Monday-start weeks. A month filter must not erase older outstanding debt.

Desktop uses a compact toolbar/table; mobile uses a filter Sheet and transaction cards. Include active-filter chips and clear-all.

## 7. Expense forms and screens

### Personal expense form
- Description, amount, date, category, notes.
- Owner is always derived from the authenticated session.

### Purchase-on-behalf form
- Shopping trip description and date.
- One or more line items.
- Item description, optional quantity, amount, category.
- Beneficiary per item.
- Live allocation summary showing personal vs reimbursable amounts.
- Validate that item totals and beneficiary allocations match the transaction total.

### Common expense form (admin only)
- Description, amount, category, date, payer, participants, split method, allocation preview, notes.
- Validate that custom/percentage/equal allocations sum exactly to the total.
- Create the expense and all shares atomically.

### Repayment screen
- Debt summary and recipient.
- UPI QR, UPI ID, copy action, exact amount.
- “I've paid” claim form with optional reference.
- Pending/confirmed/rejected history and remaining amount.
- Recipient-only confirm/reject controls.

### Profile / UPI
- Editable own UPI ID, confirmation, QR preview, save/remove actions.
- Clear feedback if no UPI ID exists; offer cash/manual alternatives.

## 8. UI design system

Use shadcn/ui primitives consistently: Button, Card, Input, Select/Combobox, Form, Dialog, Sheet, Tabs, Table, Badge, DropdownMenu, AlertDialog, Calendar/DatePicker, Tooltip, Skeleton, Sonner/toast, and Separator.

Design direction: professional, restrained, accessible, mobile-first; no gradients, excessive animation, oversized rounded cards, or flashy visual effects.

Suggested tokens (check contrast before shipping):
- Light background `#F7F8FA`, surface `#FFFFFF`, secondary `#F0F2F5`.
- Primary `#355E4B`, text `#20262E`, muted `#66717D`, border `#DFE4E8`.
- Positive `#28734F`, negative `#B54747`.
- Dark background `#111418`, surface `#191E24`, secondary `#222831`.
- Dark primary `#8BB8A0`, text `#E8ECF0`, muted `#9AA5B1`, border `#303740`.

Use Inter or the existing sans-serif, tabular numerals for money, visible focus states, keyboard support, and reduced-motion preferences.

## 9. Database model

Use UUID primary keys, timestamps, foreign keys, indexes, and explicit constraints. This is a logical model; implement through Drizzle migrations.

### `users`
`id`, `full_name`, normalized unique `username`, `password_hash`, `is_active`, `must_change_password`, timestamps.

### `households`
`id`, `name`, `timezone`, `currency` (INR), `created_at`.

### `household_members`
`household_id`, `user_id`, `role` (`admin`/`member`), `is_active`; unique `(household_id, user_id)`.

### `categories`
`id`, `name`, applicability/type, `is_active`.

### `expenses`
`id`, `household_id`, `created_by`, `expense_type` (`personal`, `on_behalf`, `common`), `description`, `amount_paise` BIGINT, `currency`, `category_id`, `paid_by`, `expense_date`, `split_method`, `notes`, `status`, timestamps.

### `expense_items`
`id`, `expense_id`, `description`, optional `quantity`, optional `unit_amount_paise`, `amount_paise`, optional `category_id`, `created_at`.

### `expense_shares`
`id`, `expense_id`, optional `expense_item_id`, `user_id` (beneficiary), `amount_paise`, `share_type`, `created_at`.

Shares represent the canonical allocation of who benefited/is responsible. For personal expenses, the beneficiary is the owner and no inter-member debt is created. For on-behalf purchases, a beneficiary other than the purchaser owes the purchaser their allocation. For common expenses, shares represent each participant's responsibility.

### `member_upi_profiles`
`user_id` primary/FK, `upi_id`, `display_name`, `updated_at`, optional `upi_verified_at` only if actual verification is implemented.

### `settlements`
`id`, `household_id`, `payer_id`, `recipient_id`, `amount_paise`, `method`, `status`, optional `transaction_reference`, optional `note`, recipient name/UPI snapshots, `claimed_at`, `confirmed_at`, `confirmed_by`, timestamps.

If one settlement can cover multiple obligations, add `settlement_allocations` with settlement ID, obligation/share reference, and `amount_paise`. Enforce that allocation totals equal the settlement amount. For an MVP, consider one repayment linked to one obligation to keep remaining-balance calculations unambiguous.

### `activity_logs`
`id`, `actor_user_id`, `household_id`, `entity_type`, `entity_id`, `action`, redacted before/after JSON, `created_at`.

### Database rules
- Store money as integer paise, never floating-point.
- Enforce positive amounts and foreign keys.
- Index household/date, payer/date, type/date, share beneficiary, and settlement payer/recipient/status.
- Check allocation totals and split constraints in transactional application logic; add database constraints where practical.
- Use transactions for expense + items + shares and settlement confirmation.
- Preserve financial history; prefer reversals/adjustments over destructive deletion.
- Do not log passwords, session cookies, tokens, or unnecessary UPI details.

## 10. Balance calculation rules

Implement one canonical, tested server-side balance service.

- **Personal spending:** sum of the member's personal expenses in the selected period.
- **Common share:** sum of common allocations for that member.
- **Advanced for others:** on-behalf allocations where the current member paid and beneficiary differs from purchaser.
- **On-behalf debt:** beneficiary owes purchaser the allocated amount minus confirmed repayments allocated to that obligation.
- **Common net position:** shared expenses paid by member minus common shares allocated to member, adjusted for confirmed settlements according to a documented, consistent model.

Pending/rejected claims never affect balances. Confirmed settlements reduce the payer's debt and the recipient's receivable exactly once. Do not mix net household position with pairwise debt without defining how they reconcile.

### Rounding
- Calculate in integer paise.
- Equal split remainder is distributed deterministically in a stable member order.
- Percentage allocations must sum to the total after deterministic paise rounding.
- Custom amounts must sum exactly to the total.
- Reject invalid allocations server-side.

## 11. API outline

All routes require authentication as appropriate, resource-level authorization, server validation, safe errors, and bounded pagination.

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/expenses` (filters + pagination)
- `POST /api/expenses`
- `GET /api/expenses/:id`
- `PATCH /api/expenses/:id`
- `POST /api/expenses/:id/reverse`
- `GET /api/purchases/on-behalf`
- `GET /api/purchases/for-me`
- `POST /api/purchases`
- `GET /api/balances`
- `GET /api/settlements`
- `POST /api/settlements`
- `POST /api/settlements/:id/confirm` (recipient only)
- `POST /api/settlements/:id/reject` (recipient only)
- `POST /api/settlements/:id/cancel`
- `GET /api/profile`
- `GET /api/profile/upi`
- `PUT /api/profile/upi`
- `DELETE /api/profile/upi`

Derive user IDs from the session where possible. Never accept client-submitted roles or payment statuses as authoritative.

## 12. Security checklist

- [ ] No public registration.
- [ ] Secure password hashing or vetted auth provider.
- [ ] HttpOnly, Secure-in-production, SameSite session cookies.
- [ ] Session rotation on login; invalidate on logout/reset.
- [ ] Login rate limiting and generic auth errors.
- [ ] CSRF protection appropriate for cookie sessions.
- [ ] Authorization enforced on every server request.
- [ ] Prevent IDOR by checking access to each resource ID.
- [ ] Parameterized Drizzle queries.
- [ ] Zod validation on server.
- [ ] Database secrets server-only; `.env` not committed.
- [ ] Restrict CORS if frontend/API are separate.
- [ ] HTTPS and appropriate security headers.
- [ ] Transactions for multi-row financial writes.
- [ ] Idempotent settlement confirmation.
- [ ] Only confirmed repayments alter balances.
- [ ] Only recipient confirms manual UPI payment.
- [ ] Audit financial edits, reversals, confirmations, and admin actions.
- [ ] Rate-limit payment claims and sensitive profile updates.
- [ ] Redact sensitive values from logs.
- [ ] Backups and documented recovery procedure.
- [ ] Tests for allowed and denied access.

## 13. Edge cases

- No UPI ID: QR unavailable; offer cash/manual alternative.
- UPI ID changed: existing claim retains snapshot; future claims use new value.
- Partial repayment: only confirmed amount reduces debt.
- Duplicate confirmation: idempotent; never apply twice.
- Expense changed after repayment: require audited correction/reversal.
- Deactivated member: retain historic records.
- Mixed shopping trip: purchaser's own items are not reimbursable.
- Multiple beneficiaries: enforce item and allocation totals.
- Unauthorized private record access: deny without leaking details.
- Timezone boundaries: household timezone and half-open date ranges.
- Settlement exceeds debt: reject or require explicit allocation/overpayment behavior.
- Deleted category/user: archive/deactivate rather than break history.

## 14. Testing plan

### Unit tests
- Equal, custom, percentage splits and rounding.
- Personal expense exclusion from common balances.
- Purchaser's own items excluded from reimbursement debt.
- Multiple beneficiaries in one trip.
- Partial repayments and remaining balance.
- Pending/rejected claims do not alter balances.
- Confirmed settlement reduces debt exactly once.
- Date filtering and timezone boundaries.

### Integration tests
- Expense and shares commit atomically; failures roll back.
- Member cannot create/edit common expenses.
- Member cannot edit another member's personal expense.
- Only involved members can see on-behalf details.
- Only recipient can confirm a claim.
- Users can only update/delete their own UPI profile.
- Forged user/role IDs are ignored or rejected.
- Unauthenticated calls are rejected.

### End-to-end scenarios
1. Provision five users and log in.
2. Add personal expense and confirm shared balances remain unchanged.
3. Buy two items for Rahul; confirm only relevant participants can see them.
4. Record items for Rahul, Amit, and purchaser; verify all allocations.
5. Submit and reject a payment claim; debt stays unchanged.
6. Submit and confirm a claim; balance decreases once.
7. Admin records electricity bill split five ways.
8. Change UPI ID; new QR updates and existing claim snapshot stays stable.
9. Test mobile navigation, filters, theme switching, and keyboard access.

## 15. Implementation phases

### Phase 0 — Audit first
Inspect repository, package manager, React setup, routing, styling, database access, auth, current UI, migrations, and deployment. Produce an audit report and identify security/financial risks before edits. Preserve working architecture and components.

### Phase 1 — Foundation
Configure environment validation, Neon, Drizzle migrations, authentication, session handling, five-user provisioning, role middleware, audit logging, and API error conventions.

### Phase 2 — Expenses
Implement personal expenses, categories, multi-item on-behalf purchases and reciprocal views, admin-only common expenses, split previews, atomic writes, and audit-safe corrections.

### Phase 3 — Balances and repayments
Implement one canonical balance service, cash repayments, partial repayments, UPI payment claims, recipient confirmation/rejection, history, and idempotency. Test calculations before showing balances as authoritative.

### Phase 4 — UPI profile and QR
Implement UPI editor, normalization/validation, QR preview, payment URI generation, claim snapshots, and clear warnings about manual confirmation.

### Phase 5 — Dashboard and UX
Implement summaries, responsive transaction lists, filters, pagination, activity history, reports, light/dark theme, and accessibility checks.

### Phase 6 — Hardening and release
Run type-check, lint, tests, production build, dependency/security checks, migration validation, authorization review, and recovery checks before production deployment.

## 16. Acceptance criteria

- [ ] Five provisioned users can log in; public signup is disabled.
- [ ] Members can manage only their own personal expenses.
- [ ] Personal expenses never affect common balances.
- [ ] Members can record purchases for one or more flatmates.
- [ ] Purchaser and beneficiary have reciprocal purchase-history views.
- [ ] Uninvolved members cannot view private purchase details.
- [ ] Mixed shopping trips allocate personal and reimbursable items correctly.
- [ ] Only admin can create/edit/correct common expenses.
- [ ] Equal, custom, percentage, and selected-member splits work.
- [ ] Partial repayments and outstanding balances are correct.
- [ ] Pending/rejected claims do not reduce debt.
- [ ] Only recipient confirms manual UPI repayments.
- [ ] Members can add, edit, preview, and remove their own UPI details.
- [ ] QR contains the correct recipient and amount.
- [ ] Historical claims preserve recipient/UPI snapshots.
- [ ] Filters support member, payer, beneficiary, type, category, date, and status.
- [ ] All money is integer paise with deterministic rounding.
- [ ] Sensitive endpoints enforce server-side authorization.
- [ ] Mobile and desktop layouts are usable and accessible.
- [ ] Tests cover financial calculations and denied access.

## 17. Non-negotiable implementation rules

1. Never trust the client for ownership, role, split amount, beneficiary permissions, or payment status.
2. Keep personal expenses, on-behalf obligations, common shares, and settlements separate.
3. Store money in integer paise and calculate balances in one tested server-side service.
4. Use database transactions for multi-row financial writes.
5. Never mark UPI payment complete just because a QR was scanned or a button was clicked.
6. Preserve financial history through audited adjustments instead of destructive edits.
7. Restrict purchase details to involved participants and explicitly authorized roles.
8. Audit the repository before making changes; implement in small, reviewable phases.
