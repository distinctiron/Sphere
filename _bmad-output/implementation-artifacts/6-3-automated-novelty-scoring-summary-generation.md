# Story 6.3: Automated Novelty Scoring & Summary Generation

Status: review

## Story

As a system component,
I want to automatically generate novelty scores and summaries for newly fetched papers,
so that users see pre-computed insights immediately when they log in.

## Acceptance Criteria

1. **Given** new papers have been fetched and stored
   **When** the novelty scoring job runs (as part of scheduled processing)
   **Then** each new paper is sent to the LLM for novelty analysis
   **And** novelty_score and novelty_summary are generated
   **And** the scores and summaries are stored in the papers table
   **And** papers are ready for immediate display to users

2. **Given** automated scoring
   **When** scoring is performed
   **Then** papers are processed in batch (efficient LLM API usage)
   **And** scoring failures for individual papers don't stop the batch
   **And** failed papers are logged for retry
   **And** successfully scored papers are immediately available

3. **Given** scoring automation
   **When** LLM API is unavailable or rate-limited
   **Then** the job handles errors gracefully
   **And** unscored papers remain in the database (null novelty_score)
   **And** users can still access papers (they just won't have scores yet)
   **And** scoring can be retried in the next scheduled run or manually

4. **Given** pre-computed scores and summaries
   **When** users log in
   **Then** papers are displayed with scores and summaries already available
   **And** no waiting time for novelty computation
   **And** dashboard loads faster with pre-processed content

## Tasks / Subtasks

- [ ] Task 1: Create Novelty Scoring Job (AC: 1)
  - [ ] Create `lib/jobs/novelty-scoring.ts` job
  - [ ] Query papers without novelty_score
  - [ ] Send papers to LLM for novelty analysis
  - [ ] Parse LLM response for score and summary
  - [ ] Update papers table with scores and summaries

- [ ] Task 2: Batch Processing Implementation (AC: 2)
  - [ ] Process multiple papers in batch
  - [ ] Handle individual paper failures without stopping batch
  - [ ] Log failed papers for retry
  - [ ] Mark successfully scored papers

- [ ] Task 3: Error Handling (AC: 3)
  - [ ] Handle LLM API unavailability
  - [ ] Handle rate limiting
  - [ ] Leave unscored papers with null novelty_score
  - [ ] Log errors for monitoring
  - [ ] Ensure job completes gracefully

- [ ] Task 4: Schedule and Integration (AC: 1, 4)
  - [ ] Schedule scoring job to run after arXiv fetch
  - [ ] Test end-to-end: fetch → score → display
  - [ ] Verify dashboard shows pre-computed scores
  - [ ] Measure performance improvement

## Dev Notes

**Key Files to Create/Modify:**
- `lib/jobs/novelty-scoring.ts` - Novelty scoring job
- `lib/services/llm.ts` - Reuse existing LLM service
- Job scheduler - Add scoring job after fetch job

**Batch Processing:**
- Process papers in batches of 5-10 for efficiency
- Use Promise.allSettled for parallel processing
- Continue processing even if some papers fail

**LLM Integration:**
- Reuse existing novelty scoring prompt from Epic 2
- Handle streaming vs non-streaming responses
- Cache results to avoid duplicate scoring

**Performance:**
- Pre-computed scores eliminate user wait time
- Dashboard loads instantly with scores
- Better user experience

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.3] - Complete story requirements
- [Source: Story 2.3] - Existing novelty scoring service patterns

## Dev Agent Record

### Implementation Notes

Scores unscored papers with bounded concurrency (default 5, max 100/run). Per-paper failures are recorded (scoring_attempts/error) and retried with 1h/2h/4h/8h backoff up to 5 attempts; a circuit breaker stops the run on repeated rate-limit/5xx errors; auth errors fail the run without penalising papers. Skipped in mock mode so placeholder scores aren't stored. Could not be verified against a real LLM (no LLM_API_KEY configured); failure paths verified live with an invalid key.

### File List

- `lib/jobs/novelty-scoring.ts`
- `lib/llm.ts (isLLMConfigured)`
- `lib/jobs/jobs.test.ts`
