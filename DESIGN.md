# Flatmate Expense Manager — Complete Product Design Specification

**Document type:** Product UI/UX specification and implementation contract  
**Product:** Flatmate Expense Manager  
**Primary usage:** Mobile-first; assume roughly 99% of sessions are on phones  
**Secondary usage:** Tablet and desktop  
**Implementation stack:** React, TypeScript, Vite, Tailwind CSS, existing Radix/shadcn-style components, Lucide icons, TanStack Query, Express API, Neon PostgreSQL, Drizzle ORM  
**Design direction:** Household Ledger — calm, legible, financially precise  
**Status:** Source of truth for visual and interaction decisions

> This document defines presentation, navigation, interaction, accessibility, and responsive behavior. It does not authorize changes to the database schema, API contracts, access-control rules, repayment logic, or payment verification. When this document conflicts with existing financial behavior, preserve the verified financial behavior and flag the conflict before changing it.

---

## 1. Product goals

The app helps five household members record personal spending, share common costs, track purchases made on behalf of another member, and settle repayments without confusing pending claims with money actually received.

### 1.1 Primary user questions

Every signed-in screen should help answer one or more of these questions:

1. What do I owe right now?
2. What are other people supposed to repay me?
3. Which expense or claim needs my action?
4. What did I spend, and what did I buy on someone else's behalf?
5. How do I record or confirm a payment without double-counting it?

### 1.2 Design principles

- **Money first:** amounts, counterparties, due state, and next action should be scannable.
- **Phone first:** design at 360 px before expanding to larger viewports.
- **Quiet surfaces:** warm neutrals, solid fills, subtle separators, and limited elevation.
- **Explicit semantics:** always label “You owe”, “Owed to you”, “Pending confirmation”, and “Settled”.
- **One dominant action:** do not put several competing filled buttons in the same local area.
- **Privacy by default:** never reveal unrelated personal expenses to another member.
- **Progressive disclosure:** show the summary first; reveal line items, references, and history on demand.
- **Truthful status:** a QR scan or self-reported payment is not proof of receipt.
- **Consistent behavior:** the same action, status, or amount should look and behave the same across screens.
- **No decorative product theatre:** no gradients, glow cards, fake activity, animated counters, or unnecessary motion.

### 1.3 Explicit non-goals

- Do not redesign the product as a generic analytics dashboard.
- Do not introduce a new component framework when existing primitives suffice.
- Do not use decorative charts where a labelled amount or short list is clearer.
- Do not calculate authoritative balances only in the browser.
- Do not imply a payment is verified when it is merely reported.
- Do not add sample transactions to production UI.

---

## 2. User roles and visibility contract

There are five household members. Permissions must be enforced by the server; hiding a button is not authorization.

### 2.1 Member capabilities

| Area | Ordinary member | Designated admin |
|---|---|---|
| Own personal expenses | Create, view, edit, delete according to existing rules | Same |
| Other members' unrelated personal expenses | Never visible | Never visible unless explicitly authorized by existing policy |
| Purchases made on behalf of another member | View only the relevant participant records | View only what existing server permissions allow |
| Purchases made for the current member | View their own allocations and repayment state | Same participant-based visibility |
| Common expenses | Read | Create, edit, delete, subject to server authorization |
| Repayments involving the member | View and perform allowed claim actions | Same; admin status must not imply automatic payment confirmation |
| Own profile and UPI details | View and edit own details | View and edit own details |
| Other member's editable UPI details | No editing | No editing unless an existing explicit admin feature allows it |
| Admin settings | Hidden | Visible |

### 2.2 Privacy rules in the interface

- Personal expenses are scoped to the authenticated member.
- “Bought for others” shows purchases the current member recorded and the beneficiaries associated with those records.
- “Bought for me” shows only purchases allocated to the current member.
- A member should not see unrelated items from a different member's private shopping trip.
- Do not put private descriptions, UPI details, or repayment notes in global activity visible to the whole household unless existing authorization explicitly permits it.
- Do not rely on front-end filtering to protect private data.
- After an authorization error, show a safe message and do not expose raw server responses.

---

## 3. Visual direction

### 3.1 Concept: Household Ledger

The visual language should feel like a dependable personal finance tool: grounded, understated, warm, and precise. Use forest green as the brand accent, warm off-white in light mode, deep green-black in dark mode, and restrained semantic colors for financial states.

Avoid:
- Blue/cyan gradient branding and gradient action buttons.
- Neon edges, glows, glassmorphism, blurred blobs, and oversized shadows.
- Every row being wrapped in a separate card.
- Large empty hero regions that push transactions below the fold.
- Excessive pill shapes, letter-spaced all-caps labels, and tiny metadata.
- Decorative animation that makes money figures move or pulse.
- Generic “AI dashboard” visual tropes.

### 3.2 Visual hierarchy

1. **Primary:** current net position, amount due, or action requiring attention.
2. **Secondary:** who the amount relates to, what the expense was, and its date.
3. **Tertiary:** category, reference, helper text, and historical details.
4. **Actions:** one obvious primary action; secondary actions are neutral or text-based.

Use whitespace and typography to establish hierarchy before adding color or borders.

---

## 4. Design tokens

These are canonical starting values. Use semantic CSS variables and Tailwind semantic utilities. Do not hard-code palette values into individual page components unless a data visualization genuinely requires a separate scale.

### 4.1 Light theme

