# Story 8.1: News Schema, Source Framework, Hacker News & Outlet Feeds

Status: review

## Story

As a developer,
I want a data model and a pluggable source framework for news items,
so that breaking stories from different platforms can be collected, stored and de-duplicated.

## Acceptance Criteria

1. **Given** the Prisma schema
   **When** the news models are added
   **Then** `NewsItem` (source, externalId, url, canonicalUrl, title, snippet, sourceName, publishedAt, engagement, comments, content, embedding, storyId), `NewsStory` and `UserStoryState` exist with a migration, and items are unique on (source, externalId)

2. **Given** a topic configuration (AI)
   **When** a source adapter runs
   **Then** it returns normalised items for that topic, and adapters for Hacker News (Algolia API) and RSS/Atom outlet feeds (TechCrunch, The Verge, VentureBeat, MIT Technology Review, Ars Technica, Hugging Face, DeepMind, OpenAI, Google News) are available

3. **Given** items linking to the same article
   **When** they are stored
   **Then** their canonical URL (tracking parameters, www, fragments and trailing slashes removed; x.com/twitter.com and arXiv variants unified) is identical, and the same outlet article arriving through two feeds is stored once

## Tasks / Subtasks

- [x] Add NewsItem / NewsStory / UserStoryState models and migration
- [x] Topic config with keywords, subreddits, feeds, GitHub queries and X accounts (`lib/news/topics.ts`)
- [x] NewsSource interface, HTTP helper with timeout and 429 back-off, RSS/Atom parser
- [x] Hacker News and RSS adapters, URL canonicalisation and text helpers
- [x] Unit tests with feed fixtures

## Dev Notes

Sources are adapters (`NewsSource.fetch(topic, ctx)`) so topics other than AI can be added by defining another `TopicConfig`. General feeds (Google News, HN) are filtered by whole-word topic keywords; "AI" is matched case-sensitively.

## Dev Agent Record

### Implementation Notes

Implemented as part of Epic 8 (Breaking AI News). Verified with unit tests and a live run against the real sources (`npm run jobs:run -- process-news`, `/api/cron/process-news`) and in the browser at desktop and phone widths.

### File List

- `prisma/schema.prisma (NewsItem, NewsStory, UserStoryState)`
- `prisma/migrations/*_add_news_schema`
- `lib/news/{types,topics,normalize,http,feed-parser}.ts`
- `lib/news/sources/{types,index,hackernews,rss}.ts`
- `lib/news/normalize.test.ts, lib/news/sources/sources.test.ts`
