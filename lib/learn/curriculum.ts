/**
 * Learn tab curriculum (Epic 9). Client-safe: structure only.
 *
 * Lesson bodies live in content/learn/<path>/<lesson>.mdx; this registry fixes
 * the order (paths → modules → lessons) and the mental models each path is
 * built on. Keyed by topic so topics other than AI can be added later
 * (mirrors lib/news/topics.ts).
 */

export type PathId = "math" | "compute" | "building" | "economy";

export interface MentalModel {
  id: string;
  name: string;
  /** One-paragraph statement of the picture, shown on path pages and given to the tutor */
  picture: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  lessons: string[];
}

export interface CurriculumPath {
  id: PathId;
  letter: "A" | "B" | "C" | "D";
  title: string;
  short: string;
  blurb: string;
  /** Tailwind colour family used for accents */
  color: "indigo" | "emerald" | "amber" | "rose";
  models: MentalModel[];
  modules: CurriculumModule[];
}

export interface LearnTopic {
  id: string;
  label: string;
  /** The end-to-end picture that ties the paths together */
  thread: string;
  paths: CurriculumPath[];
  /** Suggested order; paths in the same inner array can be read in parallel */
  route: PathId[][];
}

export const AI_LEARN_TOPIC: LearnTopic = {
  id: "ai",
  label: "AI",
  thread:
    "A word becomes a vector; vectors are transformed by matrix multiplications running on chips; chips turn watts into arithmetic inside data centers; data centers need capital, power and supply chains; whoever controls the bottlenecks in that chain holds economic and strategic leverage.",
  route: [["math", "compute"], ["building"], ["economy"]],
  paths: [
    {
      id: "math",
      letter: "A",
      title: "The Math of Neural Networks & LLMs",
      short: "Math",
      blurb:
        "From vectors to transformers: how meaning becomes geometry, how networks reshape that geometry, and how training finds the right shape.",
      color: "indigo",
      models: [
        {
          id: "meaning-is-geometry",
          name: "Meaning is geometry",
          picture:
            "Everything a model handles (words, images, concepts) is a point or direction in a high-dimensional vector space. Similar things point in similar directions; each dimension is an axis along which a representation can express nuance. A network layer is a transformation of this space: it rotates, stretches and folds it so that things that belong together end up near each other. A transformer keeps a running vector per token, the residual stream, which every block reads from and adds to.",
        },
        {
          id: "loss-landscape",
          name: "Learning is walking downhill",
          picture:
            "Every setting of a model's parameters is a location on an enormous landscape whose height is the loss: how wrong the model is. Training starts somewhere random and repeatedly takes a small step in the steepest downhill direction (the negative gradient). The shape of the landscape, the step size and the data that defines it decide where the model ends up.",
        },
      ],
      modules: [
        { id: "foundations", title: "Foundations", lessons: ["vectors", "matrices", "derivatives", "probability"] },
        {
          id: "neural-networks",
          title: "Neural networks",
          lessons: ["neuron", "forward-pass", "gradient-descent", "backpropagation", "training-in-practice"],
        },
        {
          id: "llms",
          title: "From networks to LLMs",
          lessons: ["embeddings", "attention", "transformer", "pretraining", "sampling", "post-training"],
        },
      ],
    },
    {
      id: "compute",
      letter: "B",
      title: "Compute: From Silicon to Data Centers",
      short: "Compute",
      blurb:
        "Why AI runs on GPUs, why memory and power are the real limits, and what it takes to host and serve a model.",
      color: "emerald",
      models: [
        {
          id: "feeding-the-math",
          name: "Arithmetic is cheap; moving data and power is what costs",
          picture:
            "A modern chip can do far more arithmetic per second than its memory can feed it with numbers. Almost every design choice, from CPU caches to GPU high-bandwidth memory, chip-to-chip links, data-center networks and grid connections, exists to keep the arithmetic units fed with data and supplied with power, and to carry the heat away. Any workload is limited by whichever runs out first: compute, memory bandwidth, network or power.",
        },
      ],
      modules: [
        { id: "chips", title: "Chips", lessons: ["cpu", "gpu", "memory-wall", "accelerators"] },
        { id: "scaling-out", title: "Scaling out", lessons: ["distributed-training", "data-center", "energy"] },
        { id: "serving", title: "Serving models", lessons: ["inference", "serving-at-scale", "hosting"] },
      ],
    },
    {
      id: "building",
      letter: "C",
      title: "Building with AI: Agents & Harness Engineering",
      short: "Building",
      blurb:
        "How applications are built around models: APIs, context, tools, retrieval, agents, harnesses, skills and the reliability and security work around them.",
      color: "amber",
      models: [
        {
          id: "context-machine",
          name: "The model is a stateless function from context to next token",
          picture:
            "A language model remembers nothing between calls. Each call takes a context (instructions, conversation, documents, tool results) and continues it. Everything around the model, the harness, decides what goes into that context and what to do with what comes out: tools, retrieval, memory, skills, sub-agents and compaction are all ways of managing the context inside a loop.",
        },
      ],
      modules: [
        { id: "foundations", title: "Talking to models", lessons: ["model-api", "context-engineering", "tool-use", "rag"] },
        { id: "agents", title: "Agents & harnesses", lessons: ["agent-loop", "harness-engineering", "skills-mcp"] },
        { id: "production", title: "Production", lessons: ["evals", "agent-security"] },
      ],
    },
    {
      id: "economy",
      letter: "D",
      title: "The AI Economy & Geopolitics",
      short: "Economy",
      blurb:
        "Who builds what in the AI stack, where the money and power flow, and why data centers and chips have become matters of national security.",
      color: "rose",
      models: [
        {
          id: "follow-the-bottleneck",
          name: "Follow the bottleneck, and who controls it",
          picture:
            "The AI build-out is a chain of inputs (lithography tools, fabs, memory, packaging, power, land, capital, talent, data) feeding models and products. Output is limited by the scarcest link, and profits and leverage accumulate with whoever controls a link that others cannot route around. Governments act on the same map: they try to secure the chokepoints they depend on and deny the ones their rivals depend on.",
        },
      ],
      modules: [
        { id: "players", title: "The players", lessons: ["value-chain", "semiconductors", "hyperscalers", "labs"] },
        { id: "economics", title: "The economics", lessons: ["unit-economics", "buildout"] },
        { id: "geopolitics", title: "Geopolitics & security", lessons: ["export-controls", "sovereign-ai", "national-security"] },
      ],
    },
  ],
};

