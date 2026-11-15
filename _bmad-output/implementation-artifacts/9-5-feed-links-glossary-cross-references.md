# Story 9.5: Feed Links, Glossary & Cross-References

Status: review

## Story

As a learner,
I want lessons connected to my feed and to each other,
so that I can apply what I learn and easily go back to foundations.

## Acceptance Criteria

1. Lesson side rail links this week's matching News stories and papers (library first)
2. Overview ranks lessons by stories explained this week; story pages show Background lessons
3. Glossary page A–Z; hover/tap definitions in lessons
4. Content validation: acyclic buildsOn, every buildsOn recalled, Recall only backwards, Preview only forwards, references resolve

## Tasks / Subtasks

- [x] `lib/learn/feed-match.ts` (keyword scoring), `lib/learn/feed.ts`
- [x] GET /api/learn/lessons/[id]/feed
- [x] `<Recall>`, `<Preview>`, `<LessonLink>`, `<Term>` components
- [x] `content/learn/glossary/*`
- [x] `lib/learn/content.test.ts`

## Dev Notes

Keyword matching is deliberately simple (whole words; acronyms case-sensitive; headline hits weighted double; score ≥ 2).
