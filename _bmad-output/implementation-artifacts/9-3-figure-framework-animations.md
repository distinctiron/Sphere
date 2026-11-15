# Story 9.3: Figure Framework & Animations

Status: review

## Story

As a learner,
I want animated and interactive figures that convey meaning,
so that I build a visual mental model of each concept.

## Acceptance Criteria

1. Figures play when scrolled into view, pause off-screen, support pause/replay, and respect prefers-reduced-motion
2. Figures fit phone width without horizontal scroll with readable text

## Tasks / Subtasks

- [x] `components/learn/figure.tsx` (lazy registry, client-only render, IntersectionObserver, playback context)
- [x] `components/learn/figures/kit.tsx` (palette, FigureSvg, Slider, ChoiceButtons, useAnimationFrame)
- [x] `figures.css` (pause/reduced-motion rules, math/table overflow)
- [x] Per-path registries `components/learn/figures/<path>/index.ts`
- [x] Overview thread figure `shared/ai-thread.tsx`

## Dev Notes

Staged-loop idiom follows the ArtifactCreator ai-concepts-defence reference (base layer + overlays on one keyframe with per-stage delays).
