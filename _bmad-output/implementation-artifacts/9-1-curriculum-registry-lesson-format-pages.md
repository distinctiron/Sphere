# Story 9.1: Curriculum Registry, Lesson Content Format & Pages

Status: review

## Story

As a learner,
I want a Learn tab with paths, modules and lessons,
so that I can follow a clear step-by-step learning plan.

## Acceptance Criteria

1. `/learn` shows four paths with mental models, suggested route, progress, continue-where-you-left-off and lessons explaining this week's feed
2. `/learn/[path]` lists modules and lessons with status, minutes and builds-on hints (never locked)
3. `/learn/[path]/[lesson]` renders MDX (KaTeX math, callouts, glossary terms, figures) with breadcrumb, mental model, builds-on, prev/next, comes-back and related lessons
4. A Learn tab is added to the Papers | News switch

## Tasks / Subtasks

- [x] Registry `lib/learn/curriculum.ts` (topics → paths → modules → lesson ids, mental models, route, codes)
- [x] Frontmatter schema (zod) and server loader `lib/learn/content.ts` (mtime cache, leads-to, related, prev/next, plain text)
- [x] MDX rendering via next-mdx-remote/rsc with remark-gfm, remark-math, rehype-katex (`lib/learn/render.tsx`, `components/learn/mdx-components.tsx`)
- [x] Pages: overview, path, lesson, glossary; `app/learn/layout.tsx` loads KaTeX and figure CSS
- [x] Authoring guide `content/learn/AUTHORING.md`

## Dev Notes

Lessons are code-reviewed content, not DB rows; only progress is stored. Tailwind now also scans lib/ and content/.
