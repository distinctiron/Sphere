# Story 8.5: News API & Dashboard News Tab

Status: review

## Story

As a user,
I want a News tab on the overview page,
so that I can follow breaking AI news next to my papers.

## Acceptance Criteria

1. **Given** the dashboard
   **When** I switch to News (`/dashboard?tab=news`)
   **Then** I see a "Breaking now" strip and ranked story cards with headline, summary, why it matters, age, platform chips (e.g. HN points, subreddits, outlet count, GitHub stars) and expandable source links

2. **Given** the feed
   **When** I change filters
   **Then** I can choose the time window (24h/3 days/week), sort (hottest/latest), platforms, and a Saved view; the feed refreshes every 2 minutes

3. **Given** a story
   **When** I save or dismiss it
   **Then** the state is stored per user (`PATCH /api/news/stories/[id]`), dismissed stories disappear and saved ones appear under Saved

4. **Given** no news fetched yet or a source failing
   **When** I open the tab
   **Then** an explanatory empty state or source warning is shown

## Tasks / Subtasks

- [x] GET /api/news/stories and GET/PATCH /api/news/stories/[id]
- [x] Papers | News tabs (paper dashboard unchanged)
- [x] NewsFeed and StoryCard components
- [x] Responsive layout check at desktop and phone widths

## Dev Notes

The paper dashboard (drag and drop) is unchanged; the tab switch is passed in as a header slot.

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `app/api/news/stories/route.ts`
- `app/api/news/stories/[id]/route.ts`
- `lib/news/{dto,stories,session,format}.ts`
- `app/dashboard/page.tsx`
- `components/dashboard/dashboard-content.tsx (header tabs slot)`
- `components/news/{dashboard-tabs,news-feed,story-card,source-badge}.tsx`