| Token | Value | Intended use |
|---|---|---|
| Canvas | #F6F5F1 | Main page background |
| Surface | #FFFFFF | Cards, sheets, dialogs |
| Surface subtle | #F0EFE9 | Inputs, nested sections, selected neutral rows |
| Surface raised | #FFFFFF | Menus and elevated overlays |
| Text primary | #202821 | Headings, names, main amounts |
| Text secondary | #59645C | Descriptions and metadata |
| Text muted | #727B73 | Tertiary content only |
| Border | #E1E3DB | Separators and default control edges |
| Border strong | #C8CEC4 | Emphasized control boundaries |
| Brand | #285943 | Primary action and active navigation |
| Brand hover | #204A36 | Hover/pressed state |
| Brand soft | #E6EFE8 | Selected state and quiet brand surface |
| Brand on-color | #FFFFFF | Text/icons on brand fill |
| Positive | #23734D | Owed to me, confirmed |
| Positive soft | #E8F4EC | Positive state background |
| Negative | #B63D3D | I owe, destructive action |
| Negative soft | #FBECEC | Debt/destructive background |
| Pending | #96610C | Waiting for recipient confirmation |
| Pending soft | #FFF3D8 | Pending background |
| Info | #3C647C | Informational guidance |
| Info soft | #EAF2F6 | Informational surface |
| Disabled | #A9B0AA | Disabled controls only |

### 4.2 Dark theme

| Token | Value | Intended use |
|---|---|---|
| Canvas | #141915 | Main page background |
| Surface | #1C231D | Cards and sheets |
| Surface subtle | #252D26 | Inputs and nested sections |
| Surface raised | #29332B | Menus and overlays |
| Text primary | #F0F3EE | Main text and amounts |
| Text secondary | #B6C0B6 | Supporting text |
| Text muted | #929E93 | Tertiary information |
| Border | #343E35 | Default separators |
| Border strong | #4B584B | Emphasized controls |
| Brand | #8FBE9F | Primary action and active state |
| Brand hover | #A3CCB0 | Hover/pressed state |
| Brand soft | #263C2D | Selected surface |
| Brand on-color | #15231A | Text/icons on brand fill |
| Positive | #7FC99B | Positive/confirmed text |
| Positive soft | #233A2B | Positive surface |
| Negative | #F08C87 | Debt/destructive text |
| Negative soft | #432828 | Negative surface |
| Pending | #E5B963 | Pending text |
| Pending soft | #41351F | Pending surface |
| Info | #8FB9D0 | Informational text |
| Info soft | #253844 | Informational surface |

### 4.3 Semantic token mapping

Expose semantic tokens such as:

- background, foreground
- card, card-foreground
- popover, popover-foreground
- primary, primary-foreground
- secondary, secondary-foreground
- muted, muted-foreground
- accent, accent-foreground
- border, input, ring
- positive, positive-soft
- negative, negative-soft
- pending, pending-soft
- info, info-soft

The existing theme uses the html.dark class. Keep the existing theme mechanism until light/dark switching is verified end to end. Do not remove the dark class as part of a staged refactor.

### 4.4 Color semantics

| Financial meaning | Semantic treatment | Required text |
|---|---|---|
| Current member owes money | Negative | “You owe” / “Due” |
| Money is owed to current member | Positive | “Owed to you” |
| Payment claim awaits recipient action | Pending | “Pending confirmation” |
| Payment is confirmed | Positive or neutral confirmed treatment | “Confirmed” |
| Repayment is partially complete | Pending/neutral with numeric progress | “Partially paid” |
| Expense is settled | Neutral, visually quieter | “Settled” |
| Destructive action | Negative | Explicit action label |

Never communicate a financial state with color alone. Pair color with text and, where useful, a meaningful icon. Do not color an entire card red or green merely because its amount is a debt or credit.

### 4.5 Contrast

Target WCAG 2.2 AA:
- Normal text contrast: at least 4.5:1.
- Large text: at least 3:1.
- Essential component boundaries and meaningful graphical indicators: at least 3:1 where applicable.

Contrast must be checked for actual token pairs in both themes, not inferred from the palette. Muted text must remain readable on the canvas and surface colors.

---

## 5. Typography

### 5.1 Font families

- **Interface and body:** DM Sans.
- **Amounts, tabular numeric values, and transaction references:** IBM Plex Mono, used selectively.
- **Fallbacks:** Arial, Helvetica, sans-serif; ui-monospace, SFMono-Regular, Consolas, monospace.

Load only the font weights actually used. Prefer self-hosted WOFF2 assets where practical; otherwise use a trusted font provider and font-display: swap. Avoid introducing a third font family.

### 5.2 Type scale

| Role | Mobile size / line height | Weight | Notes |
|---|---|---|---|
| Page title | 24 / 30 px | 650–700 | One clear title per screen |
| Hero balance | 30–32 / 36 px | 600–700 | Main balance only |
| Section title | 17 / 24 px | 600 | Sections and groups |
| Transaction title | 15 / 21 px | 600 | Expense/member label |
| Body | 15 / 22 px | 400–500 | Default text |
| Button | 14 / 20 px | 600 | Action labels |
| Supporting | 13 / 18 px | 400–500 | Dates and descriptions |
| Dense metadata | 12 / 16 px | 400–500 | Secondary data only |
| List amount | 15–18 / 22 px | 600 | Row amount |

### 5.3 Numeric and currency rules

- Use tabular numerals for money to prevent amounts from shifting.
- Use INR consistently: ₹1,250 for ordinary display.
- Show decimal paise only where precision is meaningful, e.g. a payment reference or precise allocation.
- Align amounts to the right in list rows when space permits.
- Never display a bare signed number without a label that clarifies whether it is owed or receivable.
- Long amounts must wrap or scale gracefully without clipping their currency symbol.

---

## 6. Spacing, shape, and elevation

