---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: ['_bmad-output/analysis/brainstorming-session-2025-12-29.md']
date: 2025-12-30
author: SFerrum
---

# Product Brief: Sphere

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

**Sphere** is an AI-powered research companion designed to transform how researchers discover and consume knowledge. In an era of exponential publication growth, Sphere shifts the paradigm from "managing PDF lists" to "optimizing intellectual ROI." It features a novel **Impact Filter** that prioritizes groundbreaking potential over simple keyword relevance, and an **Interactive Learning Layer** that augments the reading experience with on-demand, context-aware explanations. Sphere doesn't just help you find papers; it helps you master them.

---

## Core Vision

### Problem Statement
Researchers are drowning in a flood of new publications. The traditional "search and read" workflow is broken: users waste hours triaging irrelevant papers based on vague abstracts, and struggle to efficiently comprehend complex concepts in static PDF formats. The result is "Research Overload"—high effort, low insight.

### Problem Impact
-   **Missed Breakthroughs:** Groundbreaking ideas are buried under incremental research.
-   **Cognitive Fatigue:** Triage consumes mental energy needed for deep thinking.
-   **Inefficient Learning:** Passive reading of dense academic text is slow and often fails to transfer deep understanding.

### Why Existing Solutions Fall Short
Current tools (Google Scholar, Zotero, etc.) are essentially "digital librarians"—they manage lists of files. They optimize for *storage and retrieval*, not for *insight and learning*. They treat all papers as equal documents, failing to distinguish "groundbreaking" from "incremental," and offer no support during the actual reading process.

### Proposed Solution
**Sphere** is an "Intellectual Augmentation" platform.
1.  **The Impact Filter (Triage):** Replaces the article list with an **Impact Dashboard**. It uses LLMs to calculate a **Novelty Index**, surfacing papers with true groundbreaking potential.
2.  **The Interactive Learning Layer (Deep Dive):** Transforms static text into an active learning environment. **Research Intellisense** allows users to hover over complex terms for tailored explanations, effectively "interviewing" the paper.

### Key Differentiators
-   **Novelty Index:** We rank by "Groundbreaking Potential," not just citation count or keyword match.
-   **Augmented Reading:** We don't just display text; we explain it. The app acts as an active tutor, not a passive reader.
-   **Core Philosophy:** "Augment thinking, don't replace it." We keep the user in the driver's seat of discovery.

## Success Metrics

### User Success (The "Aha!" Moment)
-   **Triage Efficiency:** Users spend < 5 seconds deciding to "Read" or "Skip" a paper using Impact Cards.
-   **Comprehension Speed:** Users report understanding core concepts 50% faster compared to traditional PDF reading (measured via in-app feedback).
-   **Discovery Rate:** Users find at least 1 "High Impact" paper per week that they would have otherwise missed.

### Business Objectives (MVP Phase)
-   **Engagement:** Daily Active Users (DAU) / Monthly Active Users (MAU) ratio > 20% (indicating habit formation).
-   **Retention:** 40% of users who highlight at least one paper return the following week.
-   **Growth:** Organic growth via "Share Impact Card" feature (viral loop).

### Key Performance Indicators (KPIs)
-   **Novelty Accuracy:** % of papers marked "High Novelty" that are subsequently cited or shared (long-term quality signal).
-   **Intellisense Usage:** Average number of "Hover Explanations" triggered per reading session (proxy for active learning).
-   **Triage-to-Read Conversion:** % of papers saved from the Impact Dashboard that are actually opened and read.

## MVP Scope

### Core Features

**1. The Impact Filter (Home Screen)**
-   **Impact Cards:** Replaces the standard article list. Displays "Relevance Score" (0-10) and "Why it Matters" summary.
-   **Novelty Index:** A specific filter to sort papers by "Groundbreaking Potential" vs. "Incremental Progress."
-   **Reverse Search:** Users set up "Research Profiles" (e.g., "Generative AI for Healthcare"), and the system pushes relevant papers to them.

**2. The Interactive Learning Layer (Reader)**
-   **Interactive Document:** A clean, distraction-free reading interface (HTML-based, not PDF).
-   **Research Intellisense:** Hover over technical terms to see context-aware definitions and analogies.
-   **On-Demand Explainers:** Highlight any text block to trigger an "Explain this" prompt (options: "Simplify", "Technical Detail", "Code Example").

### Out of Scope for MVP
-   **Audio/Podcast Generation:** Deferred to V2. Focus on text comprehension first.
-   **Executable Code:** Running code directly in the browser is too complex for MVP.
-   **Social/Community Features:** No commenting, sharing profiles, or "following" other users yet.
-   **Mobile App:** Web-first (desktop/tablet optimized) for deep reading.

### MVP Success Criteria
-   **Technical:** LLM generates "Novelty Scores" that align with human expert judgment > 80% of the time.
-   **User:** 50% of beta users save at least 3 papers per week.
-   **Business:** Waitlist conversion rate > 10% upon launch.

### Future Vision
-   **V2:** "Audio Triage" (listen to papers on commute).
-   **V3:** "The Lab" (executable papers with Jupyter integration).
-   **Long-term:** A "Research OS" that connects reading, writing, and coding in one unified workspace.

## Target Users

### Primary Users

**"The Knowledge Hunter" (Academic/R&D Researcher)**
-   **Role:** PhD Student, Post-doc, or R&D Engineer.
-   **Context:** Under constant pressure to stay on the "bleeding edge." Reads 20+ papers a week but feels they are missing the "important" ones.
-   **Pain Point:** "FOMO" (Fear Of Missing Out) on groundbreaking research. Wastes hours reading incremental papers that looked good in the abstract.
-   **Goal:** To find the *one* paper that changes their research direction, and to understand it deeply and quickly.
-   **Success:** "I found a paper in 5 minutes that saved me 3 months of work."

**"The Lifelong Learner" (Tech Professional)**
-   **Role:** Software Engineer, Data Scientist, or Product Manager.
-   **Context:** Wants to keep up with AI/Tech trends but isn't an academic. Finds raw PDFs intimidating and dense.
-   **Pain Point:** "I want to understand 'Attention is All You Need', but the math goes over my head."
-   **Goal:** To grasp the *concepts* and *implications* of new research without needing a PhD in the specific sub-field.
-   **Success:** "I finally understand how Transformers work because the app explained the equations to me."

### Secondary Users
-   **Content Creators:** Tech bloggers/YouTubers who need to summarize new research for their audience.
-   **Investors/VCs:** Looking for "Novelty" signals to identify emerging trends before they become mainstream.

### User Journey

**1. Discovery (The Hook):**
-   User receives a "Daily Impact Brief" notification: *"3 New Papers with High Novelty Scores in Generative AI."*
-   Instead of a list of titles, they see **Impact Cards** highlighting *why* these papers matter.

**2. Triage (The Filter):**
-   User scans the **Novelty Index**. One paper scores 9.5/10 for "Methodological Innovation."
-   They read the "Why it Matters" summary (generated by LLM) and decide to dive in.

**3. Deep Dive (The Learning):**
-   User opens the **Interactive Reader**.
-   They encounter a complex term ("KL Divergence"). They hover over it. **Research Intellisense** explains it using a simple analogy ("It's like measuring the distance between two probability distributions").
-   They highlight a confusing section and ask: "Explain this like I'm a Junior Dev." The app provides a simplified breakdown.

**4. Synthesis (The Value):**
-   User finishes the paper with a clear mental model. They save it to their "Breakthroughs" collection.
-   They feel smarter and more informed in 20 minutes than they usually do in 2 hours.
