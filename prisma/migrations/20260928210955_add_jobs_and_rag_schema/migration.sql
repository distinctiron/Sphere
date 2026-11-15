-- AlterTable
ALTER TABLE "User" ADD COLUMN "new_papers_since" DATETIME;

-- CreateTable
CREATE TABLE "paper_chunks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paper_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "section_title" TEXT,
    "anchor_id" TEXT,
    "position" INTEGER NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "start_position" INTEGER NOT NULL,
    "end_position" INTEGER NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding" BLOB,
    "embedding_model" TEXT,
    "metadata" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "paper_chunks_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "trigger" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "duration_ms" INTEGER,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "job_locks" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT NOT NULL,
    "locked_until" DATETIME NOT NULL,
    "acquired_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_papers" (
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
    "scoring_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_scoring_attempt_at" DATETIME,
    "scoring_error" TEXT,
    "rag_status" TEXT NOT NULL DEFAULT 'PENDING',
    "rag_content_hash" TEXT,
    "rag_attempts" INTEGER NOT NULL DEFAULT 0,
    "rag_error" TEXT,
    "rag_indexed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_papers" ("abstract", "arxiv_id", "authors", "categories", "created_at", "html_url", "id", "novelty_score", "novelty_summary", "pdf_url", "publication_date", "title", "updated_at", "updated_date") SELECT "abstract", "arxiv_id", "authors", "categories", "created_at", "html_url", "id", "novelty_score", "novelty_summary", "pdf_url", "publication_date", "title", "updated_at", "updated_date" FROM "papers";
DROP TABLE "papers";
ALTER TABLE "new_papers" RENAME TO "papers";
CREATE UNIQUE INDEX "papers_arxiv_id_key" ON "papers"("arxiv_id");
CREATE INDEX "papers_arxiv_id_idx" ON "papers"("arxiv_id");
CREATE INDEX "papers_created_at_idx" ON "papers"("created_at");
CREATE INDEX "papers_novelty_score_idx" ON "papers"("novelty_score");
CREATE INDEX "papers_rag_status_idx" ON "papers"("rag_status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "paper_chunks_paper_id_idx" ON "paper_chunks"("paper_id");

-- CreateIndex
CREATE INDEX "paper_chunks_section_type_idx" ON "paper_chunks"("section_type");

-- CreateIndex
CREATE UNIQUE INDEX "paper_chunks_paper_id_position_key" ON "paper_chunks"("paper_id", "position");

-- CreateIndex
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");