Use a 4 px base spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.

| Element | Standard |
|---|---|
| Mobile page gutter | 16 px; 12 px only below 340 px when necessary |
| Default surface padding | 16 px |
| Prominent summary padding | 20 px |
| Section gap | 24 px |
| Related list row gap | 8–12 px |
| Minimum touch target | 44 × 44 CSS px |
| Preferred primary target | 48 px high |
| Input height | At least 48 px on mobile |
| Standard card radius | 12 px |
| Sheet/dialog radius | 16 px |
| Default border | 1 px neutral |
| Desktop content max width | About 1120 px |

Use cards only when they group related content. Prefer dividers within a surface over nested cards. Use shadows sparingly for sheets, menus, and dialogs; do not apply a decorative shadow to every card. Avoid making every control a pill.

For fixed bottom navigation and sticky actions:
- Respect safe-area insets.
- Reserve bottom content padding so the final list row is not hidden.
- Never let a fixed action cover form errors or the last input.
- Avoid horizontal overflow on narrow devices.

---

## 7. Responsive behavior

### 7.1 Breakpoints and layout

| Viewport | Required behavior |
|---|---|
| 320–359 px | Single column, 12 px gutter, no side-by-side balance cards |
| 360–430 px | Primary design target; 16 px gutter, bottom nav, full-width forms |
| 431–767 px | Wider phone layout; retain bottom navigation and simple task flows |
| 768–1023 px | Tablet layout; compact rail or adaptive navigation if useful |
| 1024 px and above | Desktop sidebar, constrained content, desktop tables where appropriate |
| 1280 px and above | Keep readable max width; do not stretch lists or forms edge to edge |

Test at 320, 360, 390, 430, 768, 1024, and 1280 px widths.

### 7.2 Mobile layout rules

- Single-column forms and transaction lists.
- Use a mobile Sheet for filters and multi-select tasks.
- Convert table content to purpose-built list rows/cards on phones.
- Do not rely on horizontal scrolling to make desktop tables usable.
- Keep the most important amount and action visible without expanding a row.
- Keep forms reachable with one hand and primary actions near the lower screen where appropriate.
- Long names, descriptions, UPI IDs, and references must wrap, truncate with an accessible full-value route, or provide copy actions.

### 7.3 Desktop layout rules

- Retain a left sidebar with clear active navigation.
- Constrain the content column to a readable maximum width.
- Use tables only when column comparison provides real value.
- Align currency columns and keep row actions consistent.
- Do not make the desktop experience merely a stretched mobile page.

---

## 8. Navigation architecture

### 8.1 Authenticated mobile bottom navigation

Five destinations, always in this order:

1. **Home** — net position, quick actions, recent activity.
2. **Expenses** — personal expenses and “Bought for others”.
3. **Balances** — “You owe” and “Owed to you”.
4. **Repayments** — claims requiring action, pending items, history.
5. **More** — common expenses, “Bought for me”, profile/UPI, admin settings, sign out.

Requirements:
- Use a compact Lucide icon and visible text label.
- Active state uses the brand color and a quiet selected indicator.
- Keep touch targets at least 44 px.
- Add safe-area padding.
- Mark the active destination semantically for assistive technology.
- Ensure page content can scroll behind neither the navigation nor a sticky CTA.
- Do not let the voice assistant replace a primary navigation destination.

### 8.2 Mobile header

- Show current screen title and optional household context.
- Allow at most one utility action.
- Avoid repeating the product logo, username, and multiple utility icons on every screen.
- Check that a page title is not duplicated between the shell and page body.

### 8.3 More menu

Use a simple sheet or dedicated screen, grouped as:

**Household**
- Common expenses
- Bought for me

**Account**
- Profile and UPI
- Admin settings, only for the designated admin

**Session**
- Sign out

Each row includes one icon, a clear label, optional supporting text, and a chevron. Close the sheet after navigation. Do not show disabled admin actions to ordinary members unless there is a clear explanatory reason.

### 8.4 Desktop sidebar

- Keep navigation labels visible, not icon-only by default.
- Use a clear active item state without a gradient.
- Group household features separately from account/session actions.
- Show admin-only links only for the authorized role.
- Keep sign out separate from high-frequency transaction destinations.

---

## 9. Shared component specifications

### 9.1 Buttons

Variants:
- **Primary:** solid brand fill for the main local action.
- **Secondary:** neutral surface and border.
- **Tertiary/ghost:** low-emphasis action.
- **Destructive:** semantic negative color.
- **Icon:** only when the icon is recognizable and the control has an accessible name.

Rules:
- Minimum 44 px high; 48 px preferred for main mobile form actions.
- Use concise verb-led labels: “Add expense”, “Save expense”, “Confirm receipt”.
- Include disabled, loading, hover, focus, and pressed states.
- Prevent duplicate submissions while a request is in progress.
- Do not use gradient fills, permanent glow shadows, or scale animation on press.
- Loading must not cause the button width to jump.
- Destructive confirmation should identify the item being changed.

### 9.2 Cards and surfaces

- Group related data only.
- Use solid backgrounds, subtle borders, and predictable padding.
- Prefer one summary surface followed by dividers/list rows over a grid of equal metric cards.
- Avoid nested cards; use section labels and separators.
- A card that is clickable must have an obvious interactive affordance and keyboard behavior.

### 9.3 Transaction row

A standard row should contain:
1. Optional restrained category/status icon.
2. Primary title.
3. Secondary line for counterparty/date/category.
4. Right-aligned amount.
5. Optional status label or trailing action.

