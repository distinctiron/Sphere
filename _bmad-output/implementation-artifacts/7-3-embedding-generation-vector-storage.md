# Story 7.3: Embedding Generation & Vector Storage

Status: review

## Story

As a system component,
I want to generate embeddings for paper chunks and store them for similarity search,
so that the RAG system can find relevant chunks based on semantic similarity.

## Acceptance Criteria

1. **Given** paper chunks have been created
   **When** embedding generation is triggered
   **Then** embeddings are generated for all chunks using an embedding model (e.g., OpenAI text-embedding-3-small)
   **And** embeddings are generated in batch for efficiency
   **And** each embedding is associated with its chunk via chunk_id

2. **Given** embeddings are generated
   **When** embeddings are stored
   **Then** embeddings are stored in the paper_chunks table (embedding field)
   **And** embeddings are stored in a format suitable for vector similarity search
   **And** vector search capabilities are configured (SQLite + sqlite-vss or dedicated vector DB)

3. **Given** embedding generation
   **When** the embedding API is unavailable or rate-limited
   **Then** the error is handled gracefully
   **And** chunks remain in the database without embeddings
   **And** embedding generation can be retried later
   **And** papers can still be accessed (RAG retrieval will work once embeddings are generated)

4. **Given** embeddings are stored
   **When** a paper's content is updated
   **Then** embeddings are regenerated for affected chunks
   **And** old embeddings are replaced with new ones
   **And** vector search continues to work correctly

## Tasks / Subtasks

- [ ] Task 1: Create Embedding Service (AC: 1)
  - [ ] Create `lib/rag/embeddings.ts`
  - [ ] Integrate with OpenAI embedding API (text-embedding-3-small)
  - [ ] Implement batch processing for efficiency
  - [ ] Associate embeddings with chunk IDs

- [ ] Task 2: Store Embeddings (AC: 2)
  - [ ] Update paper_chunks table with embeddings
  - [ ] Ensure format is suitable for vector search
  - [ ] Test vector search capabilities

- [ ] Task 3: Error Handling (AC: 3)
  - [ ] Handle API unavailability gracefully
  - [ ] Handle rate limiting
  - [ ] Implement retry logic
  - [ ] Ensure graceful degradation

- [ ] Task 4: Embedding Updates (AC: 4)
  - [ ] Detect when paper content changes
  - [ ] Regenerate embeddings for affected chunks
  - [ ] Replace old embeddings

## Dev Notes

**Key Files to Create:**
- `lib/rag/embeddings.ts` - Embedding generation service
- `app/api/papers/[id]/embed/route.ts` - Trigger embedding generation (optional)

**Embedding Model:**
- Use OpenAI `text-embedding-3-small` (cost-effective, good performance)
- Batch process for efficiency
- Store as JSON array in database

**Environment Variables:**
- `OPENAI_API_KEY` - For embedding API calls

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.3] - Complete story requirements
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)

## Dev Agent Record

### Implementation Notes

OpenAI text-embedding-3-small (OPENAI_API_KEY, or LLM_API_KEY when LLM_PROVIDER=openai), batched 96/request with SDK retries; local feature-hashing fallback when no key. Embedding failures keep chunks (rag_status CHUNKED) for retry. Content hash skips unchanged papers; per-chunk hashes reuse embeddings of unchanged chunks; model changes trigger re-embedding.

### File List

- `lib/rag/embeddings.ts`
- `lib/rag/indexer.ts`
- `lib/rag/embeddings.test.ts`
