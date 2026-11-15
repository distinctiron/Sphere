# Story 8.3: Story Clustering & Heat Ranking

Status: review

## Story

As a user,
I want coverage of the same event grouped into one story and ranked by how big it is,
so that I see each breaking story once, with the biggest first.

## Acceptance Criteria

1. **Given** new items
   **When** the clustering job runs
   **Then** each item joins a story with the same canonical URL, or the most similar active story from the last 48h (embedding cosine ≥ NEWS_CLUSTER_THRESHOLD, defaults 0.62 OpenAI / 0.4 local), or starts a new story; stories split by arrival order are merged afterwards

2. **Given** active stories
   **When** they are ranked
   **Then** heat = per-platform normalised engagement (log-scaled) × boost for multiple platforms/outlets × time decay (half-life NEWS_HEAT_HALF_LIFE_HOURS, default 8h)

3. **Given** a story covered on ≥2 platforms or by ≥3 outlets in the last 6h, or among the hottest fresh multi-item stories
   **When** ranking runs
   **Then** it is flagged as breaking

4. **Given** stories not seen for 7 days
   **When** cleanup runs
   **Then** they are archived, and items/stories older than 30 days are deleted unless a user saved the story

## Tasks / Subtasks

- [x] Embed items with the Epic 7 embedding service
- [x] Assignment by URL, then centroid similarity; running-mean centroids
- [x] Merge pass for split stories
- [x] Heat and breaking rules
- [x] Retention cleanup
- [x] Unit tests

## Dev Notes

Local lexical embeddings cluster headlines reasonably well (verified on live data: 20+ outlets covering one OpenAI announcement grouped into a single story); OpenAI embeddings are better.

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `lib/news/{clustering,heat}.ts`
- `lib/jobs/news-clustering.ts`
- `lib/news/ranking.test.ts`