Rules:
- Use 15 px primary text and at least 12 px metadata.
- Keep amount visible without requiring a tap.
- Avoid more than two lines of secondary copy in a compact row.
- Separate unrelated actions into a menu or detail screen.
- Use dividers rather than a border and shadow around every row.

### 9.4 Amount presentation

A reusable amount pattern must accept:
- Amount value.
- Meaning/label (You owe, Owed to you, My share, Total, Remaining).
- Optional status.
- Currency precision rule.

It must not infer meaning from a positive or negative sign alone. Use server-provided canonical amounts for balances.

### 9.5 Status badge

Standard labels:
- Due
- Pending confirmation
- Confirmed
- Rejected
- Cancelled
- Partially paid
- Settled

Do not substitute vague labels such as “Success” or “Complete” if they hide the financial meaning. Keep badges compact, readable, and free of shadows. Status must be expressed in text as well as color.

### 9.6 Inputs and forms

- Every field has a persistent visible label.
- Placeholder text is an example, never the only label.
- Show validation errors next to the relevant field.
- For long forms, include an accessible summary when submission fails.
- Use numeric input mode for currency and numeric references when appropriate.
- Preserve entered values after validation or network failure.
- Explain required fields before submission.
- Use inline help only when it resolves a real ambiguity.
- Avoid autofocus that unexpectedly opens the mobile keyboard over important context.
- Disable only the controls that truly cannot be used while saving.

### 9.7 Tabs and segmented controls

Use a segmented control when switching between closely related views, e.g. Personal and Bought for others. It should:
- Fit on 320 px screens.
- Keep all labels visible.
- Show a clear selected state and accessible selection semantics.
- Preserve relevant filters only when doing so is understandable.
- Avoid a horizontal scrolling tab strip for two or three short labels.

### 9.8 Sheets, dialogs, and detail views

Use a mobile Sheet for filters, beneficiary selection, and compact tasks. Use a Dialog for focused confirmations. Use a full-screen detail view when content is too complex for a small modal.

Every overlay needs:
- Clear title and close/back action.
- Correct focus handling.
- Escape-key behavior on desktop.
- Scrollable content when needed.
- Safe-area awareness on mobile.
- A clear distinction between cancel and destructive confirmation.

Do not hide frequently revisited information exclusively in a modal.

### 9.9 Feedback

- Success: concise and truthful.
- Error: explain what failed and the next useful step.
- Pending: explicitly state that another person or verification process still needs to act.
- Offline/network failure: preserve form state and offer retry where safe.
- Do not announce success before the server confirms the mutation.

---

## 10. Screen specifications

### 10.1 Sign in

**Goal:** get an invited household member into the app with minimal friction.

Layout:
- Plain canvas, compact form surface, small brand mark.
- Heading: “Sign in to your household”.
- Supporting text: access is limited to invited members.
- Persistent username and password labels.
- Password visibility toggle with accessible name.
- Full-width primary “Sign in” button.
- Quiet security/privacy note.

Behavior:
- Keep username after failure.
- Display a clear inline authentication error without leaking account existence or raw server details.
- Show loading state and prevent duplicate submits.
- Use proper autocomplete attributes.
- Do not add large ambient gradients or oversized decorative art.

States: initial, field validation error, invalid credentials, server unavailable, submitting, successful redirect.

### 10.2 Home / dashboard

**Goal:** communicate the member's position and the next useful action immediately.

Content order:
1. Compact greeting and household context.
2. One net-position summary.
3. Two explicit totals: “You owe” and “Owed to you”.
4. Quick actions: “Add expense” and “Settle up”.
5. Optional concise spending overview: personal spending, common share/paid, bought for others.
6. Actionable balances/debts and credits.
7. Recent activity.

Rules:
- Do not lead with four equal-weight metric cards.
- Keep one clear summary; supporting values should be smaller.
- Debts and credits must be separate and labelled.
- Hide voice actions on small screens if the shell already exposes the action; avoid duplication.
- Show only records the member is authorized to see.

States:
- Loading skeleton that matches the final layout.
- Empty household/activity state with one useful next step.
- Summary request error with retry.
- Partial data error should not imply that missing totals are zero.
- Populated state with real server data.
- Long names and large amounts must not overflow.

### 10.3 Expenses landing screen

**Goal:** help the member find and manage their own expenses or purchases they made for others.

Top region:
- Title “Expenses”.
- Primary “Add expense” action.
- Segmented control: **Personal** / **Bought for others**.
- Filter action with active-filter count.

List row:
- Description.
- Category/date.
- Amount paid by the current user.
- For on-behalf items, beneficiary and amount still owed as separate facts.
- Optional status.

Filters:
- Member/beneficiary where relevant.
- Date: day, week, month, custom range.
- Category.
- Expense type.
- Status.
- Search.
- Active filters appear as removable chips; include “Clear all”.
- On mobile, filters open in a Sheet instead of squeezing many controls into one row.

States: loading, empty, filtered-empty, error/retry, populated, offline/stale where supported.

### 10.4 Add or edit a personal expense

Field order:
1. Amount (₹ prefix; decimal/numeric input mode).
2. Description.
3. Date.
4. Category.
5. Optional note.
6. Save action.

Rules:
- Owner is derived from the authenticated session; do not ask the member to choose themselves.
- Use a single-column form.
- Keep a 48 px input target on mobile.
- Place validation beside the field.
- Preserve values on server errors.
- Ask for confirmation before discarding a populated form.
- Editing/deletion controls must follow existing permission and business rules.

States: pristine, invalid amount, required field missing, saving, saved, network failure, stale record/conflict if applicable, delete confirmation.

### 10.5 Bought for others

**Goal:** record a trip or purchase with one or more items and clear per-person allocations.

