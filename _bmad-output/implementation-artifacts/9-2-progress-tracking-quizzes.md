# Story 9.2: Progress Tracking & Quizzes

Status: review

## Story

As a learner,
I want my progress saved and to check my understanding,
so that I know where I am and whether I understood a lesson.

## Acceptance Criteria

1. Opening a lesson records it as STARTED (never downgrades COMPLETED)
2. Quiz answers are explained; score saved; ≥ half right completes the lesson; manual Mark complete toggle
3. Path and overview pages show per-lesson and per-path completion

## Tasks / Subtasks

- [x] `UserLessonProgress` model + migration `add_learn_progress`
- [x] `lib/learn/progress.ts`
- [x] GET /api/learn/progress, PUT /api/learn/progress/[lessonId] (validated against registry)
- [x] `components/learn/lesson-quiz.tsx`
- [x] Tests in `lib/learn/platform.test.ts`

## Dev Notes

Quizzes favour prediction/deduction questions (see AUTHORING.md).
