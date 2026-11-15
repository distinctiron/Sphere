# Story 5.4: Subscription Plan Management

Status: review

> **Design change (2026-11-15).** This story originally described a subscription for "unlimited article processing" (`plan_type = "subscription"`, `articles_remaining = -1`). The article quota has been replaced by metered AI usage in euros: free users get news only, pay-as-you-go users spend a prepaid wallet at 2× model cost (Story 5.3), and subscribers pay a flat €10/month for AI use up to a fair-use cap. The acceptance criteria below describe the implemented design.

## Story

As a logged-in user,
I want to subscribe to Sphere Unlimited for €10 a month,
so that I can use paper chat, Intellisense, tutorials and the lesson tutor without watching a per-call balance.

## Acceptance Criteria

1. **Given** I want to subscribe
   **When** I open the billing section of my account page (`/profile#billing`), or follow a payment wall or upgrade notice there
   **Then** I see the Sphere Unlimited plan at €10.00/month next to the pay-as-you-go option
   **And** what it includes (AI features, tutorials, fair-use cap) is stated on the card

2. **Given** I click "Subscribe"
   **When** checkout starts
   **Then** a Stripe Checkout session in `subscription` mode is created for the €10/month EUR price
   **And** the price is taken from `STRIPE_SUBSCRIPTION_PRICE_ID`, or found by lookup key `sphere_unlimited_monthly_eur_1000`, or created on first use
   **And** the Stripe customer is reused (or created once) for my account
   **And** if I already have an entitled subscription the request is refused with 409

3. **Given** I complete payment
   **When** Stripe sends `checkout.session.completed`
   **Then** the subscription is re-fetched through the pinned Stripe client and synced to my PaymentPlan: `stripeSubscriptionId`, `subscriptionStatus`, `currentPeriodStart`, `currentPeriodEnd`, `cancelAtPeriodEnd`
   **And** the success page polls `/api/billing` until my tier is SUBSCRIPTION, then confirms

4. **Given** I have an entitled subscription (status `active`, `trialing` or `past_due`)
   **When** I use an AI feature
   **Then** the call is allowed and recorded as a SUBSCRIPTION usage event with its real cost and a charge of €0
   **And** once the real cost of my calls in the current billing period exceeds the fair-use cap (`SUBSCRIPTION_FAIR_USE_EUR`, default €6), further calls are billed to my wallet at 2× cost if it has a balance
   **And** with an empty wallet they are refused with 402 `FAIR_USE_REACHED` until the next billing period

5. **Given** subscription lifecycle events
   **When** Stripe sends `customer.subscription.created`, `.updated` or `.deleted`
   **Then** the subscription is re-fetched and synced, so out-of-order deliveries can't apply stale state
   **And** an ended subscription never overwrites a different, still-active one
   **And** when the subscription ends my tier falls back to PAY_AS_YOU_GO (if I have ever topped up, with my wallet kept) or FREE

6. **Given** subscription invoices
   **When** Stripe sends `invoice.paid` or `invoice.payment_failed`
   **Then** the invoice is re-fetched and recorded once as a SUBSCRIPTION_PAYMENT transaction (upsert by `stripeInvoiceId`; €0 invoices skipped)
   **And** a failed event never downgrades an already-paid invoice
   **And** a failed payment also re-syncs the subscription (status `past_due`); retries and dunning are left to Stripe's Smart Retries

7. **Given** I have a subscription
   **When** I view my account page
   **Then** I see its status, the renewal or end date, whether it cancels at period end, and my fair-use progress for the period
   **And** "Manage billing" opens the Stripe Customer Portal (cancel, change card, invoices), returning to `/profile#billing`

## Tasks / Subtasks

- [x] Task 1: Subscription plan definition and checkout (AC: 1, 2)
  - [x] `SUBSCRIPTION_PLAN` in `lib/billing/plans.ts` (€10/month, lookup key)
  - [x] `getSubscriptionPriceId()` and race-safe `getOrCreateStripeCustomer()` in `lib/stripe.ts`
  - [x] `{ plan: "subscription" }` branch of `POST /api/payments/checkout`, with 409 for existing subscribers
- [x] Task 2: Webhook handling (AC: 3, 5, 6)
  - [x] `syncSubscription()` and `recordInvoice()` in `lib/billing/stripe-sync.ts`
  - [x] Subscription and invoice events in `app/api/webhooks/stripe/route.ts`, re-fetched through the pinned client
  - [x] Idempotency: upserts by subscription and invoice id; stale-subscription guard
- [x] Task 3: Entitlement and fair use (AC: 4)
  - [x] Tier derived in `deriveTier()` (no stored plan type)
  - [x] `authorizeAiUsage()` with the fair-use cap and wallet overflow
  - [x] SUBSCRIPTION usage events recorded at €0 charge
- [x] Task 4: Self-service management (AC: 7)
  - [x] `POST /api/payments/portal` (Stripe Customer Portal)
  - [x] Subscription status in `components/billing/billing-status.tsx` (Story 5.5)
- [x] Task 5: Tests
  - [x] Tier derivation, fair-use cap and webhook idempotency in `lib/billing/billing.test.ts`

## Dev Notes

**Key files:**
- `lib/billing/plans.ts` - plan constants (client-safe)
- `lib/billing/account.ts` - `deriveTier`, `getBillingAccount`, `authorizeAiUsage`, `getFairUseCapMicros`
- `lib/billing/stripe-sync.ts` - `syncSubscription`, `recordInvoice`
- `lib/stripe.ts` - Stripe client, customer and price helpers
- `app/api/payments/checkout/route.ts`, `app/api/payments/portal/route.ts`, `app/api/webhooks/stripe/route.ts`

**Configuration:** `STRIPE_SUBSCRIPTION_PRICE_ID` (optional), `SUBSCRIPTION_FAIR_USE_EUR` (default 6). The Customer Portal must be enabled in the Stripe dashboard.

**Webhook API versions:** Stripe sends events in the account's API version, which can be newer than the client's pinned `2024-12-18.acacia` (for example, newer invoices have no top-level `subscription`). Subscriptions and invoices are therefore re-fetched through the pinned client before use.

**Local testing:** see README "Testing payments locally" (`stripe listen --events ...`, card 4242 4242 4242 4242; Test Clocks for renewals and failed payments).

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4] - Original story requirements (article-quota design, superseded as described above)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5

### Implementation Notes

- Verified end to end against Stripe test mode: subscribe → active with period end and €10 invoice recorded; second subscribe → 409; AI call while subscribed → "Included", wallet unchanged; cancel at period end reflected; immediate cancel → back to PAY_AS_YOU_GO with the wallet kept; portal session URL returned.
- VAT is not handled yet (Stripe Tax not configured).