Form order:
1. Trip/title and date.
2. Item list.
3. Per item: description, amount, beneficiary, optional category/quantity.
4. Running total.
5. Allocation summary: “My share” and “Others owe”.
6. Save action.

Interaction:
- Each item is a compact editable section on mobile.
- Beneficiary selection is touch-friendly and clearly identifies each person.
- Show each beneficiary's total, not just one aggregate.
- Keep the current member's own share distinct from others' shares.
- Allow edit/remove with accessible labels.
- Update preview as inputs change, but mark unsaved changes clearly.
- Confirm before discarding a populated form.

Financial integrity:
- Use the server's canonical allocation rules.
- Currency calculations use integer paise or the existing exact-money representation.
- If the product allows split amounts, make the allocation method explicit.
- Rounding remainder handling must be deterministic and explainable.
- Do not present a locally previewed allocation as an authoritative settled balance.

### 10.6 Bought for me

**Goal:** let the member understand what others bought for them and what remains to repay.

Lead with:
- Total remaining amount the current member owes for these purchases.
- Number of outstanding items, if available.

Each row shows:
- Who paid.
- What was bought.
- My share.
- Amount already confirmed as repaid.
- Remaining due.
- Clear “Repay” or “View details” action when appropriate.

Behavior:
- Show item-level details on demand.
- Settled items are quieter but remain accessible in history.
- Do not show purchases unrelated to the current member.
- Pending repayment claims must not reduce the confirmed outstanding amount until the existing canonical rules say they should.

States: loading, no purchases, nothing due, outstanding items, partially paid items, error/retry.

### 10.7 Common expenses

**Member view:** each row shows expense name/date, total, current member's share, payer, and status. Tap to see the split.

**Admin creation/edit flow:**
- Description.
- Total amount.
- Category and date.
- Payer.
- Participant selector.
- Split method: equal, custom amount, percentage, or selected members.
- Live preview of every member's share.
- Explicit handling of rounding remainder.
- Confirm/save action.

Rules:
- Only the designated admin sees create/edit/delete controls.
- Server authorization remains authoritative even when the UI hides controls.
- Do not silently rewrite confirmed repayment history when an expense is edited.
- Show a warning or explicit correction workflow if an edit affects existing allocations or repayments.
- Confirm destructive deletion and identify the expense.

States: no common expenses, loading, populated, admin edit, validation error, save error, deletion confirmation, split mismatch, settled/unsettled.

### 10.8 Balances

**Goal:** make debts and credits unambiguous.

Top:
- Compact net-position summary.
- Supporting totals for “You owe” and “Owed to you”.
- Any existing filters needed for member/status.

Sections:
- **You owe** — members the current user needs to pay.
- **Owed to you** — members who need to pay the current user.

Each member row:
- Member name/avatar or initials.
- Outstanding amount.
- Short context if available.
- Relevant next action.

Rules:
- Do not use a debt graph as the primary UI.
- Do not merge debts and credits into an unlabeled signed amount.
- Do not count pending claims as confirmed transfers.
- If both sections are empty, show “All settled” and a calm empty state.
- Use server-derived balances and existing balance logic.

States: loading, error/retry, all settled, owe-only, owed-only, both sections populated.

### 10.9 Repayments

**Goal:** help users submit, verify, and resolve claims without mistaking a claim for confirmed money.

Top:
- Count or summary of claims requiring action.
- Segmented views: “Needs action”, “Pending”, “History”.

Each repayment item/detail:
- Payer and recipient, explicitly labelled.
- Amount and remaining balance.
- Payment method and date.
- UPI ID/QR only where relevant.
- Optional reference/UTR.
- Current status.
- Actions permitted for the current participant.

UPI flow:
1. Display recipient name, UPI ID, amount, and QR together.
2. Provide “Copy UPI ID” and “Open UPI app” only if implemented and supported.
3. Explain that the recipient must confirm receipt unless the payment is independently verified by the payment provider.
4. Allow the payer to submit a claim/reference through the existing flow.
5. Show the recipient clear confirm/reject actions when authorized.
6. Require confirmation for accepting or rejecting a claim.
7. Refresh the canonical balance after a successful server mutation.

Critical truthfulness rule:
- QR generation does not verify payment.
- “I’ve paid” is a claim, not proof.
- Never show “Payment successful” until actual server-side verification or recipient confirmation has occurred.
- Keep pending amounts visibly pending and do not present them as received.
- Preserve the existing claim/confirm/reject API behavior.

States: no repayments, needs action, submitted/pending, confirmed, rejected, cancelled, partially paid, settled, server error, mutation in progress.

### 10.10 Profile and UPI

Sections:
- Account information.
- UPI payment details.
- Theme preference only if supported by the application.
- Sign out.

UPI fields:
- Display name.
- UPI ID.
- QR preview.
- Save/update and remove actions.
- Verification note.

Rules:
- Users can edit only their own profile and UPI data.
- Clearly label UPI details as unverified unless a real verification process exists.
- Validate format without claiming that format validation proves ownership.
- Show a preview before saving.
- Preserve historical recipient information for old payment records when profile details change, as required by the existing data model.
- Do not expose secrets or sensitive configuration values in the UI.

States: loading, existing profile, no UPI configured, invalid UPI format, save in progress, saved, server failure, remove confirmation.

### 10.11 Voice assistant

Voice is a convenience, not the product identity.

