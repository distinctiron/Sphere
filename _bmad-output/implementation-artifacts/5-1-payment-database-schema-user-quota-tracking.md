# Story 5.1: Payment Database Schema & User Quota Tracking

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to define the database schema for payment plans, user quotas, and transaction tracking,
so that the system can enforce usage limits and process payments correctly.

## Acceptance Criteria

1. **Given** the Prisma schema file exists
   **When** I define the PaymentPlan model (or add to User model)
   **Then** the model includes fields for: plan_type (enum: "free", "pay_as_you_go", "subscription"), articles_remaining (Integer), articles_limit (Integer), stripe_customer_id (String, nullable), stripe_subscription_id (String, nullable), subscription_status (String, nullable), created_at (DateTime), updated_at (DateTime)
   **And** it is associated with the User model via user_id foreign key

2. **Given** the Prisma schema file
   **When** I define a Transaction model
   **Then** the model includes fields for: user_id (foreign key), transaction_type (enum: "one_time_payment", "subscription_payment"), amount (Decimal), currency (String), stripe_payment_intent_id (String, nullable), stripe_subscription_id (String, nullable), status (enum: "pending", "completed", "failed"), articles_purchased (Integer, nullable), created_at (DateTime)
   **And** it tracks all payment transactions for audit and reconciliation

3. **Given** the schema is defined
   **When** I run Prisma migrations
   **Then** the payment_plans table (or fields added to users table) is created
   **And** the transactions table is created with proper relationships
   **And** all fields have appropriate data types and constraints

4. **Given** the database schema is created
   **When** I generate the Prisma client
   **Then** TypeScript types are generated for PaymentPlan and Transaction models
   **And** the types can be imported and used in API routes and components

## Tasks / Subtasks

- [x] Task 1: Define PaymentPlan Model (AC: 1)
  - [x] Add PaymentPlan model to `prisma/schema.prisma`
  - [x] Define plan_type enum: "free", "pay_as_you_go", "subscription"
  - [x] Add articles_remaining (Integer) field
  - [x] Add articles_limit (Integer) field
  - [x] Add stripe_customer_id (String, nullable)
  - [x] Add stripe_subscription_id (String, nullable)
  - [x] Add subscription_status (String, nullable)
  - [x] Add created_at and updated_at timestamps
  - [x] Add user_id foreign key relationship to User model
  - [x] Add unique constraint on user_id (one payment plan per user)

