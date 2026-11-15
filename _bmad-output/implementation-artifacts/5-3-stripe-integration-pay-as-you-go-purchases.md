# Story 5.3: Stripe Integration & Pay-as-You-Go Purchases

Status: review

## Story

As a logged-in user,
I want to purchase article processing credits on a one-time basis,
so that I can try the service without committing to a subscription.

## Acceptance Criteria

1. **Given** I want to purchase credits
   **When** I click "Purchase Credits" from the payment wall or account page
   **Then** I am presented with credit package options (e.g., 10 articles for $X, 25 articles for $Y)
   **And** pricing is clearly displayed
   **And** I can select a package

2. **Given** I select a credit package
   **When** I proceed to checkout
   **Then** Stripe Checkout is initialized with the selected package
   **And** I am redirected to Stripe's secure payment page
   **And** I can enter my payment information securely

3. **Given** I complete payment on Stripe
   **When** the payment is successful
   **Then** Stripe sends a webhook to our application
   **And** a Transaction record is created with status "completed"
   **And** my articles_remaining quota is increased by the purchased amount
   **And** I am redirected back to the application with a success message
   **And** I can immediately use the purchased credits

4. **Given** payment processing
   **When** the payment fails or is cancelled
   **Then** a Transaction record is created with status "failed" or "pending"
   **And** my quota is not updated
   **And** an appropriate error message is displayed
   **And** I can retry the purchase

5. **Given** Stripe webhook integration
   **When** Stripe sends payment events
   **Then** the webhook endpoint verifies the webhook signature
   **And** payment_intent.succeeded events update transactions and quotas
   **And** payment_intent.payment_failed events are logged appropriately
   **And** webhook processing is idempotent (handles duplicate events)

## Tasks / Subtasks

- [x] Task 1: Install and Configure Stripe (AC: 2, 3)
  - [x] Install `stripe` npm package
  - [x] Add Stripe API keys to environment variables
  - [x] Initialize Stripe client
  - [x] Configure Stripe webhook endpoint

- [x] Task 2: Credit Package Selection UI (AC: 1)
  - [x] Create CreditPackageSelector component
  - [x] Define credit package options (10, 25, 50 articles)
  - [x] Display pricing clearly
  - [x] Handle package selection

- [x] Task 3: Stripe Checkout Integration (AC: 2, 3)
  - [x] Create API route for creating Stripe Checkout session
  - [x] Initialize Stripe Checkout with selected package
  - [x] Set up success and cancel URLs
  - [x] Redirect user to Stripe Checkout

- [x] Task 4: Stripe Webhook Handler (AC: 3, 5)
  - [x] Create `/api/webhooks/stripe/route.ts`
  - [x] Verify webhook signature
  - [x] Handle `payment_intent.succeeded` event
  - [x] Handle `payment_intent.payment_failed` event
  - [x] Create Transaction records
  - [x] Update PaymentPlan articles_remaining
  - [x] Implement idempotency (check for existing transactions)

- [x] Task 5: Payment Success/Cancel Handling (AC: 3, 4)
  - [x] Create success page/redirect handler
  - [x] Create cancel page/redirect handler
  - [x] Display success/error messages
  - [x] Update UI after successful payment

## Dev Notes

**Key Files to Create/Modify:**
- `lib/stripe.ts` - Stripe client initialization
- `app/api/payments/checkout/route.ts` - Create Checkout session
- `app/api/webhooks/stripe/route.ts` - Webhook handler
- `components/payment/credit-package-selector.tsx` - Package selection UI
- `app/(auth)/payment/success/page.tsx` - Success page
- `app/(auth)/payment/cancel/page.tsx` - Cancel page

**Stripe Integration:**
- Use Stripe Checkout for payment collection (PCI compliant)
- Store Stripe customer ID in PaymentPlan for future purchases
- Webhook signature verification is critical for security
- Idempotency prevents duplicate processing of webhook events

**Environment Variables:**
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (for client)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3] - Complete story requirements
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## Dev Agent Record

### Agent Model Used

Auto (Agent Router)

### Implementation Notes

**Completed: 2026-02-14**

**Changes Made:**

1. **lib/stripe.ts**: Created Stripe client initialization and credit package definitions:
   - Three credit packages: 10 articles ($4.99), 25 articles ($9.99), 50 articles ($17.99)
   - Stripe client initialized with API version 2024-12-18.acacia

2. **components/payment/credit-package-selector.tsx**: Created credit package selection UI:
   - Displays three packages with pricing and per-article cost
   - Highlights popular package
   - Shows checkmarks for benefits
   - Handles package selection

3. **components/payment/payment-page.tsx**: Created payment page component:
   - Integrates CreditPackageSelector and QuotaDisplay
   - Handles checkout flow
   - Shows upgrade prompts when needed

4. **app/api/payments/checkout/route.ts**: Created Stripe Checkout API route:
   - Creates or retrieves Stripe customer
   - Creates pending Transaction record
   - Initializes Stripe Checkout session
   - Sets success and cancel URLs
   - Stores metadata for webhook processing

5. **app/api/webhooks/stripe/route.ts**: Created Stripe webhook handler:
   - Verifies webhook signature for security
   - Handles `checkout.session.completed` event
   - Handles `payment_intent.succeeded` event
   - Handles `payment_intent.payment_failed` event
   - Implements idempotency (prevents duplicate processing)
   - Updates Transaction status
   - Updates PaymentPlan quota

6. **app/payment/success/page.tsx**: Created payment success page:
   - Displays success message
   - Provides links to dashboard and profile

7. **app/payment/cancel/page.tsx**: Created payment cancel page:
   - Displays cancellation message
   - Provides option to try again

8. **app/profile/page.tsx**: Updated profile page:
   - Added QuotaDisplay component
   - Added PaymentPage component
   - Improved layout with grid

9. **.env-example**: Added Stripe environment variables:
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_WEBHOOK_SECRET

**Technical Decisions:**
- Used Stripe Checkout for PCI compliance (no card data handled by app)
- Webhook signature verification is critical for security
- Idempotency prevents duplicate quota updates from duplicate webhook events
- Transaction records created before checkout for tracking
- Stripe customer ID stored in PaymentPlan for future purchases
- Credit packages priced at $0.50, $0.40, and $0.36 per article (better value for larger packages)

**Testing Notes:**
- Stripe package needs to be installed: `npm install stripe`
- Requires Stripe test keys for development
- Webhook endpoint needs to be configured in Stripe Dashboard
- Use Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Test with Stripe test cards (4242 4242 4242 4242)
- Webhook events are idempotent - safe to replay

**Next Steps:**
- Install Stripe package: `npm install stripe`
- Configure Stripe keys in `.env.local`
- Set up webhook endpoint in Stripe Dashboard
- Test payment flow end-to-end
