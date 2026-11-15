---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: 
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Sphere - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sphere, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can sign up and log in using an email and password.

FR2: User can reset their password via email link.

FR3: User can view their account profile details.

FR4: User can view a dashboard of recommended papers sorted by "Novelty Score."

FR5: User can view the "Impact Card" for a paper, displaying Title, Authors, Novelty Score, and "Why it Matters" summary.

FR6: User can filter the dashboard by specific research fields.

FR7: User can "Add to List" directly from the Impact Card.

FR8: User can "Dismiss" a paper to hide it from the dashboard.

FR9: User can open a paper in a distraction-free HTML reading view.

FR10: User can click on specific technical terms or equations to trigger an "Intellisense" overlay.

FR11: User can view a simplified explanation or analogy in the Intellisense overlay.

FR12: User can open a "Chat with Paper" side pane to ask free-form questions about the document content.

FR13: User can view the original PDF (fallback view) if HTML rendering fails.

FR14: User can view their personal "To-Read" list.

FR15: User can manually reorder papers in the "To-Read" list to set their own priority.

FR16: User can mark a paper as "Read" (archiving it from the active list).

FR17: User can remove papers from the list.

FR18: User can sign up and log in using federated identity providers (Google, Apple, Facebook) to lower entry barrier and enable faster onboarding.

FR19: System enforces a free tier that allows processing of 5 articles without payment.

FR20: User can purchase pay-as-you-go credits to process additional articles beyond the free tier limit.

FR21: User can subscribe to a monthly subscription plan for unlimited article processing.

FR22: System integrates with Stripe for payment processing (both one-time payments and recurring subscriptions).

FR23: System tracks and displays remaining article processing quota based on user's payment plan.

FR24: System prevents article processing when user has exceeded their quota and prompts for payment upgrade.

FR25: System processes articles from arXiv on a fixed hourly schedule for Computer Science and Physics categories.

FR26: System automatically generates novelty scores and summaries for newly fetched papers during scheduled processing.

FR27: When a user logs in, the application requests and displays the newest papers that have been pre-processed.

FR28: System tracks last processing timestamp per user to identify new articles since last synchronization.

### NonFunctional Requirements

NFR1: "Click-to-Explain" and "Chat" responses must start streaming or display within 3 seconds.

NFR2: Application initial load time < 1 second on broadband connections.

NFR3: If LLM services are unavailable, the application must remain usable for reading (fallback to standard view) and display a clear "Service Busy" notification.

NFR4: All LLM failures must be handled without crashing the application state.

NFR5: User passwords must be hashed and salted.

NFR6: User notes and reading history must be stored securely and accessible only to the authenticated user.

### Additional Requirements

- **Starter Template Setup**: Initialize Next.js project using `create-next-app` with TypeScript, Tailwind CSS, App Router, and import alias configuration (affects Epic 1 Story 1)

- **Content Ingestion & Synchronization**: The system must fetch articles from arXiv API on user login, comparing against last login timestamp to identify new articles. Must track last_fetch_timestamp per user, query arXiv API with date filters, process and store new articles, handle API rate limits, and implement error handling with graceful degradation.

- **Database Schema Setup**: SQLite database with Prisma ORM. Must create schema for users, papers, reading lists, annotations, and user preferences.

- **Authentication Integration**: NextAuth.js with SQLite adapter, email/password provider, session management, and protected routes (all content behind authentication).

- **arXiv API Integration**: Must handle Atom XML response format, implement query parameters (search_query, submittedDate filters, pagination), extract metadata (title, authors, abstract, publication date, arXiv ID, categories), and construct HTML URL from abstract URL pattern (appending `/html` to abs URL).

- **LLM Integration Layer**: Consistent abstraction for novelty scoring, Intellisense explanations, and chat responses. Must support streaming responses, error handling, and graceful degradation.

- **State Management**: React useState with minimal Context API for complex UI state (carousel position, chat history, selected text context, streaming response state).

- **Responsive Design**: Desktop primary (split-view interaction model), mobile secondary (full-screen overlays, triage focus). Component system must support both interaction models.

- **Accessibility**: WCAG AA baseline compliance across complex UI interactions (carousel keyboard navigation, drag-to-resize, contextual popovers, screen reader support).

- **Performance Optimization**: Streaming responses, optimistic UI patterns, lazy loading for paper content to meet <3s latency requirements.

- **Error Handling**: Layered error handling with standardized error response format, HTTP status codes, graceful degradation for LLM and arXiv API failures.

- **HTML Rendering**: Direct rendering of arXiv HTML sources (no PDF-to-HTML conversion needed). Must handle complex academic content including equations and figures.

- **Article Deduplication**: Accurately identify new articles to prevent duplicate processing using arXiv ID comparison.

### FR Coverage Map

FR1: Epic 1 - User sign up with email and password
FR2: Epic 1 - Password reset via email link
FR3: Epic 1 - View account profile details
FR4: Epic 2 - View dashboard of papers sorted by Novelty Score
FR5: Epic 2 - View Impact Card with paper details and novelty summary
FR6: Epic 2 - Filter dashboard by research fields
FR7: Epic 2 - Add paper to list from Impact Card
FR8: Epic 2 - Dismiss paper from dashboard
FR9: Epic 3 - Open paper in distraction-free HTML reading view
FR10: Epic 3 - Click on terms/equations to trigger Intellisense overlay
FR11: Epic 3 - View simplified explanations in Intellisense overlay
FR12: Epic 3 - Open Chat with Paper side pane for questions
FR13: Epic 3 - View original PDF as fallback if HTML rendering fails
FR14: Epic 4 - View personal To-Read list
FR15: Epic 4 - Manually reorder papers in To-Read list
FR16: Epic 4 - Mark paper as Read (archive from active list)
FR17: Epic 4 - Remove papers from list
FR18: Epic 1 - User can sign up and log in using federated identity providers (Google, Apple, Facebook)
FR19: Epic 5 - System enforces a free tier that allows processing of 5 articles without payment
FR20: Epic 5 - User can purchase pay-as-you-go credits to process additional articles
FR21: Epic 5 - User can subscribe to a monthly subscription plan for unlimited article processing
FR22: Epic 5 - System integrates with Stripe for payment processing
FR23: Epic 5 - System tracks and displays remaining article processing quota
FR24: Epic 5 - System prevents article processing when user has exceeded quota
FR25: Epic 6 - System processes articles from arXiv on a fixed hourly schedule for CS and Physics
FR26: Epic 6 - System automatically generates novelty scores and summaries during scheduled processing
FR27: Epic 6 - When user logs in, application requests and displays newest pre-processed papers
FR28: Epic 6 - System tracks last processing timestamp per user

## Epic List

#### Epic 9: Learn Tab (Post-MVP)

A structured curriculum for the feed's topic (starting with AI), in four paths: the math of neural networks and LLMs; compute from silicon to data centers and hosting; building with AI (agents, harness engineering, skills); and the AI economy and geopolitics. Each path is built on a holistic mental model. Lessons are authored with animated figures, cross-referenced (builds on / comes back in), quizzed, linked to the user's News and papers, and supported by a tutor chat.

## Epic 1: Foundation & User Authentication

Users can create accounts, log in securely using email/password or federated identity providers, and manage their profiles. This epic establishes the authentication foundation required for all other features.

**FRs covered:** FR1, FR2, FR3, FR18

### Epic 2: Paper Discovery & Impact Dashboard

Users can discover new papers through an Impact Dashboard that shows high-novelty papers sorted by relevance, with filtering and basic save actions. Includes background arXiv fetching, dashboard display, impact cards, filtering, and basic interactions.

**FRs covered:** FR18, FR4, FR5, FR6, FR7, FR8

### Epic 3: Interactive Reading Experience

Users can read papers in an interactive HTML view with click-to-explain Intellisense, chat assistance, and PDF fallback. This delivers the core value proposition of Sphere - augmented reading with AI-powered explanations.

**FRs covered:** FR9, FR10, FR11, FR12, FR13

### Epic 4: Personal Library Management

Users can manage their reading lists: view saved papers, reorder priorities, track reading progress, and organize their collection. Builds upon the basic "Add to List" capability from Epic 2, providing full library management capabilities.

**FRs covered:** FR14, FR15, FR16, FR17

### Epic 5: Payment & Monetization (Post-MVP)

Users can access a free tier with limited article processing, and upgrade to pay-as-you-go or subscription plans via Stripe integration. This epic enables monetization and sustainable business operations.

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24

### Epic 6: Scheduled Content Processing & Pre-computation (Post-MVP)

System automatically fetches and pre-processes papers from arXiv on a scheduled basis, generating novelty scores and summaries in advance. This reduces user wait times and improves experience by having content ready when users log in.

