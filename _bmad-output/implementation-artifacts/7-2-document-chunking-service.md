# Story 7.2: Document Chunking Service

Status: review

## Story

As a system component,
I want to split papers into semantic chunks with overlap,
so that the RAG system can retrieve relevant sections efficiently.

## Acceptance Criteria

1. **Given** a paper's HTML content is available
   **When** the chunking service processes the paper
   **Then** the paper is split into semantically meaningful sections (abstract, introduction, methods, results, discussion, conclusion)
   **And** chunks are sized optimally (500-1000 tokens per chunk)
   **And** chunks include overlap (50-100 tokens) between adjacent chunks to preserve context
   **And** each chunk retains metadata: section_type, chunk_index, start_position, end_position

2. **Given** chunking is performed
   **When** chunks are created
   **Then** section boundaries are identified correctly (using HTML structure or heuristics)
   **And** chunk content is extracted as plain text (HTML tags removed or preserved as needed)
   **And** chunk_index reflects the order within each section
   **And** start_position and end_position track character positions in the original document

3. **Given** chunking service
   **When** a paper is processed
   **Then** all chunks are created and stored in the paper_chunks table
   **And** chunks are associated with the paper via paper_id
   **And** chunking can be triggered when a paper is first fetched or on-demand

4. **Given** chunking errors
   **When** chunking fails for a paper
   **Then** the error is logged
   **And** the paper remains in the database (chunks are optional)
   **And** chunking can be retried later

## Tasks / Subtasks

- [ ] Task 1: Create Chunking Service (AC: 1, 2)
  - [ ] Create `lib/rag/chunker.ts`
  - [ ] Implement semantic section detection (HTML parsing or heuristics)
  - [ ] Implement chunking algorithm with overlap
  - [ ] Implement token counting (use tiktoken or similar)
  - [ ] Extract plain text from HTML
  - [ ] Track positions and metadata

- [ ] Task 2: Chunk Storage (AC: 3)
  - [ ] Create API route or service to trigger chunking
  - [ ] Store chunks in paper_chunks table
  - [ ] Associate chunks with paper_id
  - [ ] Handle chunking on paper fetch or on-demand

- [ ] Task 3: Error Handling (AC: 4)
  - [ ] Implement error handling and logging
  - [ ] Ensure papers remain accessible without chunks
  - [ ] Implement retry mechanism

## Dev Notes

**Key Files to Create:**
- `lib/rag/chunker.ts` - Chunking service
- `lib/rag/types.ts` - TypeScript types for chunks
- `app/api/papers/[id]/chunk/route.ts` - Trigger chunking endpoint (optional)

**Chunking Strategy:**
- Parse HTML structure to identify sections
- Use heuristics if HTML structure is unclear
- Maintain overlap between chunks for context preservation
- Size chunks optimally for embedding models

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.2] - Complete story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Document-Chunking-Strategy] - Chunking architecture

## Dev Agent Record

### Implementation Notes

Parses arXiv LaTeXML HTML (node-html-parser): sections from ltx_abstract/ltx_section/ltx_appendix (generic h1-h3 fallback), math kept as LaTeX alttext, bibliography/page chrome dropped. Chunks of ~500-1000 tokens (4 chars/token heuristic) ending on paragraph/sentence boundaries, ~75 token overlap, never crossing sections, exact character offsets, paragraph-level anchor ids. Papers without HTML (404) are indexed from the abstract. Triggered on reader open, by the rag-indexing job, or POST /api/papers/[id]/rag.

### File List

- `lib/rag/chunker.ts`
- `lib/rag/types.ts`
- `lib/rag/indexer.ts`
- `app/api/papers/[id]/rag/route.ts`
- `lib/jobs/rag-indexing.ts`
- `lib/rag/chunker.test.ts`
