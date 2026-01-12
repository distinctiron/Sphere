---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
inputDocuments: ['_bmad-output/planning-artifacts/product-brief-Sphere-2025-12-30.md', '_bmad-output/analysis/brainstorming-session-2025-12-29.md']
documentCounts:
  briefCount: 1
  researchCount: 0
  brainstormingCount: 1
  projectDocsCount: 0
date: 2025-12-30
project_name: Sphere
authors:
  - SFerrum
  - BMad Analyst
---

# Product Requirements Document: Sphere

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

Sphere is an AI-powered research companion designed to democratize access to complex knowledge. It addresses "Research Overload" by shifting the focus from managing files to optimizing intellectual ROI. By leveraging LLMs to filter for "Novelty" (not just relevance) and providing an "Interactive Learning Layer" that simplifies complex concepts on demand, Sphere empowers researchers and lifelong learners to discover and comprehend groundbreaking ideas faster than ever before.

### What Makes This Special

Unlike traditional reference managers (Zotero, Mendeley) that focus on *storage*, Sphere focuses on *comprehension*. It differentiates itself through "Active Insight":
1.  **Impact Filter:** A "Novelty Index" that analyzes papers for groundbreaking potential vs. incremental progress (scoped to single-paper analysis).
2.  **Augmented Reading:** A "Click-to-Explain" interface that acts as an on-demand tutor, breaking down complex jargon and equations into simple terms.

## Project Classification

**Technical Type:** Web Application (SaaS)
**Domain:** Scientific / Research Technology
**Complexity:** Medium
**Project Context:** Greenfield - new project

**Classification Notes:**
-   **Medium Complexity:** Focuses on robust LLM API integration and standard web app patterns rather than custom model training or massive vector search infrastructure.
-   **Key Constraints:** "Novelty" analysis is scoped to single-paper analysis (local context), and "Intellisense" is implemented as an on-demand "Click-to-Explain" interaction to manage latency expectations.

## Success Criteria

### User Success
-   **Processing Velocity:** Time to reach a "Keep" or "Discard" decision < 2 mins/paper.
-   **Signal-to-Noise Ratio:** > 80% of total reading time is spent on papers the user rates as "High Value."
-   **Comprehension Confidence:** Users report feeling "ready to explain this paper to a colleague" after one reading session.

### Business Success (Depth Engagement)
-   **Deep Reading Time:** Average session duration for "Read" actions > 15 minutes (proving they are consuming, not just skimming).
-   **Feature Utilization:** > 5 "Click-to-Explain" interactions per deep-read session (validating the USP).
-   **Retention:** 30% of users return to *re-read* or reference a saved paper within 14 days.

### Technical Success
-   **Explanation Latency:** "Click-to-Explain" results generated in < 3 seconds.
-   **Parsing Accuracy:** PDF-to-HTML conversion accurately preserves equations and figures > 95% of the time.

## Product Scope

### MVP - Minimum Viable Product
-   **The Impact Filter:** Basic "Novelty" scoring and "Impact Cards" for triage.
-   **The Interactive Reader (Core USP):** High-fidelity HTML rendering, "Click-to-Explain" Intellisense, and "Simplify" features.
-   **Library:** Basic "Save" and "Collection" management.

### Growth Features (Post-MVP)
-   **Audio Triage:** Podcast generation.
-   **Social:** Sharing annotated papers with teams.

### Vision (Future)
-   **The Research OS:** A complete environment where reading connects directly to writing and coding (Jupyter integration).

## User Journeys

### Journey 1: Dr. Aris - The Hunt for the "Gem"
**Persona:** The Knowledge Hunter (Post-doc Researcher)
**Goal:** Find one groundbreaking paper for his grant proposal without wasting hours.

**The Story:**
Dr. Aris logs into Sphere on Monday morning, already stressed about his grant deadline. Usually, he'd face a daunting list of 50+ new RSS feed titles. Today, Sphere's **Impact Dashboard** greets him with just 3 "High Novelty" cards in his field.

