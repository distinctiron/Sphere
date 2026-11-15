# Story 7.4: Retrieval Service & Similarity Search

Status: review

## Story

As a system component,
I want to retrieve relevant document chunks based on semantic similarity,
so that the RAG system can provide accurate context for user queries.

## Acceptance Criteria

1. **Given** a user asks a question about a paper
   **When** the retrieval service processes the query
   **Then** an embedding is generated for the user's question
   **And** vector similarity search is performed to find top-k most relevant chunks (default top-3)
   **And** chunks are ranked by cosine similarity score
   **And** the top-k chunks are returned with their similarity scores

2. **Given** retrieval service
   **When** similarity search is performed
   **Then** the search is scoped to the specific paper (paper_id filter)
   **And** search results include chunk content, section_type, and similarity scores
   **And** results are sorted by relevance (highest similarity first)

3. **Given** retrieval service
   **When** no relevant chunks are found (low similarity scores)
   **Then** the service returns an empty result or falls back to full document context
   **And** an appropriate message is logged
   **And** the system handles the case gracefully

4. **Given** retrieval optimization
   **When** common queries are made (e.g., "What is the main contribution?")
   **Then** retrieval results can be cached for performance
   **And** cache invalidation is handled when paper content changes

## Tasks / Subtasks

- [ ] Task 1: Create Retrieval Service (AC: 1, 2)
  - [ ] Create `lib/rag/retriever.ts`
  - [ ] Implement query embedding generation
  - [ ] Implement vector similarity search (cosine similarity)
  - [ ] Implement top-k retrieval
  - [ ] Filter by paper_id
  - [ ] Return chunks with similarity scores

- [ ] Task 2: Vector Search Implementation (AC: 1, 2)
  - [ ] Configure vector search (SQLite + sqlite-vss or dedicated DB)
  - [ ] Implement cosine similarity calculation
  - [ ] Test similarity search performance

- [ ] Task 3: Error Handling (AC: 3)
  - [ ] Handle no results gracefully
  - [ ] Implement fallback to full document
  - [ ] Log appropriate messages

- [ ] Task 4: Caching (AC: 4)
  - [ ] Implement retrieval result caching
  - [ ] Handle cache invalidation
  - [ ] Cache common queries

## Dev Notes

**Key Files to Create:**
- `lib/rag/retriever.ts` - Retrieval service
- `lib/rag/vector-search.ts` - Vector search implementation

**Retrieval Strategy:**
- Generate query embedding
- Perform cosine similarity search
- Return top-k chunks (default 3)
- Include similarity scores for transparency

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.4] - Complete story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Retrieval-Strategy] - Retrieval architecture

## Dev Agent Record

### Implementation Notes

Top-k (default 3) cosine search scoped to one paper, threshold per model (0.25 OpenAI / 0.08 local); statuses ok / not_indexed / no_match. Chat falls back to an overview (abstract, conclusion, introduction) on no_match, and to extracted full text when not indexed. LRU caches for chunk vectors, query embeddings and results, invalidated on re-index.

### File List

- `lib/rag/retriever.ts`
- `lib/rag/cache.ts`
- `lib/rag/context.ts`
- `lib/rag/retriever.test.ts`
