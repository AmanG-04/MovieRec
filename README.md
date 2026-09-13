# Reelmark

Reelmark is a responsive movie discovery application built for the Full-Stack Intern Assignment. It helps people browse without knowing exactly what they want, search when they do, inspect a title, and keep a persistent wishlist.

## Stack

- React 19, TypeScript, Vite, React Router, and TanStack Query
- Node.js, TypeScript, Fastify, and Zod
- TMDb as the external movie catalog
- Prisma and SQLite for the persistent wishlist
- In-memory TTL caching with in-flight request deduplication

## Setup

1. Create a TMDb API key at [the TMDb developer portal](https://www.themoviedb.org/settings/api).
2. Install dependencies:

```bash
npm install
```

3. Create `.env` from `.env.example` and set `TMDB_API_KEY`.
4. Create the local SQLite database:

```bash
npm run db:push
```

5. Start the frontend and backend together:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Useful Commands

```bash
npm run build
npm test
npm run db:generate
npm run db:push
```

## Architecture

The browser only communicates with the Node.js API. The TMDb key stays on the server, and TMDb-specific response shapes are converted into application-owned `MovieCard`, `MovieDetails`, and `MoviePage` models before they reach the client.

```text
React client
  -> Fastify API
  -> validation and normalized query parameters
  -> short-lived TTL cache and request deduplication
  -> TmdbProvider
  -> TMDb API
```

Wishlist data follows a separate path:

```text
React mutation
  -> Fastify wishlist route
  -> Prisma
  -> SQLite
```

The wishlist stores the movie ID plus a small card snapshot. This means the shelf remains renderable during a temporary TMDb outage, while full details and recommendations remain fresh external data.

## Product Decisions

- The browse state lives in URL query parameters, so search, filters, sorting, and pagination survive refreshes and browser navigation.
- Search requests require at least two characters and are managed by TanStack Query; cached query keys prevent duplicate work.
- Discovery uses bounded numbered pagination. It is predictable, shareable, and avoids loading a large catalog into the browser.
- Movie catalog responses are cached briefly. Genres are cached for 24 hours, and details are cached for 30 minutes.
- Missing artwork, dates, ratings, and overviews use explicit fallbacks instead of breaking the layout.
- The database is intentionally single-user and local because the assignment requires persistence but does not require authentication. A `userId` or anonymous device profile can be added later.

## API

```text
GET    /api/health
GET    /api/genres
GET    /api/movies/discover?page=1&sort=popularity.desc
GET    /api/movies/search?q=inception&page=1
GET    /api/movies/:id
GET    /api/movies/:id/recommendations
GET    /api/wishlist
POST   /api/wishlist
DELETE /api/wishlist/:id
```

The API validates inputs and maps upstream problems to stable errors such as `BAD_REQUEST`, `UPSTREAM_RATE_LIMITED`, and `UPSTREAM_UNAVAILABLE`. Secrets and raw upstream errors are not returned to the browser.

## Known Limitations

- The cache is process-local and is cleared when the server restarts. Redis would be appropriate for a multi-instance deployment.
- If TMDb is unavailable during a local demo, set `TMDB_DEMO_FALLBACK=true` to use the built-in catalog. This keeps the UI and pagination demoable without presenting sample data as live TMDb data.
- The wishlist is single-user on purpose; there is no account system.
- TMDb remains the source of truth for catalog freshness and availability.
- The current test suite focuses on the cache's TTL and request-deduplication behavior. More route and browser integration coverage would be the next step.

## What I Would Improve With More Time

- Add account-based wishlist sync and a migration path from the current local wishlist.
- Add Playwright tests for search, details, wishlist persistence, and responsive navigation.
- Add an image proxy or responsive `srcset` handling for more efficient poster delivery.
- Add structured request metrics, rate limiting, and a shared cache for deployment.
- Add richer discovery rails such as “trending this week” and “top rated” using the same provider abstraction.

## AI Transparency

AI assistance was used to help interpret the assignment, compare architecture options, generate initial scaffolding, and review edge cases. The final application structure, data flow, persistence decisions, UI behavior, and known limitations were selected and reviewed for this project.

## Attribution

Movie data and imagery are provided by [TMDb](https://www.themoviedb.org/). This project is not endorsed or certified by TMDb.
