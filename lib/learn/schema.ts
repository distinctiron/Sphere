import { z } from "zod";

/** Frontmatter of content/learn/<path>/<lesson>.mdx (validated on load and in content tests) */

export const QuizQuestionSchema = z.object({
  question: z.string().min(10),
  // YAML reads an unquoted option like `- 2` as a number
  options: z.array(z.union([z.string(), z.number()]).transform(String).pipe(z.string().min(1))).min(2).max(5),
  /** Index into options */
  answer: z.number().int().min(0),
  explanation: z.string().min(10),
});

export const LessonFrontmatterSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(3),
    summary: z.string().min(20).max(320),
    minutes: z.number().int().min(3).max(30),
    /** Mental model id (see lib/learn/curriculum.ts) this lesson extends */
    model: z.string(),
    /** Hard prerequisites: taught-from ("recalled") in the body */
    buildsOn: z.array(z.string()).default([]),
    /** Cross-links that are useful but not required */
    related: z.array(z.string()).default([]),
    /** Terms used to link the lesson to News stories and papers in the feed */
    keywords: z.array(z.string().min(2)).min(3),
    /** ISO date the facts were last checked (required for time-sensitive lessons) */
    reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    quiz: z.array(QuizQuestionSchema).min(2).max(6),
  })
  .superRefine((fm, ctx) => {
    fm.quiz.forEach((q, i) => {
      if (q.answer >= q.options.length) {
        ctx.addIssue({ code: "custom", path: ["quiz", i, "answer"], message: "answer index out of range" });
      }
    });
  });

export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
