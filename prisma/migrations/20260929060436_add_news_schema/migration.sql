-- CreateTable
CREATE TABLE "news_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonical_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snippet" TEXT,
    "author" TEXT,
    "source_name" TEXT NOT NULL,
    "published_at" DATETIME NOT NULL,
    "engagement" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "discussion_url" TEXT,
    "engagement_updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "topic" TEXT NOT NULL DEFAULT 'ai',
    "content" TEXT,
    "content_fetched_at" DATETIME,
    "embedding" BLOB,
    "embedding_model" TEXT,
    "story_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "news_items_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "news_stories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "news_stories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL DEFAULT 'ai',
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "why_it_matters" TEXT,
    "first_seen_at" DATETIME NOT NULL,
    "last_seen_at" DATETIME NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "source_count" INTEGER NOT NULL DEFAULT 0,
    "heat_score" REAL NOT NULL DEFAULT 0,
    "is_breaking" BOOLEAN NOT NULL DEFAULT false,
    "centroid" BLOB,
    "embedding_model" TEXT,
    "summarized_item_count" INTEGER NOT NULL DEFAULT 0,
    "summary_error" TEXT,
    "summary_attempts" INTEGER NOT NULL DEFAULT 0,
    "article" TEXT,
    "article_citations" JSONB,
    "article_item_count" INTEGER,
    "article_source_count" INTEGER,
    "article_generated_at" DATETIME,
    "article_model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_story_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_story_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_story_states_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "news_stories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "news_items_canonical_url_idx" ON "news_items"("canonical_url");

-- CreateIndex
CREATE INDEX "news_items_story_id_idx" ON "news_items"("story_id");

-- CreateIndex
CREATE INDEX "news_items_topic_story_id_idx" ON "news_items"("topic", "story_id");

-- CreateIndex
CREATE INDEX "news_items_published_at_idx" ON "news_items"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_items_source_external_id_key" ON "news_items"("source", "external_id");

-- CreateIndex
CREATE INDEX "news_stories_topic_status_heat_score_idx" ON "news_stories"("topic", "status", "heat_score");

-- CreateIndex
CREATE INDEX "news_stories_topic_status_last_seen_at_idx" ON "news_stories"("topic", "status", "last_seen_at");

-- CreateIndex
CREATE INDEX "user_story_states_user_id_status_idx" ON "user_story_states"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_story_states_user_id_story_id_key" ON "user_story_states"("user_id", "story_id");
