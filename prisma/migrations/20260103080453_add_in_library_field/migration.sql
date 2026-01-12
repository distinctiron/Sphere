-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_paper_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "in_library" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_paper_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_paper_states_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_paper_states" ("created_at", "display_order", "id", "paper_id", "status", "updated_at", "user_id") SELECT "created_at", "display_order", "id", "paper_id", "status", "updated_at", "user_id" FROM "user_paper_states";
DROP TABLE "user_paper_states";
ALTER TABLE "new_user_paper_states" RENAME TO "user_paper_states";
CREATE INDEX "user_paper_states_user_id_idx" ON "user_paper_states"("user_id");
CREATE INDEX "user_paper_states_paper_id_idx" ON "user_paper_states"("paper_id");
CREATE UNIQUE INDEX "user_paper_states_user_id_paper_id_key" ON "user_paper_states"("user_id", "paper_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