- [x] Task 2: Define Transaction Model (AC: 2)
  - [x] Add Transaction model to `prisma/schema.prisma`
  - [x] Add user_id foreign key to User model
  - [x] Define transaction_type enum: "one_time_payment", "subscription_payment"
  - [x] Add amount (Float) field (SQLite doesn't support Decimal, using Float)
  - [x] Add currency (String) field
  - [x] Add stripe_payment_intent_id (String, nullable)
  - [x] Add stripe_subscription_id (String, nullable)
  - [x] Define status enum: "pending", "completed", "failed"
  - [x] Add articles_purchased (Integer, nullable)
  - [x] Add created_at timestamp
  - [x] Add indexes for user_id and stripe_payment_intent_id for efficient queries

- [x] Task 3: Run Database Migrations (AC: 3)
  - [x] Run `npx prisma migrate dev --name add_payment_schema`
  - [x] Verify payment_plans table is created with correct schema
  - [x] Verify transactions table is created with correct schema
  - [x] Verify foreign key relationships are established
  - [x] Verify enum types are created correctly
  - [x] Verify indexes are created

- [x] Task 4: Generate Prisma Client (AC: 4)
  - [x] Run `npx prisma generate`
  - [x] Verify TypeScript types are generated for PaymentPlan
  - [x] Verify TypeScript types are generated for Transaction
  - [x] Test importing types in a test file
  - [x] Verify enum types are available in TypeScript

## Dev Notes

### Relevant Architecture Patterns and Constraints

**Database Schema Patterns:**
- Follow Prisma schema conventions (snake_case for database, camelCase in TypeScript)
- Use enums for plan_type, transaction_type, and status fields
- Foreign keys use `@relation` directive in Prisma
- Timestamps use `@default(now())` and `@updatedAt` directives
- Nullable fields use `?` in Prisma schema

**Payment Architecture:**
- PaymentPlan tracks user's current subscription/payment status
- One PaymentPlan per user (1:1 relationship with User)
- Transactions track all payment history (1:many relationship with User)
- Stripe IDs stored for webhook reconciliation
- Articles quota tracked in PaymentPlan (articles_remaining, articles_limit)

**Key Files to Modify:**
- `prisma/schema.prisma` - Add PaymentPlan and Transaction models
- Database migrations will be auto-generated

### Project Structure Notes

**File Locations:**
- Schema: `prisma/schema.prisma` (follows existing pattern)
- Migrations: `prisma/migrations/` (auto-generated)
- Types: Generated in `node_modules/.prisma/client` (imported via `@prisma/client`)

**Naming Conventions:**
- Models: `PaymentPlan`, `Transaction` (PascalCase)
- Fields: `plan_type`, `articles_remaining` (snake_case in schema, camelCase in TypeScript)
- Enums: `PlanType`, `TransactionType`, `TransactionStatus` (PascalCase)

### Testing Standards Summary

**Unit Tests:**
- Test Prisma schema validation
- Test enum values are correct
- Test foreign key relationships

**Integration Tests:**
- Test database migrations run successfully
- Test Prisma client generation
- Test TypeScript types are correctly generated
- Test model relationships work (create PaymentPlan with User)

**Manual Testing:**
- Run migrations in development database
- Verify tables are created correctly
- Verify Prisma Studio shows new models correctly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1] - Complete story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Payment-Integration-Architecture] - Payment architecture patterns (if exists)
- [Source: _bmad-output/planning-artifacts/prd.md#FR19-FR24] - Functional requirements for payment system
- [Source: prisma/schema.prisma] - Existing Prisma schema patterns
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference) - Official Prisma schema documentation

## Dev Agent Record

### Agent Model Used

Auto (Agent Router)

### Debug Log References

N/A - Implementation completed successfully

### Change Log

**2026-02-14: Story 5.1 Implementation Complete**
- Added PaymentPlan model to Prisma schema with all required fields and enums
- Added Transaction model to Prisma schema with all required fields and enums
- Created database migration: `20260214225155_add_payment_schema`
- Generated Prisma client with TypeScript types
- All acceptance criteria satisfied

### Completion Notes List

- Story created for Epic 5 Story 5.1
- Comprehensive context provided for developer implementation
- All acceptance criteria extracted from epics.md
- Architecture patterns and constraints documented

**Implementation Notes:**
- ✅ Task 1 & 2: Added PaymentPlan and Transaction models to `prisma/schema.prisma`
- ✅ PaymentPlan model includes all required fields with proper types and relationships
- ✅ Transaction model includes all required fields with proper types and relationships
- ✅ Enums defined: PlanType (FREE, PAY_AS_YOU_GO, SUBSCRIPTION), TransactionType (ONE_TIME_PAYMENT, SUBSCRIPTION_PAYMENT), TransactionStatus (PENDING, COMPLETED, FAILED)
- ✅ User model updated with paymentPlan and transactions relations
- ✅ Task 3: Migration created successfully - `20260214225155_add_payment_schema`
  - payment_plans table created with all fields, foreign keys, and indexes
  - transactions table created with all fields, foreign keys, and indexes
  - Unique constraint on payment_plans.user_id (one payment plan per user)
  - Indexes created on user_id and stripe_payment_intent_id
- ✅ Task 4: Prisma client generated successfully
  - TypeScript types available for PaymentPlan and Transaction models
  - Enum types (PlanType, TransactionType, TransactionStatus) available
- ⚠️ Note: Used Float instead of Decimal for amount field (SQLite limitation - Decimal not supported)

### File List

**Files to Create/Modify:**
- ✅ `prisma/schema.prisma` - Added PaymentPlan and Transaction models, updated User model with relations

**Files Created:**
- ✅ `prisma/migrations/20260214225155_add_payment_schema/migration.sql` - Database migration file

**Files Auto-Generated:**
- ✅ `node_modules/.prisma/client/index.d.ts` - TypeScript types for PaymentPlan, Transaction, and enums
