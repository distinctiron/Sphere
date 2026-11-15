# Story 6.2: Hourly arXiv Fetching for CS & Physics

Status: review

## Story

As a system component,
I want to automatically fetch new papers from arXiv every hour for Computer Science and Physics categories,
so that fresh content is always available for users.

## Acceptance Criteria

1. **Given** the scheduled job runs hourly
   **When** the arXiv fetching job executes
   **Then** it queries arXiv API for Computer Science (cs.*) and Physics (physics.*) categories
   **And** it fetches papers submitted in the last hour (using submittedDate filter)
   **And** it processes the Atom XML response and extracts paper metadata

2. **Given** papers are fetched from arXiv
   **When** papers are processed
   **Then** duplicate papers (matching arxiv_id) are detected and skipped
   **And** new papers are inserted into the centralized papers database
   **And** existing papers are updated if metadata has changed
   **And** fetch timestamp is recorded for monitoring

3. **Given** arXiv fetching
   **When** the API rate limit is exceeded or an error occurs
   **Then** the error is logged
   **And** the job completes gracefully without crashing
   **And** partial results (if any) are saved
   **And** the next scheduled run will retry

4. **Given** hourly fetching is implemented
   **When** papers are fetched
   **Then** they are stored in the centralized database
   **And** all users can access these papers (not user-specific)
   **And** the papers are ready for novelty scoring (next story)

## Tasks / Subtasks

- [ ] Task 1: Create arXiv Fetching Job (AC: 1)
  - [ ] Create `lib/jobs/arxiv-fetch.ts` job
  - [ ] Implement arXiv API query for cs.* and physics.* categories
  - [ ] Use submittedDate filter for last hour
  - [ ] Parse Atom XML response
  - [ ] Extract paper metadata (title, authors, abstract, etc.)

- [ ] Task 2: Paper Deduplication and Storage (AC: 2)
  - [ ] Check for existing papers by arxiv_id
  - [ ] Insert new papers into centralized papers table
  - [ ] Update existing papers if metadata changed
  - [ ] Record fetch timestamp

- [ ] Task 3: Error Handling and Logging (AC: 3)
  - [ ] Handle arXiv API rate limits
  - [ ] Handle API errors gracefully
  - [ ] Log errors with context
  - [ ] Save partial results if possible
  - [ ] Ensure job doesn't crash on errors

- [ ] Task 4: Schedule Job Execution (AC: 1, 4)
  - [ ] Configure hourly schedule in job scheduler
  - [ ] Test job execution
  - [ ] Verify papers are stored in centralized database
  - [ ] Verify papers are accessible to all users

## Dev Notes

**Key Files to Create/Modify:**
- `lib/jobs/arxiv-fetch.ts` - arXiv fetching job
- `lib/services/arxiv-api.ts` - Reuse existing arXiv API service
- Job scheduler configuration - Add hourly schedule

**arXiv API Query:**
- Query: `cat:cs.* OR cat:physics.*`
- Filter: `submittedDate:[LAST_HOUR TO NOW]`
- Process Atom XML response (reuse existing parser from Epic 2)

**Centralized Database:**
- Papers stored in shared `papers` table (not user-specific)
- All users can access all papers
- Enables caching and reduces duplicate processing

**Error Handling:**
- Log all errors for monitoring
- Don't crash on API failures
- Retry logic handled by next scheduled run

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.2] - Complete story requirements
- [Source: Story 2.2] - Existing arXiv API integration patterns

## Dev Agent Record

### Implementation Notes

Deviation from AC1: arXiv only exposes papers after its daily announcement (1-3 days after submission), so a strict last-hour submittedDate window is almost always empty. The job queries a 96h submittedDate lookback window (newest first), dedupes by arxiv_id and stops at the first page with no new papers; after an incomplete run it backfills the whole window. Existing papers are updated only when metadata changed (content changes re-queue RAG indexing). Retries 429/5xx with backoff; keeps partial results. Verified live: 626 papers in window, backfill then early stop.

### File List

- `lib/jobs/arxiv-fetch.ts`
- `lib/arxiv.ts (searchArxiv, buildSubmittedDateQuery)`
- `lib/jobs/arxiv-fetch.test.ts`
