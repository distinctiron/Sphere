# Sphere

AI-powered research companion for discovering and reading academic papers.

## Development

### Starting the Development Server

To start the development server with a clean cache (recommended after making changes):

```bash
./dev.sh
```

Or using npm:

```bash
npm run dev:clean
```

This script will:
1. Stop any running dev server
2. Clear the Next.js build cache (`.next` directory)
3. Start a fresh dev server

**Why use the clean script?** Next.js sometimes caches build artifacts that can cause module not found errors. Running `dev:clean` ensures you always start with a fresh cache.

### Standard Development Commands

- `npm run dev` - Start dev server (uses existing cache)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components
- `/lib` - Shared utilities and services
- `/prisma` - Database schema and migrations

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` - SQLite database path
- `NEXTAUTH_SECRET` - Secret for NextAuth.js (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL (default: `http://localhost:3000`)

Optional LLM configuration:
- `LLM_PROVIDER` - Set to `"openai"`, `"anthropic"`, or `"mock"` (default: `"mock"`)
- `LLM_API_KEY` - Your LLM API key (required if not using mock)
- `LLM_MODEL` - Model name (optional; defaults to `claude-sonnet-5-5` for Anthropic, `gpt-4o-2024-08-06` for OpenAI)

Optional seed script configuration:
- `SEED_USER_EMAIL` - Email address to use when running `npm run seed:papers`

**Note:** The application works in mock mode by default (no API key needed). To use real LLM services, set `LLM_PROVIDER` and `LLM_API_KEY` in `.env.local`.

## Payments and Metering (Epic 5)

All prices are in euros. There are three tiers, derived from the user's plan (`lib/billing/account.ts`):

| Tier | How | What's included |
|---|---|---|
| Free | default | News only |
| Pay as you go | any wallet top-up (€5 / €10 / €25) | AI features charged at **2× the model's inference cost**, deducted from the wallet; tutorials |
| Unlimited | €10/month subscription | AI features and tutorials, within a fair-use cap on real inference cost per billing period (`SUBSCRIPTION_FAIR_USE_EUR`, default €6); past the cap, calls use the wallet |

- **Metering**: every model call reports its token usage (`lib/llm.ts`), is priced from `lib/billing/pricing.ts` (USD → EUR via `USD_TO_EUR`) and recorded in `usage_events`. Paper chat, Intellisense and the lesson tutor are billed to the user; background work (novelty scoring, news summaries, story articles) is recorded as platform cost and never charged. **Keep the price table current** when you change `LLM_MODEL`.
- **Money only moves on Stripe webhooks** (`app/api/webhooks/stripe`): top-ups credit the wallet on `checkout.session.completed`; subscription state is synced from `customer.subscription.*`; `invoice.*` events are recorded as transactions. Handlers are idempotent.
- **Cancelling, card updates and invoices** go through the Stripe Customer Portal (`/api/payments/portal`). Enable it once per mode in the Stripe dashboard: Settings → Billing → Customer portal.

### Testing payments locally

