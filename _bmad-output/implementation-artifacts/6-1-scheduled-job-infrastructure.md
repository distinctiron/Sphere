# Story 6.1: Scheduled Job Infrastructure

Status: review

## Story

As a system administrator,
I want to set up scheduled background jobs for arXiv processing,
so that papers are fetched and pre-processed automatically without user intervention.

## Acceptance Criteria

1. **Given** the application infrastructure
   **When** scheduled job system is implemented
   **Then** a job scheduler is configured (e.g., cron, node-cron, or cloud scheduler)
   **And** jobs can run on a fixed hourly schedule
   **And** jobs are isolated from user-facing API routes
   **And** job execution is logged for monitoring

2. **Given** scheduled job infrastructure
   **When** a job is triggered
   **Then** it can access the database and external APIs (arXiv, LLM)
   **And** it handles errors gracefully without crashing
   **And** it can be monitored and debugged
   **And** job status can be tracked (running, completed, failed)

3. **Given** job scheduling
   **When** multiple jobs are scheduled
   **Then** they can run concurrently or sequentially as needed
   **And** resource usage (API rate limits, database connections) is managed
   **And** job failures don't block other jobs

## Tasks / Subtasks

- [ ] Task 1: Choose and Configure Job Scheduler (AC: 1)
  - [ ] Evaluate options: Vercel Cron, Cloudflare Cron, node-cron, or external scheduler
  - [ ] Install and configure chosen scheduler
  - [ ] Set up hourly schedule configuration
  - [ ] Create job execution environment

- [ ] Task 2: Create Job Infrastructure (AC: 1, 2)
  - [ ] Create `lib/jobs/` directory structure
  - [ ] Create base job runner/executor
  - [ ] Implement job logging system
  - [ ] Add job status tracking (optional: job_status table)
  - [ ] Implement error handling and graceful failures

- [ ] Task 3: Database and API Access (AC: 2)
  - [ ] Ensure jobs can access Prisma database
  - [ ] Ensure jobs can call arXiv API
  - [ ] Ensure jobs can call LLM API
  - [ ] Test database connections in job context

- [ ] Task 4: Job Monitoring and Debugging (AC: 2)
  - [ ] Implement structured logging for jobs
  - [ ] Log job start, completion, and errors
  - [ ] Add job execution metrics (duration, success/failure)
  - [ ] Create admin view for job status (optional)

- [ ] Task 5: Concurrent Job Management (AC: 3)
  - [ ] Implement job queue or locking mechanism
  - [ ] Manage API rate limits across jobs
  - [ ] Ensure database connection pooling works with jobs
  - [ ] Test concurrent job execution

## Dev Notes

**Key Files to Create:**
- `lib/jobs/scheduler.ts` - Job scheduler configuration
- `lib/jobs/base-job.ts` - Base job class/interface
- `lib/jobs/logger.ts` - Job logging utilities
- `app/api/cron/arxiv-fetch/route.ts` - Vercel Cron endpoint (if using Vercel)
- `lib/jobs/job-runner.ts` - Job execution engine

**Scheduler Options:**
- **Vercel Cron**: Use `/app/api/cron/` routes with `vercel.json` cron config
- **Cloudflare Cron Triggers**: Use scheduled workers
- **node-cron**: For self-hosted deployments
- **External**: Use external cron service to call API endpoints

**Job Isolation:**
- Jobs should run in separate execution context from API routes
- Use environment variables to enable/disable jobs
- Jobs should not block user-facing requests

**Error Handling:**
- Jobs must catch and log all errors
- Failed jobs should not crash the application
- Implement retry logic for transient failures

## References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.1] - Complete story requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Background-Job-Scheduling] - Job scheduling architecture
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## Dev Agent Record

### Implementation Notes

In-process scheduler started from `instrumentation.ts` (ENABLE_SCHEDULER=true), clock-aligned hourly at :05. Also triggerable via `/api/cron/[job]` (Bearer CRON_SECRET, Vercel Cron compatible) and `npm run jobs:run`. `runJob()` adds a DB lock (`job_locks`), JobRun status tracking (RUNNING/COMPLETED/FAILED/SKIPPED), structured logs, a time budget, and never throws. Pipeline steps are isolated. Monitoring via `/api/cron/status`. Jobs can be disabled with DISABLED_JOBS.

### File List

- `instrumentation.ts`
- `next.config.js`
- `lib/jobs/{types,logger,lock,job-runner,rate-limit,config,registry,scheduler,status,cron-auth}.ts`
- `app/api/cron/[job]/route.ts`
- `app/api/cron/status/route.ts`
- `scripts/run-job.ts`
- `prisma/schema.prisma (JobRun, JobLock)`
