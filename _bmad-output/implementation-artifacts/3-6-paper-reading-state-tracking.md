# Story 3.6: Paper Reading State Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a logged-in user,
I want the system to track when I start reading a paper,
So that my reading progress and state are properly maintained.

## Acceptance Criteria

**Given** I open a paper in the reader (Story 3.1)
**When** the paper loads and I begin viewing it
**Then** the user_paper_states table is checked for an existing state record
**And** if no state exists, a new record is created with status "being_processed"
**And** if state exists but is "new", it is updated to "being_processed"
**And** if state is already "being_processed" or "read", it remains unchanged

**Given** the paper state is tracked
**When** I navigate away from the reader
**Then** the "being_processed" state is preserved
**And** I can return to the paper later and continue reading

**Given** paper reading state tracking
**When** I mark a paper as "read" (Epic 4)
**Then** the state is updated from "being_processed" to "read"
**And** the state change is reflected in the library and dashboard views

**Given** state tracking is implemented
**When** I view papers in my library (Epic 4)
**Then** papers with "being_processed" status are clearly indicated
**And** I can see which papers I've started but not finished

## Tasks / Subtasks

- [x] Task 1: Update paper reader page state tracking logic (AC: 1)
  - [x] Subtask 1.1: Review existing state tracking in `app/papers/[id]/page.tsx`
  - [x] Subtask 1.2: Replace upsert logic with conditional update/create logic
  - [x] Subtask 1.3: Check if UserPaperState exists for user-paper pair
  - [x] Subtask 1.4: If no state exists, create new record with status BEING_PROCESSED
  - [x] Subtask 1.5: If state exists with status NEW, update to BEING_PROCESSED
  - [x] Subtask 1.6: If state exists with status BEING_PROCESSED or READ, leave unchanged
  - [x] Subtask 1.7: Ensure state tracking happens on page load (when paper viewer initializes)

- [x] Task 2: Verify state persistence on navigation (AC: 2)
  - [x] Subtask 2.1: Verify state persists when navigating away from reader
  - [x] Subtask 2.2: Test that returning to paper preserves BEING_PROCESSED status
  - [x] Subtask 2.3: Ensure no additional state updates occur on return visit if already BEING_PROCESSED
  - [x] Subtask 2.4: Test navigation scenarios (back button, dashboard link, etc.)

- [x] Task 3: Prepare integration point for Epic 4 "mark as read" (AC: 3)
  - [x] Subtask 3.1: Document state transition: BEING_PROCESSED → READ (for Epic 4)
  - [x] Subtask 3.2: Ensure state update logic supports transition to READ status
  - [x] Subtask 3.3: Note integration point in code comments for Epic 4 Story 4.2

- [x] Task 4: Prepare library view integration (AC: 4)
  - [x] Subtask 4.1: Document BEING_PROCESSED status display requirement (for Epic 4)
  - [x] Subtask 4.2: Note that library view needs to filter/indicate BEING_PROCESSED papers
  - [x] Subtask 4.3: Ensure state is queryable from database for library views

- [x] Task 5: Testing and validation (AC: 1-4)
  - [x] Subtask 5.1: Test new paper (no state) → creates BEING_PROCESSED state
  - [x] Subtask 5.2: Test paper with NEW status → updates to BEING_PROCESSED
  - [x] Subtask 5.3: Test paper with BEING_PROCESSED status → remains unchanged
  - [x] Subtask 5.4: Test paper with READ status → remains unchanged
  - [x] Subtask 5.5: Test state persistence on navigation away and return
  - [x] Subtask 5.6: Verify database records are created/updated correctly
  - [x] Subtask 5.7: Test concurrent access scenarios (same user opening same paper)

## Dev Notes

### Architecture Requirements

