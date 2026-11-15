# Story 7.5: RAG-Enhanced Intellisense Integration

Status: review

## Story

As a logged-in user,
I want to get explanations using RAG-retrieved context when I select text and ask "Explain",
so that explanations are more accurate and based on relevant paper sections.

## Acceptance Criteria

1. **Given** I am reading a paper and select text
   **When** I click "Explain" from the context menu
   **Then** the system retrieves 2-3 most relevant chunks around the selection using hybrid search (semantic + position-based)
   **And** the selected text is included in the context
   **And** the retrieved chunks are sent to the LLM along with the selected text
   **And** the explanation is generated based on the retrieved context (not the entire paper)

2. **Given** RAG-enhanced Intellisense
   **When** an explanation is generated
   **Then** the explanation is more accurate than full-paper context
   **And** the explanation includes citations showing which sections were used
   **And** the explanation is displayed in the Intellisense popover
   **And** source citations are clickable (link to relevant sections)

3. **Given** Intellisense with RAG
   **When** no relevant chunks are found
   **Then** the system falls back to using the selected text only
   **And** an explanation is still provided (graceful degradation)

4. **Given** RAG-enhanced Intellisense
   **When** token limits are encountered
   **Then** RAG helps mitigate token limit errors by using only relevant chunks
   **And** the system handles token limits more gracefully than full-document queries

## Tasks / Subtasks

- [ ] Task 1: Enhance Explain API Route (AC: 1)
  - [ ] Modify `app/api/explain/route.ts` to use RAG
  - [ ] Implement hybrid search (semantic + position-based)
  - [ ] Retrieve 2-3 relevant chunks around selection
  - [ ] Include selected text in context
  - [ ] Send retrieved chunks to LLM

- [ ] Task 2: Add Citations to Responses (AC: 2)
  - [ ] Include chunk references in LLM response
  - [ ] Format citations in Intellisense popover
  - [ ] Make citations clickable
  - [ ] Link to relevant sections

- [ ] Task 3: Fallback Handling (AC: 3)
  - [ ] Implement fallback to selected text only
  - [ ] Ensure graceful degradation

- [ ] Task 4: Token Limit Mitigation (AC: 4)
  - [ ] Test with RAG context (smaller than full document)
  - [ ] Verify token limit errors are reduced
  - [ ] Handle edge cases

## Dev Notes

**Key Files to Modify:**
- `app/api/explain/route.ts` - Enhance with RAG retrieval
- `components/reader/intellisense-popover.tsx` - Display citations

**Hybrid Search:**
- Combine semantic search (vector similarity) with position-based search
- Prioritize chunks near selected text
- Include 2-3 most relevant chunks

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.5] - Complete story requirements
- [Source: Story 3.4] - Existing Intellisense implementation

## Dev Agent Record

### Implementation Notes

Explain route (app/api/papers/[id]/explain, not app/api/explain) uses hybrid retrieval: 0.65 semantic + 0.35 positional (chunk containing the selection = 1, neighbours = 0.5), located via the selection's surrounding paragraph sent by the reader. Citations are streamed first; the popover renders inline [n] links that scroll to and highlight the passage, plus an expandable source list. Falls back to the selection only. Also fixed a pre-existing double-stream bug (React Strict Mode) with an AbortController.

### File List

- `app/api/papers/[id]/explain/route.ts`
- `lib/llm.ts`
- `components/papers/{intellisense-popover,citations,paper-reader}.tsx`
- `lib/rag/citation-text.ts`