- Remove the permanently animated gradient floating CTA.
- Keep the microphone action secondary on Home or inside Add expense.
- Show permission, recording, processing, review, and failure states explicitly.
- Use a simple recording indicator; no continuous pulse while idle.
- Require users to review and edit parsed fields before saving.
- If recognition fails, preserve captured text when possible and offer manual entry.
- Disclose relevant data handling before sending expense details to an AI provider.
- Never save an expense from uncertain speech recognition without a review/confirmation step.

### 10.12 Common empty, error, and system states

Every data-backed page needs the following states as relevant:

- **Loading:** skeletons that preserve layout and avoid large jumps.
- **Empty:** explain what belongs here and offer one useful action.
- **Filtered empty:** say that no records match the current filters and offer “Clear filters”.
- **Error:** plain-language explanation and retry when safe.
- **Permission denied:** safe message, no private record details.
- **Offline/network failure:** preserve unsaved values; do not duplicate a mutation on retry.
- **Submitting:** disable only conflicting actions and show progress.
- **Stale data:** refresh or explain that data may be outdated where the app supports it.
- **Pending:** explain who needs to act next.
- **Partial/settled:** show the remaining amount and confirmed history.

---

## 11. Filters and search

Filters should be consistent across applicable expense and repayment screens.

Supported dimensions where relevant:
- Member/beneficiary.
- Payer.
- Date: day, week, month, custom range.
- Category.
- Expense type.
- Status.
- Text search.

Interaction contract:
- Open a mobile Sheet from a clear Filter action.
- Show active filter count.
- Apply and Clear all actions must be obvious.
- Show active filters as removable chips.
- A filtered-empty state should offer a one-tap way to clear filters.
- Date ranges should display their selected start/end dates.
- Preserve filter state only when navigating back to a closely related detail/list view and when doing so is not confusing.
- Filtering must respect server authorization; filters must never broaden the set of records a user can access.

---

## 12. Financial display and interaction rules

This section is a UI safety contract.

- Display authoritative balances from the existing server/API source.
- Use integer paise or the existing exact-money representation for calculations; never use floating-point display arithmetic as the source of truth.
- Use consistent INR formatting across every screen.
- Clearly separate total, current member's share, amount repaid, and amount remaining.
- Do not double-count a repayment because a claim was submitted twice.
- Do not visually imply that a pending claim reduced the confirmed debt unless the canonical backend model explicitly defines it that way.
- Use idempotent server operations where already supported; the UI must prevent accidental duplicate submissions.
- Confirm destructive or financially meaningful actions.
- Show success only after the server reports success.
- After a mutation, refresh or invalidate the relevant queries using the existing TanStack Query patterns.
- Never invent a fallback balance when an API request fails. Show an error state rather than ₹0.
- Keep payment method and recipient details clear at the point where the user needs them.
- QR and UPI details facilitate payment; they do not prove receipt.

---

## 13. Accessibility and motion

Target WCAG 2.2 AA.

- Use semantic heading order and real form labels.
- Give icon-only buttons accessible names.
- Mark decorative icons as hidden from assistive technology.
- Make all interactive actions keyboard accessible on desktop.
- Use visible focus rings with sufficient contrast.
- Announce asynchronous status and validation errors accessibly.
- Do not rely on hover for essential information.
- Support 200% text zoom without clipping amounts or primary actions.
- Support reduced-motion preferences.
- No animated balance counting, constant pulse, parallax, confetti, or decorative entrance sequences.
- Maintain readable touch targets and spacing.
- Do not communicate errors, debt, credit, or pending state by color alone.
- Ensure bottom navigation and sticky actions do not obscure focus or content.

Device verification:
- Android Chrome.
- iOS Safari where available.
- Narrow devices at 320–360 px.
- Keyboard-open form states.
- Safe-area behavior on phones with gesture navigation.

---

## 14. Motion and feedback

Motion is functional only.

Allowed:
- Small opacity/position transitions for opening and closing a sheet.
- Short hover/focus transitions.
- Skeleton shimmer only if it respects reduced motion and is not visually distracting.
- Clear progress indicator during a request.

Avoid:
- Springy/elastic card motion.
- Repeated or idle pulsing.
- Animated currency counting.
- Large parallax effects.
- Confetti after recording a payment.
- Scale-down effects on every button tap.
- Long entrance animations that delay access to the list.

Respect prefers-reduced-motion. When reduced motion is active, remove nonessential transitions and animation.

---

## 15. Iconography and imagery

- Use the installed Lucide icon set.
- Keep icon size and stroke weight consistent within the same component class.
- Prefer 18–20 px icons in navigation/list rows and 20–24 px for prominent actions.
- Always pair critical icons with visible labels.
- Do not introduce stock photography, illustrations, or decorative imagery where transaction data is the product.
- Use initials or a simple neutral avatar when no member image exists.
- Do not rely on emoji as the primary icon system.

---

## 16. Technical implementation contract

### 16.1 Preserve the existing architecture

- Continue using the existing React, TypeScript, Vite, Tailwind, Radix/shadcn-style components, Lucide, TanStack Query, Express, Neon, and Drizzle setup.
- Do not introduce another UI framework.
- Confirm that a primitive exists before importing it; do not assume every shadcn/Radix component is installed.
- Use the existing design tokens and shared components before creating duplicates.
- Keep styling changes focused and reviewable.

### 16.2 State and data

- Preserve API endpoints and payload shapes during visual refactors.
- Preserve TanStack Query keys and existing mutation behavior.
- Keep authorization on the server.
- Do not derive canonical balances only on the client.
- Do not put private member data in global client state if the existing query boundaries avoid that exposure.
- Ensure loading/error/empty states do not masquerade as valid zero-value financial data.
- Use accessible labels and stable keys for list items.

### 16.3 CSS and Tailwind

