# Authoring Learn lessons

This guide keeps the 43 lessons in `content/learn` consistent. Read it fully before writing a lesson. Read both exemplar lessons too: `math/forward-pass.mdx` and `compute/inference.mdx`, along with their figures. They set the quality bar.

## What we are building

A learner who finishes a path should hold a **mental picture** they can reason with. With it they should be able to:
- answer questions the lesson never asked;
- read a news story or paper in that area and place it;
- extend their own knowledge.

That is the goal, not memorised facts or equations.

Each lesson is **thorough but concise**. Aim for 1,200–2,000 words, 8–12 minutes. Every paragraph must earn its place.

## The mental models (the backbone)

Each path is built on one or two holistic pictures, defined in `lib/learn/curriculum.ts`. **Every lesson extends its path's picture** and says how.

| Path | Model id | Picture |
|---|---|---|
| A Math | `meaning-is-geometry` | Everything is a point or direction in a high-dimensional space. Similarity is direction. Dimensions are axes of nuance. Layers transform the space. The residual stream is a shared vector workspace. |
| A Math | `loss-landscape` | Parameters are a location on a landscape whose height is the loss. Training walks downhill along the negative gradient. |
| B Compute | `feeding-the-math` | Arithmetic is cheap. Moving data and power (and removing heat) is what costs. Every workload is limited by whichever runs out first: compute, memory bandwidth, network or power. The roofline is the lens. |
| C Building | `context-machine` | The model is a stateless function from context to next token. The harness decides what goes into the context and what to do with the output, inside a loop. |
| D Economy | `follow-the-bottleneck` | A chain of scarce inputs. Output is limited by the scarcest link. Profit and leverage go to whoever controls a link others cannot route around. States act on the same map. |

This is the quality we want. The user gave this example of a *good* picture: "Language is a vector space where concepts are vectors and similarity is the direction they point in." It naturally lets the learner deduce new things, for example that languages with more dimensions can express more nuance. Build pictures like that.

**Rules**
- **The picture comes before the math.** Equations then *name* what the reader already sees, e.g. "the dot product *is* the alignment you watched in Figure 1." Tie every symbol back to the picture.
- **No cheap analogies.** Only use an analogy when its *structure* maps onto the concept: same moving parts, same relationships. Every analogy must say where it breaks. Never use one that only holds for the one example you picked or needs squinting ("a GPU is like a restaurant kitchen…"). When in doubt, use the real thing with small numbers instead.
- **"Reason with it" is mandatory.** Give 2–3 non-obvious conclusions the reader can *derive* from the picture. Phrase them as a question followed by the derivation, not as trivia. Examples:
  - *Why is generating text slower per token than reading a prompt?* From the roofline, decode moves all the weights for one token's worth of math…
  - *Why does a larger embedding dimension help, and when does it stop helping?*
- **Concrete over abstract.** Use small worked examples with real numbers (a 2-D vector, a 3-neuron layer, a 7B model in FP16 = 14 GB).

## Lesson template (sections are `##` headings, in this order)

1. *(no heading)* **Opening**: 1–2 short paragraphs. Pose the question this lesson answers and why the reader should care. Connect it to what they see in the news where natural.
2. `## The picture` *(required)*: the mental picture for this lesson, as an extension of the path's model. The main `<Figure>` normally goes here.
3. `## <Mechanism headings…>`: one to three sections with descriptive titles (e.g. `## From one neuron to a layer`). Math goes here. Use `<Recall>` for earlier concepts (see below).
4. **A worked example**: an `<Example>` block inside a mechanism section, or its own section.
5. `## Reason with it` *(required)*: 2–3 deductions, each a bold question followed by the reasoning.
6. `## Where this picture breaks` *(required)*: the limits of the picture and of any analogy used. Say what a more complete view adds and where it is taught (`<Preview>` or `<LessonLink>`).
7. `## Why it matters in the feed` *(recommended)*: how this shows up in the news and papers Sphere shows, e.g. "When a lab announces a 1M-token context window, …". No dated claims unless the lesson has `reviewed:`.
8. `## Recap` *(required)*: 3–5 bullets that connect the new idea to what was recalled.

The page adds these automatically, so do not write them:
- a **"You'll use"** box (from `buildsOn`);
- **"Where this comes back"** (the reverse of `buildsOn`);
- **related** lessons;
- **the quiz** (from frontmatter).

## Reinforcing without circularity

- **Recall earlier lessons explicitly.** When the lesson uses a concept taught earlier, bring it back with `<Recall id="lesson-id">…one- or two-sentence recap tailored to how it's used here…</Recall>`. Also refer to it in the prose, e.g. "As we saw with tool use, …". Example: harness engineering (C6) recalls tool use (C3). Permissions wrap tool calls, and compaction manages tool results filling the context.
- **Only recall backwards.** `<Recall>` may target only:
  - a lesson in `buildsOn`, or
  - an *earlier* lesson listed in `related`. Earlier means earlier in the same path, or in a path earlier in the route: A and B come first, then C, then D.
