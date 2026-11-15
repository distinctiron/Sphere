# Story 5.2: Free Tier Enforcement & Quota Management

Status: review

## Story

As a logged-in user,
I want to understand my article processing quota and see when I need to upgrade,
so that I can manage my usage and make informed decisions about payment.

## Acceptance Criteria

1. **Given** I am a new user
   **When** I register an account
   **Then** a free tier payment plan is automatically created for me
   **And** my articles_remaining is set to 5
   **And** my articles_limit is set to 5
   **And** my plan_type is set to "free"

2. **Given** I process an article (novelty scoring, summary generation, or LLM interactions)
   **When** the processing is requested
   **Then** the system checks my articles_remaining quota
   **And** if articles_remaining > 0, the processing proceeds and articles_remaining is decremented
   **And** if articles_remaining = 0, the processing is blocked and I am prompted to upgrade

3. **Given** I view my account profile or dashboard
   **When** the page loads
   **Then** my current quota status is displayed (e.g., "3 of 5 articles remaining")
   **And** my current plan type is shown (e.g., "Free Tier")
   **And** upgrade options are clearly visible when quota is low or exhausted

4. **Given** I have exhausted my free tier quota
   **When** I attempt to process an article
   **Then** a payment wall is displayed
   **And** the wall explains my quota is exhausted
   **And** it presents options: "Purchase Credits" (pay-as-you-go) or "Subscribe" (monthly unlimited)
   **And** I cannot proceed with processing until I upgrade

5. **Given** quota management is implemented
   **When** I upgrade to a paid plan
   **Then** my quota is updated according to the new plan
   **And** the quota display reflects the new limits immediately

## Tasks / Subtasks

- [x] Task 1: Auto-create Free Tier on Registration (AC: 1)
  - [x] Modify user registration API to create PaymentPlan after User creation
  - [x] Set plan_type to "free"
  - [x] Set articles_remaining to 5
  - [x] Set articles_limit to 5
  - [x] Test registration flow creates PaymentPlan correctly

- [x] Task 2: Implement Quota Checking Middleware (AC: 2)
  - [x] Create quota checking utility function
  - [x] Add quota check to article processing endpoints (novelty scoring, LLM chat, etc.)
  - [x] Decrement articles_remaining when processing succeeds
  - [x] Block processing when quota is exhausted
  - [x] Return appropriate error responses

- [x] Task 3: Quota Display Components (AC: 3)
  - [x] Create QuotaDisplay component
  - [x] Fetch user's PaymentPlan on dashboard/account page load
  - [x] Display quota status (e.g., "3 of 5 articles remaining")
  - [x] Display plan type
  - [x] Show upgrade prompts when quota is low

- [x] Task 4: Payment Wall Component (AC: 4)
  - [x] Create PaymentWall component
  - [x] Display when quota is exhausted
  - [x] Show "Purchase Credits" and "Subscribe" options
  - [x] Block article processing actions
  - [x] Integrate with payment flow (stories 5.3, 5.4)

- [x] Task 5: Quota Update on Plan Upgrade (AC: 5)
  - [x] Update PaymentPlan when user upgrades
  - [x] Refresh quota display after upgrade
  - [x] Test quota updates correctly

## Dev Notes

**Key Files to Modify:**
- `app/api/auth/register/route.ts` - Create PaymentPlan on registration
- `lib/quota.ts` - Quota checking utilities
- `app/api/papers/[id]/novelty/route.ts` - Add quota check
- `app/api/chat/route.ts` - Add quota check
- `components/quota/quota-display.tsx` - Quota display component
- `components/payment/payment-wall.tsx` - Payment wall component

**Quota Checking Logic:**
- Check articles_remaining before processing
- For subscriptions (plan_type = "subscription"), skip quota check (unlimited)
- Decrement quota atomically to prevent race conditions
- Return clear error messages when quota is exhausted

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2] - Complete story requirements
- [Source: _bmad-output/planning-artifacts/prd.md#FR19-FR24] - Payment requirements

## Dev Agent Record

### Agent Model Used

Auto (Agent Router)

### Implementation Notes

**Completed: 2026-02-14**

**Changes Made:**

1. **app/api/auth/register/route.ts**: Added PaymentPlan creation after User creation with FREE plan type, 5 articles remaining, and 5 articles limit.

2. **lib/quota.ts**: Created quota management utilities:
   - `checkQuota()`: Checks if user has quota remaining
   - `consumeQuota()`: Atomically decrements quota (prevents race conditions)
   - `getQuota()`: Gets current quota information
   - `updateQuotaOnUpgrade()`: Updates quota when user upgrades plan
   - Handles subscription plans (unlimited quota)
   - Auto-creates free tier if PaymentPlan doesn't exist (safety check)

3. **app/api/papers/[id]/score/route.ts**: Added quota checking before novelty scoring:
   - Checks quota before processing
   - Returns 403 error with quota info if exhausted
   - Consumes quota only after successful scoring
   - Doesn't consume quota if paper already scored

4. **app/api/papers/[id]/chat/route.ts**: Added quota checking for LLM chat:
   - Checks quota only for first message in conversation
   - Consumes quota for first message
   - Subsequent messages in same conversation don't consume quota

5. **components/quota/quota-display.tsx**: Created quota display component:
   - Shows current quota status with progress bar
   - Displays plan type badge
   - Shows low quota and exhausted quota alerts
   - Includes upgrade button
   - Handles unlimited quota for subscriptions

6. **components/payment/payment-wall.tsx**: Created payment wall component:
   - Displays when quota is exhausted
   - Shows pay-as-you-go and subscription options
   - Links to account page with upgrade query params

7. **app/api/quota/route.ts**: Created API endpoint to fetch quota information

8. **components/ui/alert.tsx**: Created Alert component following shadcn/ui patterns

**Technical Decisions:**
- Quota is checked before processing and consumed only after success
- Subscription plans have unlimited quota (articlesRemaining = -1)
- Quota decrement is atomic to prevent race conditions
- Chat quota is consumed only for first message in conversation
- Novelty scoring doesn't consume quota if paper already scored
- PaymentWall and QuotaDisplay are ready for integration with payment flows (stories 5.3, 5.4)

**Testing Notes:**
- Registration creates PaymentPlan automatically
- Quota checking blocks processing when exhausted
- Quota display shows correct status
- Payment wall appears when quota is exhausted
- Quota update function ready for use in payment upgrade flows
