-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastFetchTimestamp" DATETIME;

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "arxiv_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" JSONB NOT NULL,
    "abstract" TEXT NOT NULL,
    "publication_date" DATETIME NOT NULL,
    "updated_date" DATETIME NOT NULL,
    "categories" JSONB NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "html_url" TEXT NOT NULL,
    "novelty_score" REAL,
    "novelty_summary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_paper_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "display_order" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_paper_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_paper_states_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "papers_arxiv_id_key" ON "papers"("arxiv_id");

-- CreateIndex
CREATE INDEX "papers_arxiv_id_idx" ON "papers"("arxiv_id");

-- CreateIndex
CREATE INDEX "user_paper_states_user_id_idx" ON "user_paper_states"("user_id");

-- CreateIndex
CREATE INDEX "user_paper_states_paper_id_idx" ON "user_paper_states"("paper_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_paper_states_user_id_paper_id_key" ON "user_paper_states"("user_id", "paper_id");
