# Story 8.4: LLM Story Headlines & Summaries

Status: review

## Story

As a user,
I want a clear headline, summary and why-it-matters line for each story,
so that I can grasp a story in seconds.

## Acceptance Criteria

1. **Given** stories that are new or grew since they were summarized
   **When** the summarize job runs
   **Then** the hottest (up to NEWS_SUMMARIZE_MAX_PER_RUN) get an LLM headline, 2-3 sentence summary and why-it-matters line via structured output

2. **Given** LLM errors
   **When** summarizing
   **Then** bad credentials stop the run without penalising stories, repeated rate limits trip a circuit breaker, and other failures are retried later (max 5 attempts)

3. **Given** mock mode (no LLM key)
   **When** the job runs
   **Then** it is skipped and stories keep their best source headline

## Tasks / Subtasks

- [x] summarizeStory() in lib/llm.ts (OpenAI + Anthropic structured output)
- [x] news-summarize job with failure handling
- [x] Tests with mocked LLM

## Dev Notes

Uses the same error-handling pattern as novelty scoring (Story 6.3).

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `lib/llm.ts (summarizeStory)`
- `lib/jobs/news-summarize.ts`
- `lib/jobs/news.test.ts`