**FRs covered:** FR25, FR26, FR27, FR28

### Epic 8: Breaking AI News (Post-MVP)

Beyond arXiv, users follow AI news breaking across Hacker News, Reddit, GitHub, news outlets and X. Items are grouped into stories, ranked by cross-platform heat, summarized, and each story opens as an AI-written breakdown with sources and bigger-picture analysis.

## Epic 1: Foundation & User Authentication

Users can create accounts, log in securely, and manage their profiles. This epic establishes the authentication foundation required for all other features.

**FRs covered:** FR1, FR2, FR3

### Story 1.1: Project Foundation Setup

As a developer,
I want to initialize the Next.js project with TypeScript, Tailwind CSS, database, and authentication infrastructure,
So that I have a solid foundation to build the authentication features.

**Acceptance Criteria:**

**Given** an empty project directory
**When** I run the Next.js initialization command with TypeScript and Tailwind CSS
**Then** the project is created with App Router structure, TypeScript configured, and Tailwind CSS installed
**And** import aliases are configured as `@/*`

**Given** the initialized Next.js project
**When** I install and configure Shadcn/UI
**Then** Shadcn/UI is initialized with Tailwind CSS configuration
**And** the components directory structure is set up

**Given** the initialized project
**When** I set up SQLite database with Prisma ORM
**Then** Prisma is installed and configured with SQLite provider
**And** the database schema file (`prisma/schema.prisma`) exists
**And** the users table schema is defined with NextAuth.js required fields (User, Account, Session, VerificationToken models)
**And** Prisma client can be generated successfully

**Given** Prisma schema is defined
**When** I run database migrations
**Then** the SQLite database file is created
**And** the users, accounts, sessions, and verification_tokens tables are created with correct schema

**Given** the project setup
**When** I install NextAuth.js with Prisma adapter
**Then** NextAuth.js and @auth/prisma-adapter are installed
**And** basic NextAuth.js configuration file structure is created (`app/api/auth/[...nextauth]/route.ts`)
**And** environment variables file (`.env.local`) is created with placeholders for NEXTAUTH_SECRET and DATABASE_URL
**And** the project structure follows the architecture specification (app/, components/, lib/, prisma/ directories)

**Given** all foundation components are set up
**When** I run the development server
**Then** the application starts without errors
**And** TypeScript compilation succeeds
**And** the database connection is established

### Story 1.2: User Registration

As a new user,
I want to create an account with my email and password,
So that I can access the application and save my reading progress.

**Acceptance Criteria:**

**Given** I am a new user visiting the registration page
**When** I navigate to the registration route (`/register`)
**Then** I see a registration form with email and password fields
**And** the form includes password confirmation field
**And** form validation is displayed for invalid inputs

**Given** the registration form is displayed
**When** I enter a valid email address and password that meets requirements
**And** I submit the registration form
**Then** NextAuth.js Credentials provider processes the registration
**And** a new user account is created in the database with hashed password (NFR5: passwords must be hashed and salted)
**And** I am automatically logged in and redirected to the dashboard

**Given** I submit the registration form
**When** the email address is already registered
**Then** an error message is displayed: "This email is already registered"
**And** the form remains on the registration page
**And** no duplicate user account is created

**Given** I submit the registration form
**When** the password does not meet security requirements (e.g., too short, no special characters as configured)
**Then** validation error messages are displayed
**And** the form submission is prevented
**And** no user account is created

**Given** I successfully register
**When** I check the database
**Then** my user record exists in the users table
**And** the password is stored as a hash (not plain text)
**And** my email is stored and associated with my user ID
**And** a session is created and stored in the sessions table

### Story 1.3: User Login

As a registered user,
I want to log in with my email and password,
So that I can access my account and continue using the application.

**Acceptance Criteria:**

**Given** I am a registered user
**When** I navigate to the login route (`/login`)
**Then** I see a login form with email and password fields
**And** the form follows the same styling and design patterns as the registration form

**Given** the login form is displayed
**When** I enter my registered email and correct password
**And** I submit the login form
**Then** NextAuth.js authenticates my credentials
**And** I am logged in successfully
**And** I am redirected to the dashboard (or previously intended destination)
**And** a session is created and stored

**Given** I submit the login form
**When** the email is not registered or the password is incorrect
**Then** an error message is displayed: "Invalid email or password"
**And** the form remains on the login page
**And** no session is created
**And** the error message does not reveal whether the email exists or password is wrong (security best practice)

**Given** I am logged in
**When** I navigate to protected routes
**Then** I can access authenticated pages
**And** my user session is maintained across page navigation
**And** I can see my user information (via NextAuth.js session)

**Given** I am logged in
**When** I refresh the page
**Then** my session persists
**And** I remain logged in
**And** I do not need to re-authenticate

### Story 1.4: Password Reset

As a registered user,
I want to reset my password via email link,
So that I can regain access to my account if I forget my password.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I click the "Forgot Password" link
**Then** I am navigated to a password reset request page
**And** a form is displayed with an email input field

**Given** the password reset request form
**When** I enter my registered email address
**And** I submit the form
**Then** NextAuth.js sends a password reset email to my email address
**And** a verification token is generated and stored in the verification_tokens table
**And** a confirmation message is displayed: "If an account exists, a password reset link has been sent to your email"
**And** the message does not reveal whether the email exists (security best practice)

**Given** I receive the password reset email
**When** I click the password reset link in the email
**Then** I am redirected to a password reset page with a valid token
**And** a form is displayed with new password and password confirmation fields

**Given** the password reset form with valid token
**When** I enter a new password that meets requirements
**And** I submit the form
**Then** my password is updated in the database (hashed and salted - NFR5)
**And** the verification token is invalidated (deleted from verification_tokens table)
**And** I am redirected to the login page
**And** a success message is displayed: "Password reset successful. Please log in with your new password"

**Given** I click the password reset link
**When** the token is invalid or expired
**Then** an error message is displayed: "Invalid or expired reset link"
**And** I am redirected to the password reset request page
**And** I can request a new password reset email

**Given** I submit the password reset form
**When** the new password does not meet security requirements
**Then** validation error messages are displayed
**And** the form submission is prevented
**And** my password is not updated

### Story 1.5: View Account Profile

As a logged-in user,
I want to view my account profile details,
So that I can see my account information and verify my profile settings.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to the profile route (`/profile`)
**Then** I see my account profile page
**And** my email address is displayed
**And** my account creation date is displayed
**And** the page is styled consistently with the rest of the application

**Given** the profile page is displayed
**When** I view the page
**Then** only my own profile information is visible (NFR6: user data accessible only to authenticated user)
**And** I cannot access other users' profile information by modifying the URL

**Given** the profile page
**When** I am not logged in
**And** I try to access the profile route directly
**Then** I am redirected to the login page
**And** after login, I am redirected back to the profile page (if applicable)

**Given** the profile page
**When** my session expires
**Then** I am redirected to the login page
**And** I must re-authenticate to access my profile

**Given** the profile page is displayed
**When** the page loads
**Then** my profile information is fetched from the database using my authenticated user ID
**And** the data is displayed correctly
**And** loading states are shown appropriately during data fetch

## Epic 2: Paper Discovery & Impact Dashboard

Users can discover new papers through an Impact Dashboard that shows high-novelty papers sorted by relevance, with filtering and basic save actions. Includes background arXiv fetching, dashboard display, impact cards, filtering, and basic interactions.

**FRs covered:** FR18, FR4, FR5, FR6, FR7, FR8

### Story 2.1: Papers Database Schema

As a developer,
I want to define the database schema for storing paper metadata, user fetch timestamps, and user-paper state relationships,
So that papers from arXiv can be stored and retrieved with all necessary information and user interaction states.

**Acceptance Criteria:**

**Given** the Prisma schema file exists
**When** I define the Paper model in the schema
**Then** the model includes fields for: arxiv_id (unique, string), title (string), authors (JSON array or string), abstract (text), publication_date (DateTime), updated_date (DateTime), categories (JSON array or string), pdf_url (string), html_url (string), novelty_score (Float, nullable), novelty_summary (text, nullable), created_at (DateTime), updated_at (DateTime)
**And** arxiv_id is marked as unique to prevent duplicate papers

**Given** the Prisma schema file
**When** I define a UserFetchTimestamp model (or add to User model)
**Then** the model tracks last_fetch_timestamp (DateTime) per user
**And** it is associated with the User model via user_id foreign key
**And** it supports storing null timestamp for users who haven't fetched yet

