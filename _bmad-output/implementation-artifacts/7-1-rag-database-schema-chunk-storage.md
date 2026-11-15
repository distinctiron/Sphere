# Story 7.1: RAG Database Schema & Chunk Storage

Status: review

## Story

As a developer,
I want to define the database schema for storing paper chunks and embeddings,
so that the RAG system can store and retrieve document chunks efficiently.

## Acceptance Criteria

1. **Given** the Prisma schema file exists
   **When** I define the PaperChunk model
   **Then** the model includes fields for: id (String, primary key), paper_id (String, foreign key to papers), content (Text), section_type (String: "abstract", "introduction", "methods", "results", "discussion", "conclusion", "other"), chunk_index (Integer), start_position (Integer), end_position (Integer), embedding (JSON or Vector type), metadata (JSON, nullable), created_at (DateTime), updated_at (DateTime)
   **And** paper_id has a foreign key relationship to the papers table
   **And** there is an index on paper_id for efficient queries
   **And** there is an index on section_type for filtering

2. **Given** the Prisma schema file
   **When** I configure vector storage (SQLite + sqlite-vss or dedicated vector DB)
   **Then** the embedding field is configured for vector similarity search
   **And** vector search capabilities are available for cosine similarity queries

3. **Given** the schema is defined
   **When** I run Prisma migrations
   **Then** the paper_chunks table is created in the database
   **And** all fields have appropriate data types and constraints
   **And** indexes are created for efficient queries

4. **Given** the database schema is created
   **When** I generate the Prisma client
   **Then** TypeScript types are generated for PaperChunk model
   **And** the types can be imported and used in API routes and components

## Tasks / Subtasks

- [ ] Task 1: Define PaperChunk Model (AC: 1)
  - [ ] Add PaperChunk model to `prisma/schema.prisma`
  - [ ] Define all required fields with correct types
  - [ ] Add foreign key relationship to Paper model
  - [ ] Add indexes on paper_id and section_type
  - [ ] Define section_type enum or string constraint

- [ ] Task 2: Configure Vector Storage (AC: 2)
  - [ ] Choose vector storage solution (SQLite + sqlite-vss for MVP)
  - [ ] Install and configure sqlite-vss extension
  - [ ] Configure embedding field for vector storage
  - [ ] Test vector search capabilities

- [ ] Task 3: Run Migrations (AC: 3)
  - [ ] Run `npx prisma migrate dev --name add_rag_schema`
  - [ ] Verify paper_chunks table is created
  - [ ] Verify indexes are created
  - [ ] Verify foreign key relationships

- [ ] Task 4: Generate Prisma Client (AC: 4)
  - [ ] Run `npx prisma generate`
  - [ ] Verify TypeScript types are generated
  - [ ] Test importing PaperChunk type

## Dev Notes

**Key Files to Modify:**
- `prisma/schema.prisma` - Add PaperChunk model

**Vector Storage Options:**
- **MVP**: SQLite + sqlite-vss (local-first, simple)
- **Scale**: Dedicated vector DB (Pinecone, Weaviate, Qdrant) - future migration

**Embedding Field:**
- Store as JSON array of numbers (embedding vector)
- Or use vector extension if available
- Ensure format supports cosine similarity search

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.1] - Complete story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#RAG-Architecture] - RAG architecture details
- [sqlite-vss Documentation](https://github.com/asg017/sqlite-vss)

## Dev Agent Record

### Implementation Notes

PaperChunk model (paper_chunks) with section_type, section_title, anchor_id, position, chunk_index, start/end positions, token_count, content_hash, embedding (Float32 bytes), embedding_model, metadata; indexes on paper_id and section_type. Deviation from Task 2: sqlite-vss not used (deprecated native extension). Retrieval is always scoped to one paper (tens of chunks), so exact brute-force cosine in JS is sub-millisecond; `lib/rag/vector-search.ts` is the seam for sqlite-vec/a vector DB later. Paper gained rag_status/rag_content_hash/rag_attempts/rag_error.

### File List

- `prisma/schema.prisma`
- `prisma/migrations/20260928210955_add_jobs_and_rag_schema`
- `lib/rag/vector-search.ts`
