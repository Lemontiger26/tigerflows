# TigerFlows

Local-first structured capture and workflow engine. Keyboard-first logging, reusable templates, queryable history, inline stats, and BYOK AI insights.

## What is TigerFlows?

TigerFlows is a structured daily capture + workflow engine with two modes over one data model:

- **Capture Mode** — keyboard-first daily log editor that beats markdown. Dense, inline-editable, emoji+label+value rows. Loose templates, no validation, auto-save.
- **Execution Mode** — card-based workflow tracker with typed steps, progress tracking, and AI-readiness. Strict templates.

Templates define their `mode` (`loose` | `strict`). Both modes read/write the same `Flow` + `FlowStep` data.

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes)
- **Drizzle ORM** + **PGLite** (embedded Postgres) with **pgvector** (384-dim embeddings)
- **TailwindCSS 4** + **DaisyUI 5**
- **Zod 4** + **drizzle-zod**
- **Bun** — package manager and script runner
- **TypeScript 6** strict mode

## Quick Start

```bash
# Clone and install
git clone https://github.com/Lemontiger/flows.git
cd flows
bun install

# Push schema to local PGLite database
bun run db:push

# Seed with demo data
bun run db:seed

# Start dev server
bun run dev
```

The app runs at `http://localhost:1920`. No external database setup needed — PGLite runs an embedded Postgres locally, storing data in `./data/pglite/`.

## Project Structure

```
src/
  routes/          # SvelteKit filesystem routes
  lib/
    components/    # Feature-grouped: flows/, categories/, templates/, history/, stats/, ui/, layout/
    stores/        # Svelte 5 rune stores
    server/        # Server-only: embeddings pipeline
    helpers/       # tigerId, slugify
    config/        # Shared defaults
db/
  schema/          # Drizzle schema (single source of truth)
  validators.ts    # Auto-generated Zod schemas
  scripts/         # CLI tools: seed, wipe, check_db
  migrations/      # SQL migration files
types/             # Domain types
data/pglite/       # Local database (gitignored)
```

## Scripts

```bash
bun run dev          # Dev server → http://localhost:1920
bun run build        # Production build
bun run check        # Type checking
bun run format       # Prettier format
bun run lint         # Prettier check

# Database
bun run db:gen       # Generate migration from schema diff
bun run db:push      # Push schema directly (dev only)
bun run db:mig       # Run pending migrations
bun run db:stud      # Drizzle Studio UI
bun run db:seed      # Seed with demo data + embeddings
```

## License

[Apache License 2.0](LICENSE)