**Given** the Prisma schema file
**When** I define a UserPaperState model (or junction table)
**Then** the model associates users with papers via user_id and paper_id foreign keys
**And** it includes a status field (enum or string) with values: "new", "dismissed", "read", "being_processed"
**And** it includes a display_order field (Integer, nullable) for manual library ordering
**And** it includes timestamps: created_at, updated_at
**And** the combination of user_id and paper_id is unique (one state per user-paper pair)
**And** the default status for new associations is "new"
**And** display_order defaults to null (uses default sorting when not manually ordered)

**Given** the schema is defined
**When** I run Prisma migrations
**Then** the papers table is created in the SQLite database
**And** the user_fetch_timestamps table is created (or field added to users table)
**And** the user_paper_states table is created with proper relationships
**And** all fields have appropriate data types and constraints
**And** the arxiv_id unique constraint is enforced
**And** the user_id + paper_id unique constraint is enforced

**Given** the database schema is created
**When** I generate the Prisma client
**Then** TypeScript types are generated for Paper, UserFetchTimestamp, and UserPaperState models
**And** the types can be imported and used in API routes and components
**And** the UserPaperState enum/type includes all four status values
**And** the UserPaperState type includes the display_order field (Integer | null)

### Story 2.2: arXiv API Service & Paper Fetching on Login

As a logged-in user,
I want the system to automatically fetch new papers from arXiv when I log in,
So that I have fresh content available on my dashboard.

**Acceptance Criteria:**

**Given** I am logged in
**When** my authentication session is established
**Then** the system checks my last_fetch_timestamp from the database
**And** if no timestamp exists, it fetches papers from the last 7 days (or reasonable default)
**And** if timestamp exists, it constructs a date filter query for papers since that timestamp

**Given** the arXiv API service is called
**When** the fetch request is made to `https://export.arxiv.org/api/query`
**Then** the request includes query parameters: search_query with submittedDate filter, max_results for pagination, sortBy and sortOrder
**And** the API response (Atom XML format) is parsed correctly
**And** metadata is extracted from each entry: id, title, summary, author, published, updated, category, links

**Given** the API response is parsed
**When** papers are processed
**Then** each paper's arXiv ID is extracted from the `<id>` element
**And** the HTML URL is constructed by appending `/html` to the abstract URL pattern
**And** PDF URL is extracted from the `<link rel="related" type="application/pdf">` element
**And** duplicate papers (matching arXiv ID) are detected and skipped

**Given** new papers are identified
**When** papers are stored in the database
**Then** each paper is inserted into the papers table with all metadata fields
**And** if a paper with the same arxiv_id already exists, it is updated (not duplicated)
**And** the user's last_fetch_timestamp is updated to the current timestamp

**Given** the arXiv API fetch completes
**When** the API rate limit is exceeded or an error occurs
**Then** the error is handled gracefully (NFR3: graceful degradation)
**And** existing papers in the database remain accessible
**And** the fetch process does not crash the application
**And** a log entry is created for debugging (optional but recommended)

**Given** the fetch process completes (successfully or with errors)
**When** I navigate to the dashboard
**Then** newly fetched papers are available for display
**And** the fetch process does not block the login flow (can be async/background)

### Story 2.3: Novelty Scoring Service

As a system component,
I want to score papers for novelty using LLM analysis,
So that papers can be ranked by their groundbreaking potential on the dashboard.

**Acceptance Criteria:**

**Given** a paper has been fetched and stored in the database
**When** the novelty scoring service is called for that paper
**Then** the paper's title, abstract, and metadata are sent to the LLM API
**And** the LLM prompt analyzes the paper for novelty (groundbreaking potential vs. incremental progress)
**And** the response includes both a novelty score (numeric, e.g., 0-10) and a summary explaining why it's novel

**Given** the LLM API responds with a novelty score and summary
**When** the response is processed
**Then** the novelty_score field is updated in the papers table
**And** the novelty_summary field is stored with the explanation text
**And** the score and summary are persisted to the database

**Given** the novelty scoring service is called
**When** the LLM API is unavailable or returns an error
**Then** the error is handled gracefully (NFR3, NFR4: graceful degradation, no state crash)
**And** the paper's novelty_score remains null
**And** the paper is still available for display (with null score treated as unscored)
**And** the application continues to function normally
**And** (Nice-to-have) retry mechanisms are implemented with exponential backoff for transient failures
**And** (Nice-to-have) failed scoring attempts are logged for later retry

**Given** a paper lacks a novelty score
**When** a user views the paper on the dashboard or paper details
**Then** a "Calculate Novelty Score" button or action is available
**And** when the user triggers the manual scoring action
**Then** the novelty scoring service is called for that specific paper
**And** the user sees feedback that scoring is in progress
**And** when scoring completes, the score and summary are displayed

**Given** multiple papers need scoring
**When** scoring is performed
**Then** papers can be scored in batch or individually
**And** scoring can be triggered during paper fetch or as a separate process
**And** scoring latency does not block the paper fetch process (can be async)

**Note:** Retry mechanisms and manual trigger functionality are nice-to-have enhancements. If not implemented in MVP, they can be added in a future iteration.

### Story 2.4: Impact Dashboard Page with Papers Display

As a logged-in user,
I want to view a dashboard with a novelty carousel and paper lists,
So that I can quickly identify the most groundbreaking research and manage my library.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to the dashboard route (`/dashboard`)
**Then** I see the Impact Dashboard page with a novelty carousel at the top
**And** below the carousel, I see "Incoming Articles" section with papers sorted by novelty_score (descending, with null scores last)
**And** only papers with status "new" (not dismissed, not in library) are displayed in "Incoming Articles"
**And** papers are displayed using Impact Cards in a list or grid layout

**Note:** The "My Library" section is implemented in Story 4.1 (Dashboard Library Section & Drag-and-Drop Management). This story focuses on the novelty carousel and "Incoming Articles" section.

**Given** the dashboard page loads
**When** papers are being fetched
**Then** a loading state is displayed (NFR2: page load considerations)
**And** the loading state is replaced with paper content when data is ready

**Given** papers are displayed on the dashboard
**When** I view the page
**Then** papers with higher novelty scores appear before papers with lower scores
**And** papers without novelty scores appear at the end of the list
**And** each paper is displayed with at minimum: title, authors, and novelty score (if available)

**Given** papers are displayed on the dashboard
**When** a paper receives a novelty score (either automatically via background scoring or manually triggered)
**Then** the dashboard dynamically updates to reflect the new score
**And** the paper's position in the sorted list updates accordingly (moves up if score is high)
**And** the update happens without requiring a full page refresh (client-side update or polling)

**Given** the dashboard displays papers
**When** no papers have been fetched yet
**Then** an empty state message is displayed: "No papers available. Papers will appear here after your first login."
**And** the message is user-friendly and provides context

**Given** the dashboard displays papers
**When** all papers have been dismissed
**Then** an empty state message is displayed: "No papers to display. All papers have been dismissed."
**And** I can navigate to other sections of the application

### Story 2.5: Impact Card Component

As a logged-in user,
I want to view detailed Impact Cards for each paper,
So that I can quickly assess the paper's relevance and novelty before reading.

**Acceptance Criteria:**

**Given** papers are displayed on the dashboard
**When** I view an Impact Card
**Then** the card displays: paper title, authors list, novelty score (if available), and "Why it Matters" summary (novelty_summary from database)
**And** the card is styled consistently with the application design system (Shadcn/UI components)

**Given** an Impact Card is displayed
**When** the paper has a novelty score
**Then** the score is displayed prominently (e.g., "Novelty: 8.5/10")
**And** the "Why it Matters" summary is displayed below or adjacent to the score
**And** the summary explains why the paper is considered novel

**Given** an Impact Card is displayed
**When** the paper does not have a novelty score yet
**Then** the card indicates "Scoring in progress" or "Score pending"
**And** the card is still fully functional (can be clicked, saved, dismissed)
**And** the card displays all other available information (title, authors)

**Given** an Impact Card
**When** I interact with it
**Then** the card is clickable and navigates to the paper reader view (Epic 3)
**And** hover states provide visual feedback
**And** the card layout is responsive (works on desktop and mobile)

**Given** Impact Cards are displayed
**When** I view multiple cards
**Then** cards are laid out in a grid or list that is visually organized
**And** the layout adapts to screen size (responsive design)
**And** cards have consistent spacing and alignment

### Story 2.6: Dashboard Filtering by Research Fields

As a logged-in user,
I want to filter the dashboard by specific research fields/categories,
So that I can focus on papers relevant to my interests.

**Acceptance Criteria:**

**Given** papers are displayed on the dashboard
**When** I view the dashboard
**Then** a filter bar or filter controls are visible
**And** available research fields/categories are extracted from the papers' categories field
**And** filter options are displayed (e.g., checkboxes, dropdown, or chips)