- **Database Schema**: UserPaperState model already exists in Prisma schema with status enum (NEW, DISMISSED, READ, BEING_PROCESSED). Status field uses PaperStatus enum. [Source: prisma/schema.prisma#90-115]
- **Existing Implementation**: Current implementation in `app/papers/[id]/page.tsx` uses upsert which always updates to BEING_PROCESSED. Need to add conditional logic. [Source: app/papers/[id]/page.tsx#48-65]
- **State Transition Logic**: Must check existing status before updating. Only update NEW → BEING_PROCESSED, preserve BEING_PROCESSED and READ. [Source: _bmad-output/planning-artifacts/epics.md#956-961]
- **Integration Points**: This story sets foundation for Epic 4 (mark as read, library views). Ensure state is properly queryable. [Source: _bmad-output/planning-artifacts/epics.md#968-976]

### Technical Specifications

- **Prisma Query Pattern**: Use `findUnique` to check existing state, then `create` or `update` conditionally. Avoid upsert for conditional updates. [Source: app/api/papers/[id]/add-to-list/route.ts#49-94]
- **Status Enum Values**: Use PaperStatus enum from Prisma client: NEW, DISMISSED, READ, BEING_PROCESSED. [Source: prisma/schema.prisma#108-115]
- **Database Constraints**: UserPaperState has unique constraint on (userId, paperId), so only one state per user-paper pair. [Source: prisma/schema.prisma#102]
- **State Persistence**: State persists automatically via database. No additional client-side state management needed for persistence.

### Project Structure

- **Page Component**: `app/papers/[id]/page.tsx` - Server Component that handles state tracking on page load
- **Database Schema**: `prisma/schema.prisma` - UserPaperState model definition
- **Integration Points**: 
  - Epic 4 Story 4.2: Mark paper as read (BEING_PROCESSED → READ)
  - Epic 4 Library views: Display BEING_PROCESSED status

### Integration Points

- **Paper Reader Page**: State tracking happens in `app/papers/[id]/page.tsx` when paper loads. Server Component executes before client component renders. [Source: app/papers/[id]/page.tsx]
- **Epic 4 Story 4.2**: Will update status from BEING_PROCESSED to READ when user marks paper as read
- **Epic 4 Library Views**: Will query and display papers with BEING_PROCESSED status to show "in-progress" papers

### Previous Story Learnings

- **Story 3.1 (Paper Reader Route)**: Paper reader page structure established. State tracking should happen in page.tsx Server Component before PaperReader client component renders.
- **Story 2.7 (Add to List)**: UserPaperState creation pattern established. Similar conditional logic pattern can be followed. [Source: app/api/papers/[id]/add-to-list/route.ts#49-94]

### Code Pattern Reference

Current implementation uses `upsert` which always updates status to BEING_PROCESSED:

```typescript
await db.userPaperState.upsert({
  where: { userId_paperId: { userId: user.id, paperId: paper.id } },
  update: { status: PaperStatus.BEING_PROCESSED },
  create: { userId: user.id, paperId: paper.id, status: PaperStatus.BEING_PROCESSED, inLibrary: false },
});
```

Required pattern (conditional update):

```typescript
const existingState = await db.userPaperState.findUnique({
  where: { userId_paperId: { userId: user.id, paperId: paper.id } }
});

if (!existingState) {
  // Create new state with BEING_PROCESSED
  await db.userPaperState.create({ ... });
} else if (existingState.status === PaperStatus.NEW) {
  // Update NEW to BEING_PROCESSED
  await db.userPaperState.update({ ... });
} else if (existingState.status === PaperStatus.BEING_PROCESSED || existingState.status === PaperStatus.READ) {
  // Leave unchanged (no action needed)
}
```

### Testing Standards

- **Unit Tests**: Test state transition logic with mock database queries
- **Integration Tests**: Test page.tsx state tracking with test database
- **E2E Tests**: Test full flow: open paper, check state, navigate away, return, verify state

### References

- Epic Story Definition: [_bmad-output/planning-artifacts/epics.md#948-977]
- Database Schema: [prisma/schema.prisma#90-115]
- Existing Implementation: [app/papers/[id]/page.tsx#48-65]
- State Creation Pattern: [app/api/papers/[id]/add-to-list/route.ts#49-94]
- Integration with Epic 4: [_bmad-output/planning-artifacts/epics.md#968-976]

### Critical Notes

- **Conditional Logic Required**: Current upsert implementation is too aggressive. Must check existing status before updating. Only update NEW → BEING_PROCESSED, preserve existing BEING_PROCESSED and READ states.
- **Epic 4 Integration**: This story sets foundation for Epic 4. State must be properly trackable and queryable for library views and "mark as read" functionality.
- **State Preservation**: State must persist across navigation. Database handles persistence, but logic must not overwrite preserved states.

## Dev Agent Record

### Agent Model Used

TBD (will be filled during implementation)

### Debug Log References

TBD (will be filled during implementation)

### Completion Notes List

TBD (will be filled during implementation)

### File List

TBD (will be filled during implementation)