- Define theme colors in semantic CSS variables in src/index.css.
- Use Tailwind semantic classes in pages and shared components.
- Gradually replace hard-coded slate/blue/cyan utilities where they conflict with this design system.
- Retain compatibility aliases that existing components still depend on until their usage has been audited.
- Do not perform broad blind replacements that change status semantics or component behavior.
- Keep focus, reduced-motion, and safe-area styles centralized where practical.

### 16.4 Performance

- Prefer existing dependencies over adding new ones.
- Avoid shipping a large animation library for small transitions.
- Lazy-load genuinely separate heavy routes or tools when the current app architecture supports it.
- Do not split code in a way that breaks direct route loading.
- Preserve loading states during lazy loading.
- Check the production bundle report after meaningful dependency or route changes.
- Use stable list rendering and avoid unnecessary re-renders of long transaction lists.

### 16.5 Security boundary

This is a design spec, not a substitute for backend security review.

- Server-side authorization is mandatory for personal expenses, common-expense admin actions, profiles, and repayment actions.
- Never expose server secrets or privileged database credentials to browser code.
- Never trust client-provided payer, beneficiary, member ID, balance, or confirmation status without server validation.
- Do not mark payment confirmed from QR display, client callbacks, or self-report alone.
- Show safe errors; do not display stack traces, SQL errors, or sensitive response payloads.
- Keep role-based UI aligned with server permissions, but treat it as convenience only.

---

## 17. Implementation sequence

### Phase 1 — Foundations
1. Audit existing tokens and component variants.
2. Establish semantic light/dark colors.
3. Apply DM Sans and IBM Plex Mono with fallbacks.
4. Normalize focus rings, button sizes, form controls, and radii.
5. Standardize amount and status components.
6. Remove gradient/glow styling from shared high-visibility components.

### Phase 2 — Mobile shell
1. Implement persistent five-item bottom navigation.
2. Implement More as a sheet or screen.
3. Add safe-area and content-bottom padding.
4. Simplify the mobile header and eliminate duplicated page titles.
5. Keep voice actions secondary.
6. Verify desktop sidebar behavior and admin-only links.

### Phase 3 — Core finance screens
1. Dashboard.
2. Balances.
3. Repayments and UPI confirmation flow.
4. Expenses landing page and Personal/Bought for others switch.
5. Add/edit personal expense.
6. Bought-for-others item and beneficiary allocation.
7. Bought-for-me list and details.
8. Common expenses and admin split editor.
9. Profile and UPI.
10. Sign in and remaining system states.

### Phase 4 — Filters and responsive patterns
1. Add mobile filter Sheet.
2. Add removable active-filter chips and Clear all.
3. Convert wide data tables to phone-first list patterns.
4. Test long names, large amounts, and long UPI references.
5. Check fixed navigation and sticky actions against safe areas.

### Phase 5 — Accessibility and validation
1. Check semantic labels and keyboard/focus behavior.
2. Test contrast in both themes.
3. Test reduced-motion settings and 200% zoom.
4. Verify all loading/empty/error/pending/partial/settled states.
5. Run typecheck and production build.
6. Verify routes load directly and navigation remains correct.
7. Compare screenshots at 360 px and 390 px.
8. Verify that visual changes did not alter APIs, financial logic, or access control.

### Safe implementation workflow

For each screen:
1. Read the current component and relevant shared primitives.
2. Record the existing API calls, query keys, mutations, and permission checks.
3. Refactor layout and styling without changing those contracts.
4. Inspect the diff for unintended logic changes.
5. Run typecheck and build.
6. Check the screen at narrow and desktop widths.
7. Test the important user flow and all relevant states before moving on.

Do not edit many unrelated files with broad replacements in one pass. If a change affects financial behavior, stop and review it separately from the visual refactor.

---

## 17A. Complete screen-by-screen implementation matrix

This matrix is the delivery checklist for the whole interface. Implement the full matrix in a single coordinated design pass rather than treating each screen as a separate approval request.

| Screen / area | Required finished state | Required responsive behavior | Required states |
|---|---|---|---|
| App shell | One consistent header, navigation, page width, focus behavior, and session actions | Five-item bottom navigation on phones; labelled sidebar on desktop; safe-area padding | Loading session, signed out, forbidden, network failure |
| Dashboard | Net position, “You owe”, “Owed to you”, personal spending, common share, paid on behalf of others, actionable balances, recent authorized activity | Summary first; compact rows; avoid metric-card grid overload | Initial load, retryable error, no expenses, no balances, partial data |
| Personal expenses | Create/list/delete according to current API; date/category/amount/notes; no effect on other members' debts | Mobile cards, desktop table only when useful, filter sheet on phone | Loading, empty, invalid form, mutation pending, success, failure |
| Bought for others | Purchaser's records, item-level beneficiary allocation, confirmed and outstanding amounts, clear paid-by/for distinction | Item breakdown collapses naturally; beneficiary and amount remain visible | Loading, empty, delete confirmation, partial repayment, settled |
| Bought for me | Only current member's allocations, purchaser identity, personal share, confirmed repayments, amount remaining | Clear “Paid by” and “My share”; compact item list; reachable repay action | Loading, empty, due, partial, settled, unavailable record |
| Common expenses | Admin-only mutation controls; payer, participants, split type, allocation preview and totals | Stepwise mobile form; allocation summary must not obscure fields | Loading, empty, unauthorized, split validation, save pending/failure |
| Balances | Canonical current-user debt and credit, counterparties, open obligations and progress | Separate “You owe” and “Owed to you”; no horizontal scrolling | Loading, retry, no outstanding items, partial settlement |
| Repayments | Cash/UPI claim, full or partial amount, optional reference, recipient confirm/reject, immutable history | Mobile-friendly dialog/sheet, QR and amount visible together, touch targets ≥44 px | Draft, submitting, pending confirmation, confirmed, rejected, cancelled, error |
| Profile & UPI | Edit own profile and own UPI ID; preview QR; copy ID; remove with confirmation | Single-column fields, persistent labels, safe save action | Loading, saved, validation error, missing UPI ID, API error |
| Filters and search | Combine member, payer, beneficiary, category, type, status, period, amount, text; clear all | Sheet on mobile, toolbar on desktop, active chips | No results, active filters, loading, server error |
| More / admin | Common expenses, Bought for me, Profile/UPI, admin-only settings, sign out | Accessible sheet on mobile; grouped sidebar on desktop | Open/closed, unauthorized, sign-out pending/error |
| Voice assistant | Optional secondary utility, never replaces navigation or core expense form | Keep it out of the primary bottom-nav hierarchy | Permission denied, unsupported, listening, parsed preview, cancel, error |