**Given** the filter controls are displayed
**When** I select one or more research field filters
**Then** the dashboard updates to show only papers matching the selected categories
**And** the filtering happens client-side or via API call (based on implementation approach)
**And** the URL or state reflects the active filters (for shareability/persistence)

**Given** I have applied filters
**When** I clear or deselect all filters
**Then** all papers are displayed again (no filters active)
**And** the dashboard returns to showing all papers sorted by novelty score

**Given** filters are applied
**When** no papers match the selected filters
**Then** an empty state message is displayed: "No papers found matching the selected filters."
**And** I can easily clear filters to see all papers again

**Given** the filter functionality
**When** I navigate away from the dashboard and return
**Then** filter state can be preserved (via URL params or session, implementation choice)
**Or** filters reset to default (show all) - either approach is acceptable for MVP

### Story 2.7: Add to List Action from Impact Card

As a logged-in user,
I want to add papers to my reading list directly from the Impact Card,
So that I can quickly save papers I want to read later.

**Acceptance Criteria:**

**Given** an Impact Card is displayed on the dashboard
**When** I click the "Add to List" button on the card
**Then** the user-paper state association is created/updated in the user_paper_states table (status remains "new" or appropriate state)
**And** a library association is created linking the paper to my user account
**And** a success feedback is shown (e.g., toast notification, button state change)
**And** the button state updates to indicate the paper is saved (e.g., "Added" or checkmark icon)

**Given** I click "Add to List"
**When** the paper is already in my library
**Then** no duplicate association is created
**And** appropriate feedback is shown (e.g., "Already in your list")
**And** the button reflects the saved state

**Given** the "Add to List" action
**When** the API request fails
**Then** an error message is displayed
**And** the paper is not added to the library
**And** the button state does not change
**And** the error is handled gracefully (NFR4: no state crash)

**Given** I have added papers to my list
**When** I navigate to the library page (Epic 4)
**Then** the papers I added are visible in my library
**And** the library correctly reflects my saved papers

**Note:** This story creates basic library association functionality. Full library management (viewing, reordering, marking read, removing) is implemented in Epic 4.

### Story 2.8: Dismiss Paper from Dashboard

As a logged-in user,
I want to dismiss papers from the dashboard,
So that I can hide papers I'm not interested in and keep my dashboard focused.

**Acceptance Criteria:**

**Given** an Impact Card is displayed on the dashboard
**When** I click the "Dismiss" button on the card
**Then** the paper is marked as dismissed for my user account
**And** the card is immediately removed from my dashboard view
**And** a success feedback is shown (e.g., toast notification or smooth animation)

**Given** I dismiss a paper
**When** the dismissal is processed
**Then** the user-paper state association is created/updated with status "dismissed" in the user_paper_states table
**And** the paper no longer appears in my dashboard
**And** the paper can still be accessed via direct link or search if needed

**Given** I dismiss a paper
**When** I refresh the dashboard
**Then** the dismissed paper does not reappear
**And** my dismissal preference is persisted in the database

**Given** the "Dismiss" action
**When** the API request fails
**Then** an error message is displayed
**And** the paper remains visible on the dashboard
**And** the error is handled gracefully (NFR4: no state crash)

**Given** I have dismissed papers
**When** I view my dashboard
**Then** only non-dismissed papers are displayed
**And** the dashboard filtering/sorting continues to work correctly with dismissed papers excluded

## Epic 3: Interactive Reading Experience

Users can read papers in an interactive HTML view with click-to-explain Intellisense, chat assistance, and PDF fallback. This delivers the core value proposition of Sphere - augmented reading with AI-powered explanations.

**FRs covered:** FR9, FR10, FR11, FR12, FR13

### Story 3.1: Paper Reader Route & HTML Rendering

As a logged-in user,
I want to open a paper in a distraction-free HTML reading view,
So that I can read papers with high-fidelity rendering of content including equations and figures.

**Acceptance Criteria:**

**Given** I am logged in and viewing a paper from the dashboard or library
**When** I click to open a paper
**Then** I am navigated to the reader route (`/reader/[id]`)
**And** the paper's HTML content is fetched from the arXiv HTML URL (constructed from arxiv_id)
**And** the HTML is rendered in a distraction-free reading view

**Given** the paper's HTML URL is constructed
**When** the HTML content is fetched
**Then** the URL follows the pattern: `https://arxiv.org/html/{arxiv_id}`
**And** if the HTML URL returns 404, the system falls back to PDF view (Story 3.2)
**And** if HTML is available, it is fetched and cached appropriately

**Given** HTML content is fetched
**When** the HTML is rendered in the reader component
**Then** the HTML structure is preserved (math equations, figures, citations)
**And** the content is styled with Academic Minimalist aesthetic (serif font, clean layout)
**And** equations and mathematical notation render correctly
**And** figures and images display properly

**Given** the reader page loads
**When** I view the paper
**Then** the page has minimal UI chrome (focus on content)
**And** navigation controls are accessible but unobtrusive
**And** the layout is responsive (works on desktop and mobile)
**And** scrolling is smooth and reading-focused

**Given** the reader page
**When** I am not logged in
**And** I try to access the reader route directly
**Then** I am redirected to the login page
**And** after login, I am redirected back to the reader

**Given** the paper is opened
**When** the page loads
**Then** the paper's reading state is updated to "being_processed" in user_paper_states table (if not already set)

### Story 3.2: PDF Fallback View

As a logged-in user,
I want to view papers as PDF when HTML is not available,
So that I can still read older papers that don't have HTML versions.

**Acceptance Criteria:**

**Given** I open a paper in the reader
**When** the HTML URL returns 404 (HTML not available)
**Then** the system automatically falls back to PDF view
**And** the PDF is fetched from the stored pdf_url (from paper metadata)
**And** a PDF viewer component is displayed

**Given** PDF fallback is triggered
**When** the PDF viewer loads
**Then** the PDF is rendered using browser's native PDF viewer or PDF.js
**And** the view is clean and distraction-free (no sidebar)
**And** standard PDF viewer controls are available (zoom, scroll, download)

**Given** the PDF view is displayed
**When** I interact with the PDF
**Then** standard PDF viewer controls are available (zoom, scroll, download)
**And** the layout is clean and focused on the PDF content
**And** the layout is responsive

**Given** I am viewing a paper with HTML available
**When** I explicitly request PDF view (via a toggle or button)
**Then** the view switches to PDF (clean view, no sidebar)
**And** I can switch back to HTML view if desired

**Given** the PDF fallback
**When** the PDF URL is invalid or fails to load
**Then** an error message is displayed: "Unable to load paper. Please try again later."
**And** the error is handled gracefully
**And** I can navigate back to the dashboard

### Story 3.3: Text Selection & Context Menu for Intellisense

As a logged-in user reading a paper,
I want to select text and see a context menu with options to explain or ask questions,
So that I can quickly access explanations for complex terms and concepts.

**Acceptance Criteria:**

**Given** I am viewing a paper in the HTML reader
**When** I select text (a word, phrase, or equation)
**Then** a context menu appears above or near the selection
**And** the menu displays options: "Explain" and "Ask in Deep Dive" (or similar labels)
**And** the selected text remains highlighted

**Given** text is selected
**When** the context menu is displayed
**Then** the menu is positioned to not obscure the selected text
**And** the menu is styled consistently with the application design system
**And** clicking outside the menu or pressing Escape dismisses it

**Given** I select text
**When** the Chat/Deep Dive pane is closed
**Then** the "Explain" option is primary (leads to Intellisense popover - Story 3.4)
**And** the "Ask in Deep Dive" option opens the Deep Dive pane (Story 3.5)

**Given** I select text
**When** the Chat/Deep Dive pane is already open
**Then** the "Ask in Deep Dive" option is primary (adds selected text to Deep Dive context)
**And** the selected text is automatically quoted in the Deep Dive input

**Given** text selection and context menu
**When** I interact with the menu
**Then** the interaction feels responsive (< 100ms feedback)
**And** the selected text highlight persists until the menu action is completed or dismissed
**And** the menu works on both desktop (mouse) and mobile (touch)

### Story 3.4: Intellisense Explanation Service & Popover Display

As a logged-in user reading a paper,
I want to click on terms or equations to get instant simplified explanations,
So that I can quickly understand complex concepts without losing my reading flow.

**Acceptance Criteria:**

**Given** I select text and click "Explain" from the context menu
**When** the Intellisense action is triggered
**Then** a popover appears near the selected text
**And** the selected text is sent to the LLM explanation API endpoint
**And** a loading state is shown in the popover (optimistic UI)

