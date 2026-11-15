# Story 8.2: Reddit, GitHub & X Source Adapters

Status: review

## Story

As a user following AI,
I want stories from Reddit, GitHub and X,
so that I see what communities and developers are reacting to, not just news outlets.

## Acceptance Criteria

1. **Given** the topic's subreddits
   **When** Reddit is fetched
   **Then** today's top posts of all subreddits are fetched in one multireddit request: via OAuth with upvotes when REDDIT_CLIENT_ID/SECRET are set, otherwise via the public Atom feed (no scores, ~1 request/minute limit)

2. **Given** GitHub
   **When** it is fetched
   **Then** new fast-rising repositories (Search API, last 3 days) and the newest newsworthy release of watched repos (build, nightly and pre-release tags skipped) are returned with star counts

3. **Given** X_RSS_URL_TEMPLATE pointing to an RSS bridge (RSSHub/Nitter)
   **When** X is fetched
   **Then** posts of the configured accounts are returned (retweets skipped, outbound link used as the story link); without the template the source is skipped with an explanation

4. **Given** any source failing
   **When** the fetch job runs
   **Then** other sources still complete and per-source results/errors are recorded in the job run

## Tasks / Subtasks

- [x] Reddit adapter (OAuth JSON + public multireddit feed)
- [x] GitHub adapter (repo search + release feeds, noisy tag filter)
- [x] X adapter via RSS bridge template
- [x] DISABLED_NEWS_SOURCES / DISABLED_NEWS_FEEDS switches
- [x] Unit tests for each parser

## Dev Notes

X has no free read API, so it is only available through a self-hosted bridge; this is against X's terms of service and off by default. Reddit's unauthenticated limit is about one request per minute per IP, hence the single multireddit request.

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `lib/news/sources/{reddit,github,x}.ts`
- `lib/news/sources/sources.test.ts`