- **Every `buildsOn` lesson must be recalled at least once.**
- **Forward references are teasers only.** Use `<Preview id="later-lesson">phrase</Preview>`, and never rely on them. A lesson must be fully understandable with only its `buildsOn` lessons read.
- **Spiral.** Core ideas return at increasing depth, e.g. matmul in A2 → A6 → B2 → B4 → B8. When revisiting, add a new angle; do not re-teach.
- **`buildsOn` must be acyclic.** Within a path it may only point to earlier lessons. Cross-path `buildsOn` (e.g. B8 builds on A11) is encouraged where it's genuinely needed.

## Frontmatter

```yaml
---
id: forward-pass            # must equal the file name and the id in lib/learn/curriculum.ts
title: Networks & the forward pass
summary: One or two sentences (≤ 320 chars) that say what the reader will understand. Used in cards, recalls and the tutor.
minutes: 10
model: meaning-is-geometry  # the mental model this lesson extends (must belong to any path)
buildsOn: [neuron, matrices] # hard prerequisites; each MUST be <Recall>-ed in the body
related: [gpu]               # useful cross-links (may be in any path, earlier or later)
keywords: ["forward pass", "hidden layer", "activation function", "multilayer perceptron", "MLP"]
reviewed: 2026-09-29         # only for lessons with time-sensitive facts (all of path D, B6–B7, B10, C1, C6–C7)
quiz:
  - question: If you remove every activation function from a 10-layer network, what can it still represent?
    options:
      - Anything a 10-layer network with activations can
      - Only what a single linear layer can
      - Nothing; the output is always zero
    answer: 1                # 0-based index into options
    explanation: A composition of linear maps is itself one linear map (one matrix), so depth adds nothing without the non-linear folds.
---
```

- **keywords** (5–10): link the lesson to News stories and papers by whole-word, case-insensitive match. Short acronyms like GPU and RAG match case-sensitively. A hit in a headline counts double, and a match needs a score of 2 or more. Prefer **specific phrases** the news actually uses ("KV cache", "export controls", "HBM", "speculative decoding", "Model Context Protocol"). Avoid generic words that would match everything ("AI", "model", "data", "chip").
- **quiz** (3–4 questions): favour **prediction and deduction** ("What happens if…", "Why would…", "Which change would help most…") over recall of wording. Where it makes sense, include one question that combines this lesson with a recalled earlier concept. Give 3–4 options with plausible distractors that reflect real misconceptions. The explanation must teach: say *why*, using the picture.

## MDX components

| Component | Use |
|---|---|
| `<Figure name="…" title="…" caption="…" notice="…" />` | An animated or interactive figure. `caption` says what it shows; `notice` is the one thing to watch for. Add `interactive` for figures with controls, or `static` for diagrams without animation (both hide play/pause). |
| `<Recall id="lesson-id">recap</Recall>` | Back-reference block (see above). |
| `<Preview id="lesson-id">phrase</Preview>` | Inline forward teaser, rendered "phrase (more in B8)". |
| `<LessonLink id="lesson-id" />` or `<LessonLink id="…">text</LessonLink>` | Inline link to any lesson. |
| `<Term id="glossary-id">text</Term>` | Glossary term with a hover definition. Use it on the **first** use of a term in a lesson, not on every use. |
| `<KeyIdea>…</KeyIdea>` | The one central idea, once per lesson, usually in "The picture". |
| `<Example title="…">…</Example>` | A worked example with numbers. |
| `<Caution>…</Caution>` | A common misconception. |

**MDX syntax pitfalls** (the content test compiles every file):
- **Frontmatter is YAML.** Quote any string that contains `: ` (colon-space), `#`, or starts with a quote or bracket, e.g. `question: "Why does X: Y happen?"`. Option order is shuffled on display, so put the answer at any index.
- `{` and `}` in prose start JavaScript expressions. Write them only inside math (`$…$`) or code (`` `…` ``).
- `<` followed by a letter starts a tag. In prose write "less than" or put it in math: `$a < b$`.
- **Math.** Inline math is `$…$`. Display math goes on its own lines:

  ```
  $$
  \mathbf{h} = \mathrm{ReLU}(W\mathbf{x} + \mathbf{b})
  $$
  ```

  It is KaTeX, so use `\mathbf`, `\mathrm`, `\operatorname`, `\tfrac`, `\cdot`, `\odot`, `\sum_{i=1}^{n}`.
- Put a blank line before and after components that wrap Markdown (`<KeyIdea>`, `<Example>`, `<Recall>`, `<Caution>`). Inside them, leave blank lines around paragraphs.
- Component props are strings. Use `"…"` quotes, and do not put `"` inside them (use ’ or “ ”).
- Tables (GFM) are fine. Keep them to four columns or fewer so they fit phones.

## Figures

Figures are React components in `components/learn/figures/<path>/<name>.tsx`, registered in `components/learn/figures/<path>/index.ts`:

