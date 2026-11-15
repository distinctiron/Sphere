import { compileMDX } from "next-mdx-remote/rsc";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { createLessonComponents } from "@/components/learn/mdx-components";

export const MDX_OPTIONS = {
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [rehypeKatex],
};

/** Compiles a lesson's MDX body into React (server only) */
export async function renderLessonBody(lessonId: string, body: string) {
  const { content } = await compileMDX({
    source: body,
    components: createLessonComponents(lessonId),
    options: { parseFrontmatter: false, mdxOptions: MDX_OPTIONS },
  });
  return content;
}