He scans the first card. The **Novelty Index** scores it a 9.2/10, flagging a "novel optimization method" he hasn't seen before. Intrigued, he clicks. He doesn't read the whole PDF yet; he checks the "Why it Matters" summary. It confirms this method could solve his current bottleneck.

He saves it to his "Grant Refs" collection. In 5 minutes, he found the "gem" that usually takes him all morning. He feels relieved and confident he's on the bleeding edge.

**Requirements Revealed:**
-   **Impact Dashboard:** Must prioritize "Novelty" over timestamp.
-   **Novelty Index:** Must clearly explain *why* a paper is novel.
-   **Triage Speed:** "Save" action must be one click from the card.

### Journey 2: Sarah - Decoding the Black Box
**Persona:** The Lifelong Learner (Senior Software Engineer)
**Goal:** Understand "Attention Mechanisms" to implement a feature, without getting stuck on the math.

**The Story:**
Sarah opens the seminal "Attention is All You Need" paper in Sphere. She's a great coder but feels intimidated by the dense mathematical notation. She starts reading but hits a wall at the "Scaled Dot-Product Attention" equation.

Instead of giving up or opening 10 tabs to search for tutorials, she simply clicks the equation. Sphere's **Research Intellisense** opens an overlay: *"Think of this as a search engine query (Q) against a database of keys (K)..."*

The analogy clicks. She highlights the section and adds a note: "Implement this logic for the search feature." She finishes the paper feeling empowered, having turned abstract theory into actionable engineering knowledge.

**Requirements Revealed:**
-   **Interactive Reader:** HTML rendering that supports clicking/selecting specific elements (equations, terms).
-   **Intellisense:** "Click-to-Explain" must provide *context-aware* analogies, not just dictionary definitions.
-   **Annotation:** Ability to highlight and add personal notes.

### Journey Requirements Summary
-   **Core Capabilities:** Novelty scoring, Impact Card UI, HTML paper rendering, Context-aware LLM explanations, Annotation system.
-   **User Flows:** Rapid triage flow (Aris), Deep interactive reading flow (Sarah).

## Innovation & Validation

### Core Innovations
1.  **The Novelty Index:** Algorithmic scoring of "intellectual delta" vs. citation count.
2.  **Context-Aware Intellisense:** On-demand simplification of technical jargon.

### Validation Strategy (De-risking)
-   **Novelty Validation:** Run the "Novelty Index" on a "Golden Set" of 50 past papers (25 breakthrough, 25 incremental) and measure alignment with historical reality.
-   **Hallucination Check:** Implement a "Citation Check" where the explanation must reference a specific section of the text.

### Fallback Plan
-   If "Novelty Scoring" proves too noisy for MVP, we fallback to **"Key Insight Extraction"** (summarizing *what* the paper claims is new, without scoring it).

## Web Application Specific Requirements

### Project-Type Overview
**Type:** Single Page Application (SPA)
**Stack:** Next.js / React
**Focus:** Personal utility tool (Single User focus initially), optimized for "Deep Reading" on Desktop and "Triage" on Mobile.

### Technical Architecture Considerations
-   **Authentication:** Simple email/password login (e.g., NextAuth.js). **All content behind login.**
-   **SEO Strategy:** None required. No public indexing needed for MVP.
-   **State Management:** Local state for "Intellisense" overlays to ensure < 100ms interaction feel.

### Browser & Device Support
-   **Primary Target:** Desktop Chrome/Edge/Safari (for the "Interactive Reader").
-   **Secondary Target:** Mobile Web (iOS/Android) for "Impact Triage" on the go.
-   **Responsiveness:** Fully responsive layout. The "Reader" view must adapt gracefully to smaller screens (e.g., hiding sidebars).