**Given** the LLM explanation API is called
**When** the explanation is generated
**Then** the response includes a simplified explanation or analogy
**And** the explanation is context-aware (references the paper's content)
**And** the response starts streaming within 3 seconds (NFR1: interaction latency)
**And** the explanation is displayed in the popover as it streams

**Given** the Intellisense popover displays an explanation
**When** I view the explanation
**Then** it is written in clear, accessible language
**And** it provides analogies or examples when helpful
**And** it references the specific context from the paper
**And** the popover has options to: close, or ask follow-up question

**Given** the Intellisense popover displays an explanation
**When** I click "Ask follow-up" or similar action
**Then** the Deep Dive panel automatically opens
**And** the selected text and Intellisense explanation are transferred to the Deep Dive conversation
**And** the conversation context includes the original question and explanation
**And** I can immediately continue the conversation in the Deep Dive panel

**Given** the Intellisense explanation
**When** the LLM API is unavailable or returns an error
**Then** an error message is displayed: "Explanation unavailable. Try the Deep Dive panel for more help."
**And** the error is handled gracefully (NFR3, NFR4: graceful degradation, no state crash)
**And** I can still continue reading the paper
**And** an option to open Deep Dive pane is provided

**Given** the Intellisense popover
**When** I click outside it or press Escape
**Then** the popover closes
**And** the text highlight fades
**And** I return to reading mode

**Given** multiple Intellisense interactions
**When** I click different terms
**Then** each explanation appears in a new popover
**And** previous popovers close when new ones open
**And** the interactions feel smooth and non-intrusive

### Story 3.5: Interactive Deep Dive Panel (Chat with Paper)

As a logged-in user reading a paper,
I want to open an interactive Deep Dive panel that acts like a sophisticated research assistant,
So that I can explore the paper deeply, ask complex questions, and investigate references and related topics.

**Acceptance Criteria:**

**Given** I am viewing a paper in the reader
**When** I open the Deep Dive panel (via context menu, button, or swipe gesture)
**Then** the panel slides in from the right side (desktop) or as a full-screen overlay (mobile)
**And** the panel displays a sophisticated interface similar to Cursor's AI interface
**And** the panel includes: conversation history, input area, and contextual information display

**Given** the Deep Dive panel is open
**When** I view the interface
**Then** it shows previous conversation context (if any)
**And** it has a prominent input area for questions and commands
**And** it displays paper metadata and current section context
**And** it supports multi-turn conversations with full paper context

**Given** I select text in the paper while Deep Dive is open
**When** the text is selected
**Then** the selected text is automatically quoted in the Deep Dive input area as a "Context Block"
**And** the quoted text is visually distinct (blockquote styling)
**And** I can edit or remove the quoted text before sending

**Given** I compose a question or command in Deep Dive
**When** I send my message
**Then** the LLM receives the full paper content as context
**And** my question/command is processed with awareness of the entire paper
**And** the response starts streaming within 3 seconds (NFR1: interaction latency)
**And** the response is displayed in a conversational format with proper formatting

**Given** the Deep Dive panel
**When** I ask questions about the paper
**Then** I can ask about: specific concepts, methodology, results, implications, comparisons
**And** the AI provides detailed, cited responses referencing specific sections
**And** responses include visual citations (section numbers, page references)
**And** the AI acts as a teacher, providing educational explanations, breaking down complex concepts, and guiding understanding

**Given** the Deep Dive panel
**When** I want to learn or understand concepts better
**Then** I can ask the AI to teach me about topics
**And** the AI provides structured, educational responses (like a tutor)
**And** the AI can break down complex ideas into simpler components
**And** the AI can provide step-by-step explanations and learning paths
**And** the AI adapts its teaching style based on my questions and level of understanding

**Given** the Deep Dive panel
**When** I want to explore references or related topics
**Then** I can ask: "Explain this reference" or "What is [concept] mentioned in the references?"
**And** the AI can discuss referenced concepts and papers (within its training knowledge)
**And** I can ask for related papers or concepts outside the current paper
**And** the AI provides context and explanations about external references
**And** the AI teaches about referenced concepts in an educational manner

**Given** the Deep Dive conversation
**When** the AI responds
**Then** responses are formatted with markdown support (code blocks, lists, emphasis)
**And** citations from the paper are visually highlighted
**And** mathematical expressions render correctly
**And** I can copy text from responses

**Given** the Deep Dive panel
**When** the LLM API is unavailable or returns an error
**Then** an error message is displayed: "Deep Dive service unavailable. Please try again."
**And** the error is handled gracefully (NFR3, NFR4: graceful degradation)
**And** previous conversation history is preserved
**And** I can retry the request

**Given** the Deep Dive panel
**When** I want to navigate or focus
**Then** I can minimize the panel (swipe out or collapse)
**And** the panel state is preserved when minimized
**And** I can return to the conversation later
**And** the reading view remains accessible (split-view on desktop)

**Given** the Deep Dive conversation
**When** I have an extended conversation
**Then** conversation history is maintained throughout the session
**And** the AI maintains context of previous questions and answers
**And** I can reference previous parts of the conversation
**And** conversation can be cleared/reset if needed

**Note:** This Deep Dive panel is critical to Sphere's success. It should feel like a sophisticated research assistant (similar to Cursor's interface), not a simple customer service chat. It enables deep exploration, reference investigation, and comprehensive understanding of papers.

### Story 3.6: Paper Reading State Tracking

As a logged-in user,
I want the system to track when I start reading a paper,
So that my reading progress and state are properly maintained.

**Acceptance Criteria:**

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

## Epic 4: Personal Library Management

Users can manage their reading lists: view saved papers, reorder priorities, track reading progress, and organize their collection. Builds upon the basic "Add to List" capability from Epic 2, providing full library management capabilities.

**FRs covered:** FR14, FR15, FR16, FR17

### Story 4.1: Dashboard Library Section & Drag-and-Drop Management

As a logged-in user,
I want to see my library integrated into the dashboard with drag-and-drop functionality,
So that I can manage my reading list directly on the dashboard without navigating to a separate page.

**Acceptance Criteria:**

**Given** I am viewing the dashboard
**When** the dashboard loads
**Then** I see two sections below the novelty carousel: "Incoming Articles" (sorted by novelty score) and "My Library"
**And** the "Incoming Articles" section shows papers from the dashboard (status "new", not dismissed, not in library)
**And** the "My Library" section shows papers where status is NOT "dismissed" and the paper is in my library (has user_paper_states record with status "new", "being_processed", or "read")
**And** papers in "My Library" are ordered by display_order (ascending, nulls last), then by created_at

**Given** the dashboard displays both sections
**When** I view the layout
**Then** both sections are clearly labeled and visually distinct
**And** Impact Cards are used consistently in both sections
**And** the layout is responsive and works on desktop and mobile

**Given** I want to add a paper to my library
**When** I drag an Impact Card from the "Incoming Articles" section to the "My Library" section
**Then** a user_paper_states record is created for that paper with status "new"
**And** the card moves from "Incoming Articles" to "My Library" section
**And** the display_order is set appropriately (at end of library list)
**And** the change is saved to the database
**And** visual feedback confirms the action (animation, success indicator)

**Given** I want to reorder papers in my library
**When** I drag a card within the "My Library" section to a new position
**Then** the paper's display_order is updated in the database
**And** the display_order values are recalculated to maintain sequential ordering (1, 2, 3...)
**And** the UI updates immediately to reflect the new order (optimistic update)
**And** the new order is persisted to the database
**And** visual feedback shows the reordering action

**Given** drag-and-drop functionality
**When** I drag cards between sections or within library
**Then** drag handles or card areas are clearly indicated
**And** drop zones are visually highlighted when dragging over them
**And** the interaction works on both desktop (mouse) and mobile (touch)
**And** drag-and-drop is accessible (keyboard alternatives or other input methods supported)

**Given** I perform drag-and-drop actions
**When** the API request fails
**Then** the UI reverts to the previous state
**And** an error message is displayed
**And** the error is handled gracefully
**And** I can retry the action

**Given** the dashboard library section
**When** "My Library" is empty
**Then** an empty state message is displayed: "Drag papers from Incoming Articles to add them to your library."
**And** the message guides users on how to use the feature

**Given** I have reordered papers in my library
**When** I refresh the dashboard
**Then** papers appear in the order I set
**And** my manual ordering preference is preserved

### Story 4.2: Mark Paper as Read

As a logged-in user,
I want to mark papers as "read" in my library,
So that I can track which papers I've completed and archive them from my active reading list.

**Acceptance Criteria:**

**Given** I am viewing a paper in my library
**When** I click the "Mark as Read" button or action
**Then** the paper's status in user_paper_states is updated from "new" or "being_processed" to "read"
**And** a success feedback is shown (e.g., toast notification or visual state change)
**And** the paper's visual indicator updates to show "read" status

