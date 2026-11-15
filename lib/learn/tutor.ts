import { getTerm } from "@/content/learn/glossary";
import { AI_LEARN_TOPIC, getLessonRef, getMentalModel } from "./curriculum";
import { extractBodyRefs, getLessonMeta, lessonPlainText, safeLessonSource } from "./content";

/** Builds the tutor's system prompt for a lesson (Story 9.4) */

const MAX_LESSON_CHARS = 24_000;

function curriculumOutline(): string {
  return AI_LEARN_TOPIC.paths
    .map((path) => {
      const lessons = path.modules
        .flatMap((m) => m.lessons)
        .map((id) => {
          const ref = getLessonRef(id)!;
          const title = getLessonMeta(id)?.title ?? id;
          return `${ref.code} ${title} [[lesson:${id}]]`;
        });
      return `${path.letter}. ${path.title}: ${lessons.join("; ")}`;
    })
    .join("\n");
}

export function buildTutorSystemPrompt(lessonId: string): string | null {
  const source = safeLessonSource(lessonId);
  if (!source) return null;
  const { meta, body } = source;
  const model = getMentalModel(meta.model);
  const pathModels = meta.ref.path.models.map((m) => `- **${m.name}**: ${m.picture}`).join("\n");

  const prerequisites = meta.buildsOn
    .map((id) => getLessonMeta(id))
    .filter((m) => m !== null)
    .map((m) => `- ${m!.ref.code} ${m!.title} [[lesson:${m!.id}]]: ${m!.summary}`)
    .join("\n");

  const terms = Array.from(new Set(extractBodyRefs(body).terms))
    .map((id) => getTerm(id))
    .filter((t) => t !== undefined)
    .map((t) => `- ${t!.term}: ${t!.definition}`)
    .join("\n");

  let text = lessonPlainText(body);
  if (text.length > MAX_LESSON_CHARS) text = `${text.slice(0, MAX_LESSON_CHARS)}\n[…lesson truncated]`;

  return `You are the tutor inside Sphere's Learn tab. The learner is reading lesson ${meta.ref.code} "${meta.title}" in the path "${meta.ref.path.title}" and has a question.

How to teach:
- Build understanding the learner can reason with. Ground every answer in the lesson's mental picture${model ? ` ("${model.model.name}")` : ""} and extend that picture rather than switching to a new analogy. Only use an analogy if its structure truly maps onto the concept, and say where it breaks.
- Be thorough but concise: lead with the direct answer, then the reasoning. Prefer a small concrete example with numbers over abstract wording.
- If a question depends on an earlier lesson, briefly recap the idea and link it as [[lesson:id]]. If it is covered later in the curriculum, answer at the level needed now and point ahead with [[lesson:id]]. Only use lesson ids from the outline below.
- Use Markdown. Write math as $…$ inline or $$…$$ on its own line (KaTeX).
- If the question is outside the curriculum or you are unsure of a fact (especially recent market or policy facts), say so plainly.

The path's mental models:
${pathModels}

Lessons this one builds on:
${prerequisites || "- none"}

Glossary terms used in this lesson:
${terms || "- none"}

Curriculum outline:
${curriculumOutline()}

The lesson the learner is reading:
<lesson>
# ${meta.title}
${meta.summary}

${text}
</lesson>`;
}
