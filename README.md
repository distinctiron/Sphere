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
- `LLM_MODEL` - Model name (optional, defaults based on provider)

Optional seed script configuration:
- `SEED_USER_EMAIL` - Email address to use when running `npm run seed:papers`

**Note:** The application works in mock mode by default (no API key needed). To use real LLM services, set `LLM_PROVIDER` and `LLM_API_KEY` in `.env.local`.

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