**Given** I mark a paper as read
**When** the status update is processed
**Then** the update is saved to the database
**And** if the library has a filter for "unread" papers, the paper is removed from that view
**And** the paper can still be accessed and viewed if needed

**Given** I mark a paper as read
**When** I view the dashboard
**Then** the paper remains in "My Library" section
**And** read papers are visually distinguished (e.g., grayed out, checkmark icon, or status badge)
**And** the paper's status indicator shows "read"

**Given** the "Mark as Read" action
**When** the API request fails
**Then** an error message is displayed
**And** the paper status is not updated
**And** the error is handled gracefully

**Given** I mark papers as read
**When** I navigate away and return to the library
**Then** the read status is preserved
**And** papers remain marked as read

### Story 4.3: Remove Paper from Library

As a logged-in user,
I want to remove papers from my library,
So that I can clean up my reading list and remove papers I no longer want to track.

**Acceptance Criteria:**

**Given** I am viewing a paper in my library
**When** I click the "Remove" or "Delete" button
**Then** a confirmation dialog is shown: "Remove this paper from your library?"
**And** I can confirm or cancel the action

**Given** I confirm removal of a paper
**When** the removal action is processed
**Then** the user_paper_states record is deleted (or status updated to a "removed" state, implementation choice)
**And** the paper is immediately removed from my library view
**And** a success feedback is shown

**Given** I remove a paper from my library
**When** the removal is processed
**Then** the paper no longer appears in my library list
**And** if the paper was in "being_processed" or "read" state, that state is cleared
**And** the paper can still appear in the dashboard if it hasn't been dismissed (separate from library)

**Given** I remove a paper from my library
**When** I view the dashboard
**Then** the paper is removed from "My Library" section
**And** if the paper hasn't been dismissed, it may reappear in "Incoming Articles" section
**And** the removal is processed correctly

**Given** the "Remove" action
**When** the API request fails
**Then** an error message is displayed
**And** the paper remains in my library
**And** the error is handled gracefully

**Given** I remove papers from my library
**When** I navigate away and return
**Then** removed papers do not reappear
**And** my library reflects only the papers I've kept

## Epic 5: Payment & Monetization (Post-MVP)

Users can access a free tier with limited article processing, and upgrade to pay-as-you-go or subscription plans via Stripe integration. This epic enables monetization and sustainable business operations.

**FRs covered:** FR19, FR20, FR21, FR22, FR23, FR24

### Story 5.1: Payment Database Schema & User Quota Tracking

As a developer,
I want to define the database schema for payment plans, user quotas, and transaction tracking,
So that the system can enforce usage limits and process payments correctly.

**Acceptance Criteria:**

**Given** the Prisma schema file exists
**When** I define the PaymentPlan model (or add to User model)
**Then** the model includes fields for: plan_type (enum: "free", "pay_as_you_go", "subscription"), articles_remaining (Integer), articles_limit (Integer), stripe_customer_id (String, nullable), stripe_subscription_id (String, nullable), subscription_status (String, nullable), created_at (DateTime), updated_at (DateTime)
**And** it is associated with the User model via user_id foreign key

**Given** the Prisma schema file
**When** I define a Transaction model
**Then** the model includes fields for: user_id (foreign key), transaction_type (enum: "one_time_payment", "subscription_payment"), amount (Decimal), currency (String), stripe_payment_intent_id (String, nullable), stripe_subscription_id (String, nullable), status (enum: "pending", "completed", "failed"), articles_purchased (Integer, nullable), created_at (DateTime)
**And** it tracks all payment transactions for audit and reconciliation

**Given** the schema is defined
**When** I run Prisma migrations
**Then** the payment_plans table (or fields added to users table) is created
**And** the transactions table is created with proper relationships
**And** all fields have appropriate data types and constraints

**Given** the database schema is created
**When** I generate the Prisma client
**Then** TypeScript types are generated for PaymentPlan and Transaction models
**And** the types can be imported and used in API routes and components

### Story 5.2: Free Tier Enforcement & Quota Management

As a logged-in user,
I want to understand my article processing quota and see when I need to upgrade,
So that I can manage my usage and make informed decisions about payment.

**Acceptance Criteria:**

**Given** I am a new user
**When** I register an account
**Then** a free tier payment plan is automatically created for me
**And** my articles_remaining is set to 5
**And** my articles_limit is set to 5
**And** my plan_type is set to "free"

**Given** I process an article (novelty scoring, summary generation, or LLM interactions)
**When** the processing is requested
**Then** the system checks my articles_remaining quota
**And** if articles_remaining > 0, the processing proceeds and articles_remaining is decremented
**And** if articles_remaining = 0, the processing is blocked and I am prompted to upgrade

**Given** I view my account profile or dashboard
**When** the page loads
**Then** my current quota status is displayed (e.g., "3 of 5 articles remaining")
**And** my current plan type is shown (e.g., "Free Tier")
**And** upgrade options are clearly visible when quota is low or exhausted

**Given** I have exhausted my free tier quota
**When** I attempt to process an article
**Then** a payment wall is displayed
**And** the wall explains my quota is exhausted
**And** it presents options: "Purchase Credits" (pay-as-you-go) or "Subscribe" (monthly unlimited)
**And** I cannot proceed with processing until I upgrade

**Given** quota management is implemented
**When** I upgrade to a paid plan
**Then** my quota is updated according to the new plan
**And** the quota display reflects the new limits immediately

### Story 5.3: Stripe Integration & Pay-as-You-Go Purchases

As a logged-in user,
I want to purchase article processing credits on a one-time basis,
So that I can try the service without committing to a subscription.

**Acceptance Criteria:**

**Given** I want to purchase credits
**When** I click "Purchase Credits" from the payment wall or account page
**Then** I am presented with credit package options (e.g., 10 articles for $X, 25 articles for $Y)
**And** pricing is clearly displayed
**And** I can select a package

**Given** I select a credit package
**When** I proceed to checkout
**Then** Stripe Checkout is initialized with the selected package
**And** I am redirected to Stripe's secure payment page
**And** I can enter my payment information securely

**Given** I complete payment on Stripe
**When** the payment is successful
**Then** Stripe sends a webhook to our application
**And** a Transaction record is created with status "completed"
**And** my articles_remaining quota is increased by the purchased amount
**And** I am redirected back to the application with a success message
**And** I can immediately use the purchased credits

**Given** payment processing
**When** the payment fails or is cancelled
**Then** a Transaction record is created with status "failed" or "pending"
**And** my quota is not updated
**And** an appropriate error message is displayed
**And** I can retry the purchase

**Given** Stripe webhook integration
**When** Stripe sends payment events
**Then** the webhook endpoint verifies the webhook signature
**And** payment_intent.succeeded events update transactions and quotas
**And** payment_intent.payment_failed events are logged appropriately
**And** webhook processing is idempotent (handles duplicate events)

### Story 5.4: Subscription Plan Management

As a logged-in user,
I want to subscribe to a monthly plan for unlimited article processing,
So that I can use the service without worrying about per-article costs.

**Acceptance Criteria:**

**Given** I want to subscribe
**When** I click "Subscribe" from the payment wall or account page
**Then** I am presented with subscription plan options (e.g., Monthly Unlimited for $X/month)
**And** plan features and pricing are clearly displayed
**And** I can select a subscription plan

**Given** I select a subscription plan
**When** I proceed to checkout
**Then** Stripe Checkout is initialized for subscription creation
**And** I am redirected to Stripe's secure payment page
**And** I can enter my payment information for recurring billing

**Given** I complete subscription payment
**When** the subscription is created successfully
**Then** Stripe creates a subscription and sends a webhook
**And** my PaymentPlan is updated: plan_type = "subscription", articles_remaining = -1 (unlimited), stripe_subscription_id is stored
**And** subscription_status is set to "active"
**And** I am redirected back with a success message
**And** I have unlimited article processing immediately

**Given** I have an active subscription
**When** I process articles
**Then** my articles_remaining is not decremented (unlimited)
**And** quota checks pass automatically
**And** no payment wall is displayed

**Given** subscription management
**When** Stripe sends subscription webhook events
**Then** customer.subscription.created events activate the subscription
**And** customer.subscription.updated events update subscription status
**And** customer.subscription.deleted events downgrade to free tier
**And** invoice.payment_succeeded events are logged
**And** invoice.payment_failed events trigger dunning/retry logic

**Given** I have a subscription
**When** I view my account page
**Then** my subscription status is displayed (e.g., "Active - Unlimited Plan")
**And** next billing date is shown
**And** I can cancel my subscription (cancellation handled via Stripe)

### Story 5.5: Payment Status Display & Quota UI

As a logged-in user,
I want to see my current payment status and quota information clearly,
So that I always know how many articles I can process and when I need to upgrade.

