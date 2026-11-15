# Story 8.7: News Scheduling, Monitoring & Retention

Status: review

## Story

As a system administrator,
I want the news pipeline to run automatically and be observable,
so that breaking news is fresh without manual work.

## Acceptance Criteria

1. **Given** ENABLE_SCHEDULER=true
   **When** the server starts
   **Then** the scheduler runs process-papers hourly and process-news (news-fetch → news-clustering → news-summarize) every NEWS_INTERVAL_MINUTES (default 15, at :02/:17/…)

2. **Given** an external scheduler
   **When** it calls `/api/cron/process-news` with the cron secret, or `npm run jobs:run -- process-news` is used
   **Then** the same pipeline runs with locking and job-run tracking

3. **Given** GET /api/cron/status
   **When** it is called
   **Then** news jobs and the news backlog (unclustered items, active/unsummarized stories) are reported

## Tasks / Subtasks

- [x] Generalise the scheduler to several pipelines
- [x] Register news jobs and pipeline
- [x] News backlog in status
- [x] Env documentation (.env-example, README)

## Dev Notes

Retention is part of the clustering job (Story 8.3).

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `lib/jobs/{config,scheduler,registry}.ts`
- `app/api/cron/status/route.ts`
- `.env-example`
- `README.md`
