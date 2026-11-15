# Story 7.6: RAG-Enhanced Chat Integration with Citations

Status: review

## Story

As a logged-in user,
I want to chat with a paper using RAG-retrieved context,
so that I get accurate answers based on specific paper sections with source citations.

## Acceptance Criteria

1. **Given** I am viewing a paper and open the chat panel
   **When** I ask a question about the paper
   **Then** the system retrieves relevant chunks using semantic similarity search
   **And** the retrieved chunks are used as context for the LLM query
   **And** the answer is generated based on the retrieved context (not the entire paper)
   **And** source citations are included showing which sections were used

2. **Given** RAG-enhanced chat
   **When** I have a multi-turn conversation
   **Then** conversation history is maintained
   **And** fresh chunks are retrieved for each new message (context-aware retrieval per turn)
   **And** previous conversation context is combined with newly retrieved chunks
   **And** each response includes citations for the chunks used

3. **Given** RAG-enhanced chat
   **When** I ask follow-up questions
   **Then** the system retrieves relevant chunks based on the current question
   **And** the retrieval adapts to the conversation context
   **And** answers remain accurate and contextually relevant

4. **Given** RAG-enhanced chat with citations
   **When** a response is generated
   **Then** citations are displayed showing section types (e.g., "Methods", "Results")
   **And** citations include similarity scores or relevance indicators
   **And** users can click citations to view the source chunks
   **And** citations are formatted clearly (inline or footnote style)

5. **Given** RAG-enhanced chat
   **When** token limits are encountered
   **Then** RAG helps mitigate token limit errors by using only relevant chunks
   **And** the system handles token limits more gracefully than full-document queries
   **And** streaming responses work correctly with RAG context

## Tasks / Subtasks

- [ ] Task 1: Enhance Chat API Route (AC: 1, 2, 3)
  - [ ] Modify `app/api/chat/route.ts` to use RAG
  - [ ] Implement chunk retrieval for each message
  - [ ] Maintain conversation history
  - [ ] Combine retrieved chunks with conversation context
  - [ ] Include citations in response

- [ ] Task 2: Citation Display (AC: 4)
  - [ ] Update chat UI to display citations
  - [ ] Show section types and relevance
  - [ ] Make citations clickable
  - [ ] Format citations clearly

- [ ] Task 3: Streaming with RAG (AC: 5)
  - [ ] Ensure streaming works with RAG context
  - [ ] Stream citations along with response
  - [ ] Handle token limits gracefully

- [ ] Task 4: Multi-turn Context (AC: 2, 3)
  - [ ] Implement context-aware retrieval per turn
  - [ ] Adapt retrieval to conversation context
  - [ ] Test follow-up questions

## Dev Notes

**Key Files to Modify:**
- `app/api/chat/route.ts` - Enhance with RAG retrieval
- `components/reader/chat-panel.tsx` - Display citations
- `lib/rag/query.ts` - RAG query pattern

**Multi-turn Conversations:**
- Retrieve fresh chunks for each message
- Maintain conversation history
- Combine context intelligently

**Citations:**
- Display section types
- Show relevance indicators
- Make clickable for source viewing

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.6] - Complete story requirements
- [Source: Story 3.5] - Existing chat implementation

## Dev Agent Record

### Implementation Notes

Chat route retrieves fresh chunks per message (short follow-ups are anchored to the previous question), history is trimmed to a token budget, and the extracted-text fallback replaces the previous raw-HTML context. Citations are streamed first and shown as inline [n] links plus a Sources list with section type, relevance bar and expandable passage with Show in paper. Fixed: the client's copy of the current message is dropped from history, so it's no longer sent twice (this also makes the first-message quota check effective).

### File List

- `app/api/papers/[id]/chat/route.ts`
- `lib/rag/query.ts`
- `lib/llm.ts`
- `components/papers/deep-dive-panel.tsx`
- `lib/rag/query.test.ts`