**Acceptance Criteria:**

**Given** I am logged in
**When** I view the dashboard or account page
**Then** my quota status is prominently displayed (e.g., "5 articles remaining" or "Unlimited")
**And** my current plan type is shown
**And** the display updates in real-time as I use articles

**Given** quota display
**When** my quota is low (e.g., 1-2 articles remaining)
**Then** a warning indicator is shown
**And** upgrade prompts are more prominent
**And** I am encouraged to purchase credits or subscribe

**Given** quota display
**When** my quota is exhausted
**Then** the quota shows "0 articles remaining"
**And** upgrade options are immediately visible
**And** processing actions are disabled with clear messaging

**Given** payment status display
**When** I have an active subscription
**Then** subscription details are shown: plan name, billing cycle, next billing date
**And** cancellation option is available (if applicable)
**And** unlimited status is clearly indicated

## Epic 6: Scheduled Content Processing & Pre-computation (Post-MVP)

System automatically fetches and pre-processes papers from arXiv on a scheduled basis, generating novelty scores and summaries in advance. This reduces user wait times and improves experience by having content ready when users log in.

**FRs covered:** FR25, FR26, FR27, FR28

### Story 6.1: Scheduled Job Infrastructure

As a system administrator,
I want to set up scheduled background jobs for arXiv processing,
So that papers are fetched and pre-processed automatically without user intervention.

**Acceptance Criteria:**

**Given** the application infrastructure
**When** scheduled job system is implemented
**Then** a job scheduler is configured (e.g., cron, node-cron, or cloud scheduler)
**And** jobs can run on a fixed hourly schedule
**And** jobs are isolated from user-facing API routes
**And** job execution is logged for monitoring

**Given** scheduled job infrastructure
**When** a job is triggered
**Then** it can access the database and external APIs (arXiv, LLM)
**And** it handles errors gracefully without crashing
**And** it can be monitored and debugged
**And** job status can be tracked (running, completed, failed)

**Given** job scheduling
**When** multiple jobs are scheduled
**Then** they can run concurrently or sequentially as needed
**And** resource usage (API rate limits, database connections) is managed
**And** job failures don't block other jobs

### Story 6.2: Hourly arXiv Fetching for CS & Physics

As a system component,
I want to automatically fetch new papers from arXiv every hour for Computer Science and Physics categories,
So that fresh content is always available for users.

**Acceptance Criteria:**

**Given** the scheduled job runs hourly
**When** the arXiv fetching job executes
**Then** it queries arXiv API for Computer Science (cs.*) and Physics (physics.*) categories
**And** it fetches papers submitted in the last hour (using submittedDate filter)
**And** it processes the Atom XML response and extracts paper metadata

**Given** papers are fetched from arXiv
**When** papers are processed
**Then** duplicate papers (matching arxiv_id) are detected and skipped
**And** new papers are inserted into the centralized papers database
**And** existing papers are updated if metadata has changed
**And** fetch timestamp is recorded for monitoring

**Given** arXiv fetching
**When** the API rate limit is exceeded or an error occurs
**Then** the error is logged
**And** the job completes gracefully without crashing
**And** partial results (if any) are saved
**And** the next scheduled run will retry

**Given** hourly fetching is implemented
**When** papers are fetched
**Then** they are stored in the centralized database
**And** all users can access these papers (not user-specific)
**And** the papers are ready for novelty scoring (next story)

### Story 6.3: Automated Novelty Scoring & Summary Generation

As a system component,
I want to automatically generate novelty scores and summaries for newly fetched papers,
So that users see pre-computed insights immediately when they log in.

**Acceptance Criteria:**

**Given** new papers have been fetched and stored
**When** the novelty scoring job runs (as part of scheduled processing)
**Then** each new paper is sent to the LLM for novelty analysis
**And** novelty_score and novelty_summary are generated
**And** the scores and summaries are stored in the papers table
**And** papers are ready for immediate display to users

**Given** automated scoring
**When** scoring is performed
**Then** papers are processed in batch (efficient LLM API usage)
**And** scoring failures for individual papers don't stop the batch
**And** failed papers are logged for retry
**And** successfully scored papers are immediately available

