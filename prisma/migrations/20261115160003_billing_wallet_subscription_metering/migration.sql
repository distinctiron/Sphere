/*
  Warnings:

  - You are about to drop the column `articles_limit` on the `payment_plans` table. All the data in the column will be lost.
  - You are about to drop the column `articles_remaining` on the `payment_plans` table. All the data in the column will be lost.
  - You are about to drop the column `plan_type` on the `payment_plans` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `articles_purchased` on the `transactions` table. All the data in the column will be lost.
  - Added the required column `amount_cents` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "feature" TEXT NOT NULL,
    "billing" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" INTEGER NOT NULL,
    "charged_micros" INTEGER NOT NULL DEFAULT 0,
    "paper_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_payment_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "balance_micros" BIGINT NOT NULL DEFAULT 0,
    "total_topped_up_micros" BIGINT NOT NULL DEFAULT 0,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "current_period_start" DATETIME,
    "current_period_end" DATETIME,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payment_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_payment_plans" ("created_at", "id", "stripe_customer_id", "stripe_subscription_id", "subscription_status", "updated_at", "user_id") SELECT "created_at", "id", "stripe_customer_id", "stripe_subscription_id", "subscription_status", "updated_at", "user_id" FROM "payment_plans";
DROP TABLE "payment_plans";
ALTER TABLE "new_payment_plans" RENAME TO "payment_plans";
CREATE UNIQUE INDEX "payment_plans_user_id_key" ON "payment_plans"("user_id");
CREATE UNIQUE INDEX "payment_plans_stripe_customer_id_key" ON "payment_plans"("stripe_customer_id");
CREATE UNIQUE INDEX "payment_plans_stripe_subscription_id_key" ON "payment_plans"("stripe_subscription_id");
CREATE TABLE "new_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "stripe_checkout_session_id" TEXT,
    "stripe_invoice_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("created_at", "currency", "id", "status", "stripe_payment_intent_id", "stripe_subscription_id", "transaction_type", "user_id") SELECT "created_at", "currency", "id", "status", "stripe_payment_intent_id", "stripe_subscription_id", "transaction_type", "user_id" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_stripe_checkout_session_id_key" ON "transactions"("stripe_checkout_session_id");
CREATE UNIQUE INDEX "transactions_stripe_invoice_id_key" ON "transactions"("stripe_invoice_id");
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "usage_events_user_id_created_at_idx" ON "usage_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_events_billing_created_at_idx" ON "usage_events"("billing", "created_at");