export const LEARN_TOPICS: Record<string, LearnTopic> = { ai: AI_LEARN_TOPIC };

export interface LessonRef {
  id: string;
  /** e.g. "C3" */
  code: string;
  path: CurriculumPath;
  module: CurriculumModule;
  /** Position within the path (0-based) */
  index: number;
  /** Position in the suggested route across all paths (0-based) */
  order: number;
}

function buildIndex(topic: LearnTopic): Map<string, LessonRef> {
  const index = new Map<string, LessonRef>();
  const pathOrder = topic.route.flat();
  let order = 0;
  for (const pathId of pathOrder) {
    const path = topic.paths.find((p) => p.id === pathId)!;
    let i = 0;
    for (const module of path.modules) {
      for (const id of module.lessons) {
        if (index.has(id)) throw new Error(`Duplicate lesson id in curriculum: ${id}`);
        index.set(id, { id, code: `${path.letter}${i + 1}`, path, module, index: i, order: order++ });
        i++;
      }
    }
  }
  return index;
}

const LESSON_INDEX = buildIndex(AI_LEARN_TOPIC);

export function getLessonRef(id: string): LessonRef | undefined {
  return LESSON_INDEX.get(id);
}

export function allLessonRefs(): LessonRef[] {
  return Array.from(LESSON_INDEX.values());
}

export function getPath(id: string): CurriculumPath | undefined {
  return AI_LEARN_TOPIC.paths.find((p) => p.id === id);
}

export function pathLessonIds(path: CurriculumPath): string[] {
  return path.modules.flatMap((m) => m.lessons);
}

export function lessonHref(id: string): string {
  const ref = LESSON_INDEX.get(id);
  return ref ? `/learn/${ref.path.id}/${id}` : "/learn";
}

export function getMentalModel(id: string): { model: MentalModel; path: CurriculumPath } | undefined {
  for (const path of AI_LEARN_TOPIC.paths) {
    const model = path.models.find((m) => m.id === id);
    if (model) return { model, path };
  }
  return undefined;
}

/**
 * Whether `target` may be taught-from ("recalled") inside `from`: it must come
 * earlier in its own path, or belong to a path that precedes `from`'s path in
 * the suggested route (or be an explicit prerequisite, checked by the caller).
 */
export function isEarlierLesson(target: string, from: string): boolean {
  const t = LESSON_INDEX.get(target);
  const f = LESSON_INDEX.get(from);
  if (!t || !f || t.id === f.id) return false;
  if (t.path.id === f.path.id) return t.index < f.index;
  const stage = (p: PathId) => AI_LEARN_TOPIC.route.findIndex((group) => group.includes(p));
  return stage(t.path.id) < stage(f.path.id);
}

export const PATH_ACCENTS: Record<CurriculumPath["color"], { text: string; bg: string; border: string; bar: string; soft: string }> = {
  indigo: { text: "text-indigo-700", bg: "bg-indigo-600", border: "border-indigo-200", bar: "bg-indigo-500", soft: "bg-indigo-50" },
  emerald: { text: "text-emerald-700", bg: "bg-emerald-600", border: "border-emerald-200", bar: "bg-emerald-500", soft: "bg-emerald-50" },
  amber: { text: "text-amber-700", bg: "bg-amber-600", border: "border-amber-200", bar: "bg-amber-500", soft: "bg-amber-50" },
  rose: { text: "text-rose-700", bg: "bg-rose-600", border: "border-rose-200", bar: "bg-rose-500", soft: "bg-rose-50" },
};