```ts
export const MATH_FIGURES: FigureLoaders = {
  "forward-pass": () => import("./forward-pass"),
};
```

Names are global and kebab-case. Each file is a `"use client"` component with a **default export and no props**.

**When to animate.** Animate only when motion *is* the meaning:
- a signal propagating;
- a value changing as you drag;
- a loop repeating;
- a quantity growing.

Use a static diagram when the structure is the meaning. Use an **interactive** figure when the reader learns by varying a parameter (learning rate, temperature, arithmetic intensity, model size). Every lesson has at least one figure, and most have one or two.

**Two idioms**
1. **Staged loop (SVG + CSS)**, as in the reference deck `ArtifactCreator/out/ai-concepts-defence`.
   - A static base layer (neutral colours) sits under overlays that pulse on **one shared keyframe**. Stage timing comes from `animation-delay` per element or layer.
   - Put a `<style>{`…`}</style>` block inside the component. Prefix every class and keyframe with a short figure prefix (`fp-`, `kv-`, …) to avoid collisions.
   - The frame pauses animations automatically (`animation-play-state`) when off-screen or paused, and replays by remounting.
   - Under reduced motion the animations are removed, so **the base layer must be meaningful on its own** (show the full structure).
2. **Interactive (React state)**.
   - Use `Slider`, `ChoiceButtons`, `Controls` and `Legend` from `../kit`. Compute everything from state so the reader sees cause and effect.
   - For continuous motion use `useAnimationFrame` from `../kit`, which stops when the figure is paused or off-screen.
   - Use `useFigure()` if you need `playing` or `reducedMotion`.

**Visual rules**
- **Palette.** Use `C` from `../kit` only:
  - `primary` (indigo) for the main object;
  - `active` (rose) for flow, activity or "now";
  - `warn` (amber) for error, gradient or cost;
  - `good` (emerald) for capacity or success;
  - slate tones for structure.

  Do not use other colours.
- **Size and text.** Wrap in `FigureSvg` (or an `<svg viewBox>` with `className="block h-auto w-full"`). Design at a width of about 640–700. On a phone the figure is drawn about 340px wide, roughly half scale, so **SVG text must be 13px or larger at design width, and used sparingly** (short labels only). Put anything longer in **HTML next to or under the SVG**: readouts, explanations, changing numbers, stage descriptions. See `compute/kv-cache-calculator.tsx` and `math/space-folding.tsx`.
- **Determinism.** Figures render client-only (after mount), so hydration is not a concern. Still use a seeded PRNG rather than `Math.random`, so a figure looks the same every time.
  - If a figure needs to be wide (more than 800), provide a stacked phone variant (`hidden sm:block` / `sm:hidden`) as `shared/ai-thread.tsx` does.
- **No page overflow.** The figure must never cause horizontal page scroll.
- **Accessibility.** Give the SVG `role="img"` and an `aria-label` that states what it shows.
- **Correctness.** Numbers in figures must be correct: compute them, don't eyeball. Label axes and units.
- **Loops.** Keep a staged loop between 6 and 12 s, with a short hold at the end so the final state can be read.

## Glossary

Add the terms your lessons introduce to `content/learn/glossary/<path>.ts`:

```ts
{ id: "kv-cache", term: "KV cache", aliases: ["key-value cache"], definition: "…one or two plain sentences…", lesson: "inference" }
```

- **Ids** are global and must be unique across paths.
- **`lesson`** is the lesson that *teaches* the term.
- **Volume.** Aim for about 4–8 terms per lesson. Every `<Term id>` you use must exist, in any path's file.
- **Definitions** are plain text: no Markdown, precise, and consistent with the lesson.

## Facts and dates

- **Paths A–C** teach durable concepts. Name products and companies only as illustrations; the concept must not depend on them.
- **Path D** and a few B and C lessons contain facts that change: market shares, capex, export rules, prices.
  - Give numbers as **rounded orders of magnitude with a date** ("roughly $X bn in 2025 capex, as of mid-2026").
  - Prefer ratios and structure over point figures, and set `reviewed:`.
  - Do not invent precise figures. If unsure, describe the direction and scale qualitatively.
  - Be even-handed on politics: describe each actor's interests and constraints, not verdicts.

## Checklist before you finish a lesson

Run `npx vitest run lib/learn`. The content tests check:
- MDX compiles;
- frontmatter is valid;
- the required sections are present;
- recall, buildsOn, figure and glossary references resolve.

Then re-read the lesson against the list below.
- [ ] The picture is stated before any equation, and the main figure draws it.
- [ ] Every `buildsOn` lesson is `<Recall>`-ed, and there are no backwards `<Preview>`s.
- [ ] "Reason with it" derives new conclusions from the picture.
- [ ] "Where this picture breaks" is honest.
- [ ] The quiz tests reasoning, and its explanations teach.
- [ ] There are no cheap analogies; every analogy states its limits.
- [ ] It is 8–12 minutes long with no filler.
