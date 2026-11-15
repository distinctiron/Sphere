# Story 6.4: User Login & Pre-processed Paper Display

Status: review

## Story

As a logged-in user,
I want to see the newest pre-processed papers when I log in,
so that I have fresh, ready-to-read content immediately available.

## Acceptance Criteria

1. **Given** I log in to the application
   **When** my session is established
   **Then** the system queries for the newest pre-processed papers from the centralized database
   **And** papers are filtered to show those fetched since my last login (using last_fetch_timestamp)
   **And** papers with novelty scores and summaries are prioritized in display

2. **Given** pre-processed papers are available
   **When** I view the dashboard
   **Then** papers are displayed with novelty scores and summaries already populated
   **And** no "scoring in progress" states are shown for pre-processed papers
   **And** dashboard loads quickly with ready content

3. **Given** user login and paper display
   **When** my last_fetch_timestamp is updated
   **Then** it is set to the current timestamp
   **And** future logins will only show papers newer than this timestamp
   **And** I don't see duplicate papers I've already seen

4. **Given** pre-processed content display
   **When** some papers haven't been scored yet (scoring job failed or pending)
   **Then** those papers are still displayed
   **And** they show "Score pending" or similar indicator
   **And** manual scoring can be triggered if needed (from Epic 2)

## Tasks / Subtasks

- [ ] Task 1: Update Login Flow (AC: 1)
  - [ ] Modify login/authentication flow
  - [ ] Query pre-processed papers after login
  - [ ] Filter by last_fetch_timestamp
  - [ ] Prioritize papers with novelty scores
  - [ ] Update last_fetch_timestamp to current time

- [ ] Task 2: Dashboard Display Updates (AC: 2)
  - [ ] Update dashboard to show pre-processed papers
  - [ ] Remove "scoring in progress" states for pre-processed papers
  - [ ] Display novelty scores and summaries immediately
  - [ ] Optimize dashboard loading performance

- [ ] Task 3: Timestamp Management (AC: 3)
  - [ ] Update User.lastFetchTimestamp on login
  - [ ] Use timestamp for filtering new papers
  - [ ] Test duplicate prevention
  - [ ] Handle first-time users (no timestamp)

- [ ] Task 4: Handle Unscored Papers (AC: 4)
  - [ ] Display papers without scores
  - [ ] Show "Score pending" indicator
  - [ ] Allow manual scoring trigger (if implemented)
  - [ ] Update display when scores become available

## Dev Notes

**Key Files to Modify:**
- `app/api/auth/login/route.ts` or login flow - Update last_fetch_timestamp
- `app/dashboard/page.tsx` - Query and display pre-processed papers
- `app/api/papers/route.ts` - Add endpoint for pre-processed papers query
- `components/dashboard/impact-card.tsx` - Handle pre-computed scores

**Query Logic:**
- Query papers from centralized database
- Filter: `created_at > user.lastFetchTimestamp`
- Sort by: novelty_score DESC, created_at DESC
- Prioritize papers with scores

**Performance:**
- Pre-processed content eliminates wait time
- Dashboard loads instantly
- Better user experience

**User Experience:**
- Users see fresh content immediately
- No waiting for processing
- Clear indication of score status

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.4] - Complete story requirements
- [Source: Story 2.4] - Existing dashboard display patterns

## Dev Agent Record

### Implementation Notes

NextAuth `events.signIn` (all providers) rotates `lastFetchTimestamp` → `newPapersSince` (idempotent within 5 min; signIn fires twice per credentials login). Incoming query rewritten as a single indexed query: papers created since newPapersSince (7 days on first visit), excluding dismissed/library, scored first; `scope=all` shows earlier papers. Dashboard: "N new papers since your last visit", Show earlier/only new toggle, "Score pending" + "Score now" (manual scoring via /score), polling fills in scores. Login fetch is skipped while the scheduled fetch is healthy.

### File List

- `auth.config.ts`
- `app/api/papers/route.ts`
- `app/api/arxiv/fetch/route.ts`
- `components/dashboard/{dashboard-content,paper-list-card,draggable-paper-card,novelty-carousel}.tsx`