1. Put test-mode keys in `.env.local` (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
2. `stripe login`, then `stripe listen --print-secret` and set `STRIPE_WEBHOOK_SECRET` to the printed `whsec_…`.
3. Run the app and, in a second terminal, forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed
   ```
4. Top up or subscribe from **Account** with test card `4242 4242 4242 4242` (any future expiry, any CVC). `4000 0000 0000 9995` is declined; `4000 0000 0000 0341` saves but fails later charges (failed renewals).
5. Renewals and failed payments: attach the customer to a [Test Clock](https://docs.stripe.com/billing/testing/test-clocks) in the dashboard and advance time.
6. Without an LLM key the app runs in mock mode, where calls cost €0. Set `BILLING_PRICE_MOCK_AS="claude-sonnet-5-5"` to charge mock calls as if they ran on that model.

## Background Processing (Epic 6)

New arXiv papers (cs.* and physics.*) are fetched, novelty-scored and indexed for retrieval by an hourly pipeline, so they're ready when users log in.

- **In-process scheduler** (default for self-hosting): set `ENABLE_SCHEDULER=true`. It starts with the Next.js server (`instrumentation.ts`) and runs at hh:05.
- **External scheduler**: set `CRON_SECRET` and call `GET /api/cron/process-papers` with `Authorization: Bearer $CRON_SECRET` (works with Vercel Cron or system cron).
- **CLI**: `npm run jobs:run -- process-papers` (or a single job: `arxiv-fetch`, `novelty-scoring`, `rag-indexing`).
- **Monitoring**: `GET /api/cron/status` (same auth) shows the last run of each job, recent runs and the scoring/indexing backlog. Runs are stored in the `job_runs` table; a DB lock prevents overlapping runs.

Scoring is skipped in mock mode, so placeholder scores are never stored. When no scheduled fetch has completed recently, logging in falls back to the old on-login fetch.

## Retrieval-Augmented Chat (Epic 7)

Papers are split into section-aware chunks (`lib/rag/chunker.ts`), embedded (`lib/rag/embeddings.ts`) and stored in `paper_chunks`. Chat and Intellisense retrieve the most relevant passages and cite them inline as [1], [2]; clicking a citation scrolls to the passage in the paper.

- Papers are indexed when opened in the reader (`POST /api/papers/[id]/rag`) and by the scheduled `rag-indexing` job.
- Embeddings use OpenAI `text-embedding-3-small` when an OpenAI key is available, otherwise a local lexical fallback.
- See `.env-example` for tuning options.

## Breaking AI News (Epic 8)

The dashboard's **News** tab (`/dashboard?tab=news`) shows AI stories breaking across Hacker News, Reddit, GitHub, news outlets and X. Clicking a story opens an AI-written article (`/news/[id]`): what's happening, a per-source breakdown, and the bigger picture, with inline citations.

- The `process-news` pipeline runs every 15 minutes with the scheduler (or `npm run jobs:run -- process-news`, or `GET /api/cron/process-news`):
  1. `news-fetch`: source adapters in `lib/news/sources/` (topic config in `lib/news/topics.ts`)
  2. `news-clustering`: embeds items and groups them into stories (same link or similar headline), then ranks them by *heat*: engagement normalised per platform, a boost for coverage across platforms and outlets, and time decay
  3. `news-summarize`: LLM headlines and summaries for the hottest stories; articles for breaking stories are written ahead of time. Other stories' articles are generated on first open and cached until the story grows.
- **Sources:** Hacker News, GitHub and the outlet feeds need no keys. Reddit works without keys through public feeds, which carry no upvote counts; set `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` for scores. X has no free API, so it is read through an RSS bridge you host (`X_RSS_URL_TEMPLATE`, e.g. RSSHub). This is off by default and against X's terms of service.
- The **Google News** feed adds coverage from many outlets. Google allows it for personal, non-commercial use only; disable it with `DISABLED_NEWS_FEEDS="Google News"`.
- Summaries and articles need a real LLM provider. In mock mode, stories show their top headline and a placeholder article.

## Learn tab (Epic 9)

The **Learn** tab (`/learn`) is a structured curriculum for the feed's topic, starting with AI. It has four paths:
- **A: The math of neural networks and LLMs.**
- **B: Compute, from silicon to data centers and model hosting.**
- **C: Building with AI**: APIs, tools, RAG, agents, harness engineering, skills and MCP.
- **D: The AI economy and geopolitics.**

Lessons are authored in the repo, not generated at runtime:
- `content/learn/<path>/<lesson>.mdx` holds the text: MDX with KaTeX math, frontmatter with prerequisites, keywords and quiz.
- `lib/learn/curriculum.ts` holds the structure and each path's mental models.
- `components/learn/figures/` holds the animated and interactive SVG figures.
- `content/learn/glossary/` holds the glossary.
- `content/learn/AUTHORING.md` is the style guide for new or edited lessons.

What a lesson offers:
- **Cross-references.** Each lesson lists what it *builds on* and recaps it inline ("As we covered in C3 · Tool use"). It also shows where the idea comes back later, and related lessons in other paths.
- **Progress and quizzes.** Per-user progress (`UserLessonProgress`) and end-of-lesson quizzes that test reasoning; half right completes the lesson.
- **Links to your feed.** Lessons link to this week's News stories and papers that match their keywords. The overview ranks lessons by how many stories they explain, and news story pages show "Background lessons".
- **Tutor.** "Ask the tutor" on every lesson streams answers grounded in the lesson, its prerequisites and the path's mental model (`POST /api/learn/lessons/[id]/chat`). It uses the configured LLM and has a mock mode. It doesn't consume article quota.

Run `npx vitest run lib/learn` to validate content. It checks that:
- the MDX compiles;
- the required sections are present;
- lesson, figure and glossary references resolve;
- prerequisites have no cycles;
- recaps only point backwards.

## Database

The project uses SQLite with Prisma ORM.

- Run migrations: `npx prisma migrate dev`
- Open Prisma Studio: `npx prisma studio`
- Generate Prisma Client: `npx prisma generate`

### Seeding Papers

To seed the database with the last 100 papers from arXiv (useful for development/testing):

1. Add your email to `.env.local`:
   ```bash
   SEED_USER_EMAIL=your-email@example.com
   ```

2. Run the seed script:
   ```bash
   npm run seed:papers
   ```

This will:
- Fetch the last 100 papers from arXiv (Computer Science and Physics categories only)
- Store them in the database
- Create UserPaperState entries with status NEW for the specified user
- Update the user's last fetch timestamp

**Note:** Make sure you've registered an account with the email address you set in `SEED_USER_EMAIL`.

