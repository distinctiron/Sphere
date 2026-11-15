# Story 9.4: Lesson Tutor

Status: review

## Story

As a learner,
I want to ask questions when a concept is unclear,
so that I get explanations grounded in the lesson I'm reading.

## Acceptance Criteria

1. Ask the tutor panel streams answers (SSE) grounded in lesson text, prerequisites, glossary terms, the path's mental models and the curriculum outline
2. Selecting lesson text offers Ask about this, quoting the passage
3. Answers render Markdown, KaTeX and [[lesson:id]] links

## Tasks / Subtasks

- [x] `lib/learn/tutor.ts` system prompt
- [x] `tutorChatStreaming()` in `lib/llm.ts` (OpenAI/Anthropic/mock)
- [x] POST /api/learn/lessons/[id]/chat
- [x] `components/learn/tutor-panel.tsx`, `tutor-markdown.tsx`
- [x] Tests in `lib/learn/platform.test.ts`

## Dev Notes

The tutor does not consume article quota (quota units are articles; lessons are not articles).