**Given** scoring automation
**When** LLM API is unavailable or rate-limited
**Then** the job handles errors gracefully
**And** unscored papers remain in the database (null novelty_score)
**And** users can still access papers (they just won't have scores yet)
**And** scoring can be retried in the next scheduled run or manually

**Given** pre-computed scores and summaries
**When** users log in
**Then** papers are displayed with scores and summaries already available
**And** no waiting time for novelty computation
**And** dashboard loads faster with pre-processed content

### Story 6.4: User Login & Pre-processed Paper Display

As a logged-in user,
I want to see the newest pre-processed papers when I log in,
So that I have fresh, ready-to-read content immediately available.

**Acceptance Criteria:**

**Given** I log in to the application
**When** my session is established
**Then** the system queries for the newest pre-processed papers from the centralized database
**And** papers are filtered to show those fetched since my last login (using last_fetch_timestamp)
**And** papers with novelty scores and summaries are prioritized in display

**Given** pre-processed papers are available
**When** I view the dashboard
**Then** papers are displayed with novelty scores and summaries already populated
**And** no "scoring in progress" states are shown for pre-processed papers
**And** dashboard loads quickly with ready content

**Given** user login and paper display
**When** my last_fetch_timestamp is updated
**Then** it is set to the current timestamp
**And** future logins will only show papers newer than this timestamp
**And** I don't see duplicate papers I've already seen

**Given** pre-processed content display
**When** some papers haven't been scored yet (scoring job failed or pending)
**Then** those papers are still displayed
**And** they show "Score pending" or similar indicator
**And** manual scoring can be triggered if needed (from Epic 2)

**Note:** This epic significantly improves user experience by having content ready when users arrive, rather than making them wait for processing. It also enables the centralized database and caching architecture (from NFRs) by ensuring all papers are in one place before users access them.

## Epic 8: Breaking AI News (Post-MVP)

Beyond arXiv, users follow AI news breaking across Hacker News, Reddit, GitHub, news outlets and X. Items are grouped into stories, ranked by cross-platform heat, summarized, and each story opens as an AI-written breakdown with sources and bigger-picture analysis. Starts with a single AI topic; the topic configuration allows more later.

### Story 8.1: News Schema, Source Framework, Hacker News & Outlet Feeds

As a developer,
I want a data model and a pluggable source framework for news items,
So that breaking stories from different platforms can be collected, stored and de-duplicated.

**Acceptance Criteria:**

**Given** the Prisma schema
**When** the news models are added
**Then** `NewsItem` (source, externalId, url, canonicalUrl, title, snippet, sourceName, publishedAt, engagement, comments, content, embedding, storyId), `NewsStory` and `UserStoryState` exist with a migration, and items are unique on (source, externalId)

**Given** a topic configuration (AI)
**When** a source adapter runs
**Then** it returns normalised items for that topic, and adapters for Hacker News (Algolia API) and RSS/Atom outlet feeds (TechCrunch, The Verge, VentureBeat, MIT Technology Review, Ars Technica, Hugging Face, DeepMind, OpenAI, Google News) are available

**Given** items linking to the same article
**When** they are stored
**Then** their canonical URL (tracking parameters, www, fragments and trailing slashes removed; x.com/twitter.com and arXiv variants unified) is identical, and the same outlet article arriving through two feeds is stored once

### Story 8.2: Reddit, GitHub & X Source Adapters

As a user following AI,
I want stories from Reddit, GitHub and X,
So that I see what communities and developers are reacting to, not just news outlets.

**Acceptance Criteria:**

**Given** the topic's subreddits
**When** Reddit is fetched
**Then** today's top posts of all subreddits are fetched in one multireddit request: via OAuth with upvotes when REDDIT_CLIENT_ID/SECRET are set, otherwise via the public Atom feed (no scores, ~1 request/minute limit)

**Given** GitHub
**When** it is fetched
**Then** new fast-rising repositories (Search API, last 3 days) and the newest newsworthy release of watched repos (build, nightly and pre-release tags skipped) are returned with star counts

**Given** X_RSS_URL_TEMPLATE pointing to an RSS bridge (RSSHub/Nitter)
**When** X is fetched
**Then** posts of the configured accounts are returned (retweets skipped, outbound link used as the story link); without the template the source is skipped with an explanation

**Given** any source failing
**When** the fetch job runs
**Then** other sources still complete and per-source results/errors are recorded in the job run

### Story 8.3: Story Clustering & Heat Ranking

As a user,
I want coverage of the same event grouped into one story and ranked by how big it is,
So that I see each breaking story once, with the biggest first.

**Acceptance Criteria:**

**Given** new items
**When** the clustering job runs
**Then** each item joins a story with the same canonical URL, or the most similar active story from the last 48h (embedding cosine ≥ NEWS_CLUSTER_THRESHOLD, defaults 0.62 OpenAI / 0.4 local), or starts a new story; stories split by arrival order are merged afterwards

**Given** active stories
**When** they are ranked
**Then** heat = per-platform normalised engagement (log-scaled) × boost for multiple platforms/outlets × time decay (half-life NEWS_HEAT_HALF_LIFE_HOURS, default 8h)

**Given** a story covered on ≥2 platforms or by ≥3 outlets in the last 6h, or among the hottest fresh multi-item stories
**When** ranking runs
**Then** it is flagged as breaking

**Given** stories not seen for 7 days
**When** cleanup runs
**Then** they are archived, and items/stories older than 30 days are deleted unless a user saved the story

### Story 8.4: LLM Story Headlines & Summaries

As a user,
I want a clear headline, summary and why-it-matters line for each story,
So that I can grasp a story in seconds.

**Acceptance Criteria:**

**Given** stories that are new or grew since they were summarized
**When** the summarize job runs
**Then** the hottest (up to NEWS_SUMMARIZE_MAX_PER_RUN) get an LLM headline, 2-3 sentence summary and why-it-matters line via structured output

**Given** LLM errors
**When** summarizing
**Then** bad credentials stop the run without penalising stories, repeated rate limits trip a circuit breaker, and other failures are retried later (max 5 attempts)

**Given** mock mode (no LLM key)
**When** the job runs
**Then** it is skipped and stories keep their best source headline

### Story 8.5: News API & Dashboard News Tab

As a user,
I want a News tab on the overview page,
So that I can follow breaking AI news next to my papers.

**Acceptance Criteria:**

**Given** the dashboard
**When** I switch to News (`/dashboard?tab=news`)
**Then** I see a "Breaking now" strip and ranked story cards with headline, summary, why it matters, age, platform chips (e.g. HN points, subreddits, outlet count, GitHub stars) and expandable source links

**Given** the feed
**When** I change filters
**Then** I can choose the time window (24h/3 days/week), sort (hottest/latest), platforms, and a Saved view; the feed refreshes every 2 minutes

**Given** a story
**When** I save or dismiss it
**Then** the state is stored per user (`PATCH /api/news/stories/[id]`), dismissed stories disappear and saved ones appear under Saved

**Given** no news fetched yet or a source failing
**When** I open the tab
**Then** an explanatory empty state or source warning is shown

### Story 8.6: Story Article Page: AI Breakdown, Sources & Bigger Picture

As a user,
I want to click a story and read an article explaining it,
So that I understand what is happening, how each source covers it and what it means.

**Acceptance Criteria:**

**Given** a story
**When** I open it (`/news/[id]`)
**Then** an AI-generated article streams in with three sections (What's happening; Source breakdown per platform/outlet incl. community sentiment; The bigger picture with implications and what to watch) and inline [n] citations linking to the sources

**Given** article generation
**When** sources are prepared
**Then** the text of linked articles, HN/Reddit top comments, GitHub READMEs/release notes is fetched (bounded, cached on the item) and readable sources are preferred over headline-only aggregator links

**Given** a generated article
**When** the story is opened again
**Then** the cached article is shown instantly; after the story gains 2+ items or a new platform it is flagged as updated and can be regenerated; breaking stories are pre-generated by the summarize job

**Given** the page
**When** it loads
**Then** coverage is listed grouped by platform, related earlier stories and Sphere papers (embedding similarity) are linked, the story is marked read, and it can be saved or dismissed

### Story 8.7: News Scheduling, Monitoring & Retention

As a system administrator,
I want the news pipeline to run automatically and be observable,
So that breaking news is fresh without manual work.

**Acceptance Criteria:**

**Given** ENABLE_SCHEDULER=true
**When** the server starts
**Then** the scheduler runs process-papers hourly and process-news (news-fetch → news-clustering → news-summarize) every NEWS_INTERVAL_MINUTES (default 15, at :02/:17/…)

**Given** an external scheduler
**When** it calls `/api/cron/process-news` with the cron secret, or `npm run jobs:run -- process-news` is used
**Then** the same pipeline runs with locking and job-run tracking

**Given** GET /api/cron/status
**When** it is called
**Then** news jobs and the news backlog (unclustered items, active/unsummarized stories) are reported

## Epic 9: Learn Tab (Post-MVP)

Users learn the background that makes the feed understandable: a step-by-step curriculum on the feed's topic (AI first) in four paths. The teaching method builds holistic mental pictures that learners can reason with, rather than memorisation. The pictures are introduced early, drawn as animated or interactive figures, and extended by every lesson. Concepts are reinforced by explicit, non-circular back-references.

### Story 9.1: Curriculum Registry, Lesson Content Format & Pages

As a learner,
I want a Learn tab with paths, modules and lessons,
So that I can follow a clear step-by-step learning plan.

**Acceptance Criteria:**

**Given** the curriculum registry (`lib/learn/curriculum.ts`) and MDX lesson files (`content/learn/<path>/<lesson>.mdx`)
**When** I open `/learn`
**Then** I see four paths (Math, Compute, Building, Economy) with their mental models, a suggested route and progress, and I can open each path and lesson

**Given** a lesson
**When** it renders
**Then** it shows its breadcrumb, minutes, mental model, the lessons it builds on, the MDX body with math (KaTeX), glossary terms, callouts and figures, prev/next, "where this comes back" and related lessons

### Story 9.2: Progress Tracking & Quizzes

As a learner,
I want my progress saved and to check my understanding,
So that I know where I am and whether I understood a lesson.

**Acceptance Criteria:**

**Given** I open a lesson **When** it loads **Then** it is recorded as started and appears under "Continue where you left off"
**Given** the end-of-lesson quiz **When** I answer all questions **Then** each answer is explained, my score is saved, and at least half right marks the lesson complete; I can also mark it complete manually
**Given** a path **When** I view it **Then** completion per lesson and per path is shown

### Story 9.3: Figure Framework & Animations

As a learner,
I want animated and interactive figures that convey meaning,
So that I build a visual mental model of each concept.

**Acceptance Criteria:**

**Given** a `<Figure name>` in a lesson **When** it scrolls into view **Then** it plays (staged SVG/CSS loops or interactive React), pauses off-screen, supports pause and replay, and respects reduced motion
**Given** a phone-width screen **When** a figure renders **Then** it fits without horizontal scroll and its text stays readable

### Story 9.4: Lesson Tutor

As a learner,
I want to ask questions when a concept is unclear,
So that I get explanations grounded in the lesson I'm reading.

**Acceptance Criteria:**

**Given** a lesson **When** I ask the tutor (or select a passage and choose "Ask about this") **Then** an answer streams (SSE) grounded in the lesson text, its prerequisites, glossary and the path's mental model, with links to other lessons and KaTeX math

### Story 9.5: Feed Links, Glossary & Cross-References

As a learner,
I want lessons connected to my feed and to each other,
So that I can apply what I learn and easily go back to foundations.

**Acceptance Criteria:**

**Given** a lesson **When** it loads **Then** this week's News stories and my papers that match its keywords are linked
**Given** the overview **When** it loads **Then** lessons are ranked by how many of this week's stories they explain
**Given** a News story page **When** it loads **Then** matching "Background lessons" are linked
**Given** `/learn/glossary` **When** I open it **Then** every term is listed A–Z with a link to the lesson that teaches it; terms in lessons show definitions on hover or tap
**Given** a lesson's prerequisites **When** content is validated **Then** prerequisites are acyclic, every prerequisite is recalled in the body, and recaps only point backwards

### Story 9.6: Path A: The Math of Neural Networks & LLMs

15 lessons: vectors, matrices, derivatives, probability, neuron, forward pass, gradient descent, backpropagation, training in practice, embeddings, attention, transformer, pretraining, sampling, post-training. Mental models: "meaning is geometry" and "learning is walking downhill".

### Story 9.7: Path B: Compute, From Silicon to Data Centers

10 lessons: CPU, GPU, memory wall, accelerators, distributed training, data center, energy, inference, serving at scale, hosting. Mental model: "arithmetic is cheap; moving data and power is what costs".

### Story 9.8: Path C: Building with AI, Agents & Harness Engineering

9 lessons: model API, context engineering, tool use, RAG, agent loop, harness engineering, skills and MCP, evals, agent security. Mental model: "the model is a stateless function from context to next token".

### Story 9.9: Path D: The AI Economy & Geopolitics

9 lessons: value chain, semiconductors, hyperscalers, labs, unit economics, build-out, export controls, sovereign AI, national security. Mental model: "follow the bottleneck, and who controls it".
