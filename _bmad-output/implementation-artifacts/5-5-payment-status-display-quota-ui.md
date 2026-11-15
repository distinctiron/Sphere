# Story 5.5: Payment Status Display & Billing UI

Status: review

> **Design change (2026-11-15).** This story originally described an article-quota display ("5 articles remaining", low-quota warnings, disabling processing). The article quota has been replaced by metered AI usage in euros (see Stories 5.3 and 5.4), so the UI now shows the billing tier, wallet balance, subscription state and recent usage. The old `components/quota/quota-display.tsx` and `/api/quota` were removed. The acceptance criteria below describe the implemented design.

## Story

As a logged-in user,
I want to see my plan, balance and what my AI usage costs,
so that I always know what I can use and when I need to top up or subscribe.

## Acceptance Criteria

1. **Given** I am logged in
   **When** I open the billing section of my account page (`/profile#billing`)
   **Then** I see my tier (Free, Pay as you go, or Sphere Unlimited) and my wallet balance in euros
   **And** amounts under one cent are shown with four decimals, so small charges stay visible

2. **Given** I am a subscriber
   **When** I view the billing section
   **Then** I see the subscription status, the renewal date (or end date when it cancels at period end)
   **And** a fair-use progress bar for the current billing period
   **And** a "Manage billing" button that opens the Stripe Customer Portal

3. **Given** I want to pay
   **When** I view the billing section
   **Then** I can top up the wallet with €5, €10 or €25 (pay as you go, 2× model cost per call)
   **And** I can subscribe to Sphere Unlimited at €10/month, unless I already have a subscription

4. **Given** I have used AI features or made payments
   **When** I view the billing section
   **Then** a Recent activity list shows my last 20 usage events (feature and amount charged, or "Included" for subscription calls)
   **And** my last 10 completed or failed payments

5. **Given** an AI call is refused
   **When** the API responds with 402 (`FREE_TIER`, `INSUFFICIENT_BALANCE` or `FAIR_USE_REACHED`)
   **Then** Deep Dive chat, Intellisense and the lesson tutor show an inline upgrade notice with the reason and a link to `/profile#billing`
   **And** chat and tutor restore the text I typed
   **And** signed-in free users who open `/learn` see a payment wall instead of the tutorials

6. **Given** I return from Stripe Checkout
   **When** the success page loads
   **Then** it polls `/api/billing` (every 1.5 s, up to 20 s) until the top-up is completed or the subscription is active, then confirms
   **And** if confirmation takes longer it says so (for example, when the local webhook listener isn't running)

## Tasks / Subtasks

- [x] Task 1: Billing data API (AC: 1, 2, 4)
  - [x] `GET /api/billing`: account, recent usage events, recent payments
  - [x] `useBilling()` hook, labels and `goToStripe()` in `components/billing/use-billing.ts`
- [x] Task 2: Billing status (AC: 1, 2)
  - [x] `components/billing/billing-status.tsx`: tier, balance, subscription line, fair-use bar, portal button
- [x] Task 3: Payment options and activity (AC: 3, 4)
  - [x] `components/payment/top-up-selector.tsx`
  - [x] `components/payment/payment-page.tsx`: plan cards and Recent activity, rendered on `app/profile/page.tsx`
- [x] Task 4: Denials and walls (AC: 5)
  - [x] `components/billing/upgrade-notice.tsx` (`readBillingDenial`, `UpgradeNotice`)
  - [x] 402 handling in `deep-dive-panel.tsx`, `intellisense-popover.tsx`, `tutor-panel.tsx`, `dashboard-content.tsx`
  - [x] `components/payment/payment-wall.tsx` and the free-tier wall in `app/learn/layout.tsx`
- [x] Task 5: Checkout return (AC: 6)
  - [x] Polling confirmation in `app/payment/success/page.tsx`

## Dev Notes

**Key files:**
- `app/api/billing/route.ts`
- `components/billing/use-billing.ts`, `billing-status.tsx`, `upgrade-notice.tsx`
- `components/payment/payment-page.tsx`, `top-up-selector.tsx`, `payment-wall.tsx`
- `app/profile/page.tsx`, `app/learn/layout.tsx`, `app/payment/success/page.tsx`

**Money formatting:** balances are stored as micro-euros (BigInt, 1 EUR = 1,000,000) and sent to the client as strings; `formatEurMicros` and `formatEurCents` in `lib/billing/plans.ts` format them (locale `en-IE`).

**Removed:** `components/quota/quota-display.tsx`, `components/payment/credit-package-selector.tsx`, `app/api/quota/route.ts`.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.5] - Original story requirements (article-quota design, superseded as described above)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5

### Implementation Notes

- Verified end to end against Stripe test mode, with screenshots of the profile billing section; free users get 402 `FREE_TIER` from AI routes and the payment wall on `/learn`.
- Also fixed a global button bug: `.sk-bsw` in `app/globals.css` now has `z-index: -1`, so the brush stroke no longer hides primary button labels.
