# Story 9.8: Path C — Building with AI: Agents & Harness Engineering

Status: review

## Story

As a learner,
I want the building path's lessons with animated figures and quizzes,
so that I build a working mental model (the model is a stateless function from context to next token).

## Acceptance Criteria

1. Every lesson in the path exists as `content/learn/building/<id>.mdx` and passes `lib/learn/content.test.ts`
2. Each lesson follows the template in `content/learn/AUTHORING.md`: The picture → mechanism → worked example → Reason with it → Where this picture breaks → Recap, with a 3–4 question reasoning quiz
3. Each lesson extends the path's mental model and recalls the lessons it builds on
4. Figures are correct, readable at phone width, and animate only where motion carries meaning
5. Glossary terms for the path are defined in `content/learn/glossary/`

## Dev Notes

Time-sensitive facts are rounded, dated and marked with `reviewed:` in frontmatter.