### Usability Standards
-   **Accessibility:** "Good Usability" baseline. High contrast for text, readable font sizes, and clear touch targets for mobile.
-   **Performance:** "Click-to-Explain" latency < 3s. Page load < 1s.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP
**Philosophy:** "Depth First." We prioritize the *quality* of the reading experience over the *quantity* of features. The goal is to prove that "Augmented Reading" is fundamentally better than PDF reading.
**Resource Requirements:** Single Developer (Full Stack Next.js).

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
-   **Dr. Aris (Triage):** Can see a list of high-novelty papers and save them.
-   **Sarah (Deep Read):** Can read a paper in HTML and use "Click-to-Explain."

**Must-Have Capabilities:**
1.  **Interactive Reader:** High-fidelity HTML rendering of papers.
2.  **Research Intellisense:** "Click-to-Explain" overlay for terms/equations.
3.  **Impact Filter:** Simple list view sorted by "Novelty Score."
4.  **Personal Library:** "Save" button and "My Reading List" view.
5.  **Auth:** Simple Email/Password login.

### Post-MVP Features

**Phase 2 (Growth - "The Flow"):**
-   **Search Profiles:** Saved searches that push new papers to the dashboard.
-   **Audio Triage:** Podcast generation for saved papers.
-   **Annotations:** Highlighting and note-taking persistence.

**Phase 3 (Expansion - "The Ecosystem"):**
-   **Social:** Sharing annotated papers.
-   **Knowledge Graph:** Visualizing connections between papers.
-   **Jupyter Integration:** Executable code blocks.

### Risk Mitigation Strategy

**Technical Risks:**
-   **PDF Parsing Quality:** If parsing fails, the Reader fails. *Mitigation:* Fallback to "PDF View with Sidebar Summary" for complex papers.
-   **LLM Latency:** If explanations are slow, flow breaks. *Mitigation:* Optimistic UI and streaming responses.

**Market Risks:**
-   **"Novelty" Subjectivity:** Users might disagree with the score. *Mitigation:* Always show the "Why" summary next to the score to justify it.

## Functional Requirements

### Authentication & User Management
-   **FR1:** User can sign up and log in using an email and password.
-   **FR2:** User can reset their password via email link.
-   **FR3:** User can view their account profile details.

### Content Discovery (Impact Dashboard)
-   **FR4:** User can view a dashboard of recommended papers sorted by "Novelty Score."
-   **FR5:** User can view the "Impact Card" for a paper, displaying Title, Authors, Novelty Score, and "Why it Matters" summary.
-   **FR6:** User can filter the dashboard by specific research fields.
-   **FR7:** User can "Add to List" directly from the Impact Card.
-   **FR8:** User can "Dismiss" a paper to hide it from the dashboard.

### Interactive Reader (The Core Experience)
-   **FR9:** User can open a paper in a distraction-free HTML reading view.
-   **FR10:** User can click on specific technical terms or equations to trigger an "Intellisense" overlay.
-   **FR11:** User can view a simplified explanation or analogy in the Intellisense overlay.
-   **FR12:** User can open a "Chat with Paper" side pane to ask free-form questions about the document content.
-   **FR13:** User can view the original PDF (fallback view) if HTML rendering fails.

### To-Read List & Progress
-   **FR14:** User can view their personal "To-Read" list.
-   **FR15:** User can manually reorder papers in the "To-Read" list to set their own priority.
-   **FR16:** User can mark a paper as "Read" (archiving it from the active list).
-   **FR17:** User can remove papers from the list.

## Non-Functional Requirements

### Performance
-   **Interaction Latency:** "Click-to-Explain" and "Chat" responses must start streaming or display within 3 seconds.
-   **Page Load:** Application initial load time < 1 second on broadband connections.

### Reliability
-   **Graceful Degradation:** If LLM services are unavailable, the application must remain usable for reading (fallback to standard view) and display a clear "Service Busy" notification.
-   **Error Handling:** All LLM failures must be handled without crashing the application state.

### Security
-   **Data Protection:** User passwords must be hashed and salted.
-   **Personal Data:** User notes and reading history must be stored securely and accessible only to the authenticated user.