### Complete cross-screen interaction contract

- Every visible control must work, have a clear disabled/loading state, and provide a visible focus state.
- Every form must have persistent labels, inline validation, duplicate-submit prevention, and a safe retry path.
- Every destructive action must identify the target and require confirmation when it can delete financial history.
- Every list must define loading, empty, filtered-empty, error, and populated states.
- Every financial status must have explicit text; color and icons are supplementary only.
- Every mutation must invalidate relevant query caches without mixing user-scoped records.
- Never expose raw stack traces, SQL errors, secrets, private descriptions, or raw server responses in UI errors.
- Preserve existing backend endpoints, authorization behavior, balance formulas, settlement mutations, and schema unless a separately reviewed correctness/security defect requires a change.
- Use semantic design tokens across all screens; do not leave legacy hard-coded palette colors in touched components when an equivalent token exists.
- Do not add mock activity, fake balances, invented QR success states, or placeholder production records.

### Visual QA matrix

Review at widths 320, 360, 390, 430, 768, 1024, and 1280 px. Verify no horizontal overflow; bottom navigation does not cover content; dialogs fit dynamic viewport height; long descriptions and UPI IDs do not overlap amounts; touch targets are at least 44 × 44 px; focus indicators remain visible; and loading, error, and empty states retain consistent spacing.

## 18. Acceptance checklist

### Visual consistency
- [ ] Forest-green brand accent and warm neutral surfaces are used consistently.
- [ ] No gradient/glow treatment remains on primary navigation or actions.
- [ ] DM Sans is used for interface text and IBM Plex Mono for numeric alignment where appropriate.
- [ ] Amounts use tabular numerals and consistent INR formatting.
- [ ] Status labels and colors match the semantic mapping.
- [ ] Cards group related information rather than wrapping every row.

### Mobile usability
- [ ] Core flows work at 320, 360, 390, and 430 px.
- [ ] Bottom navigation remains visible and does not obscure content.
- [ ] Main touch targets are at least 44 px; primary form actions are preferably 48 px high.
- [ ] No horizontal overflow at 320 px.
- [ ] Forms use one column and preserve values after errors.
- [ ] Filters work in a phone-friendly sheet.
- [ ] The last list item and submit action remain reachable above safe-area/navigation UI.

### Financial clarity
- [ ] “You owe” and “Owed to you” are always explicit.
- [ ] Total, share, paid, and remaining are not conflated.
- [ ] Pending claims are not displayed as confirmed transfers.
- [ ] QR and “I’ve paid” actions do not imply verification.
- [ ] Success is shown only after the server confirms the mutation.
- [ ] An API error never turns a missing balance into ₹0.

### Privacy and permissions
- [ ] A member cannot see unrelated personal expenses.
- [ ] Bought-for-me and bought-for-others lists are participant-scoped.
- [ ] Common-expense creation/edit/delete controls are admin-only in the UI.
- [ ] Server authorization remains the actual enforcement layer.
- [ ] UPI profile editing is limited to the profile owner under existing policy.
- [ ] Safe errors do not expose private or technical internals.

### Accessibility
- [ ] WCAG 2.2 AA contrast is checked for actual token pairs.
- [ ] Keyboard focus is visible.
- [ ] Icon-only controls have accessible names.
- [ ] Errors and async status are accessible.
- [ ] Reduced-motion preferences are honored.
- [ ] Essential actions and status never depend on hover or color alone.
- [ ] Text zoom does not clip essential amounts or actions.

### Engineering quality
- [ ] Existing API contracts and query keys are preserved.
- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] Direct route loading works.
- [ ] No new dependency is added without a concrete need.
- [ ] No sample financial records are introduced.
- [ ] High-risk repayment and role-based flows are tested after refactoring.

---

## 19. Definition of done

The design is complete when the Home, Balances, Repayments, Add expense, Bought for others allocation, Bought for me, Common expense split, Profile/UPI, and Sign in screens have been checked on a real device or emulator.

Review each with:
- Empty data.
- Typical data.
- Long member names and descriptions.
- Large currency values.
- Pending and rejected claims.
- Partially paid and settled records.
- Validation errors.
- Network/server failure.
- Role-restricted actions.
- A narrow 320 px viewport.
- Keyboard open and safe-area behavior.

The finished product should feel quiet, dependable, and easy to use with one hand. If a visual treatment does not improve comprehension, navigation, or feedback, remove it.

**Change-control rule:** any proposal that alters access permissions, balance calculations, settlement semantics, payment verification, or API contracts must be reviewed as a separate product/engineering change rather than being bundled into a visual redesign.
