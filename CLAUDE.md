# TigerFlows

Structured daily capture + workflow engine. Two modes over one data model:

- **Capture Mode** (v0 focus): keyboard-first daily log editor that beats markdown — dense, inline-editable, emoji+label+value rows. Loose templates, no validation, auto-save.
- **Execution Mode**: card-based workflow tracker with typed actions, progress, AI-readiness. Strict templates.

Templates define their `mode` (`loose` | `strict`). Both modes read/write the same `Flow` + `FlowAction` data. The capture editor is a rendering strategy, not a separate data path.

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes: `$state`, `$effect`, `$props`)
- **Drizzle ORM** + **PGLite** (embedded Postgres, local-first) with **pgvector** (384-dim embeddings via `BAAI/bge-small-en-v1.5`)
- **TailwindCSS 4** + **DaisyUI 5**
- **Zod 4** + **drizzle-zod** — validators derived from schema
- **nanoid** — 21-char nolookalikes IDs
- **Bun** — package manager and script runner
- **TypeScript 6** strict mode

## Project Structure

```
src/
  routes/          # SvelteKit filesystem routes
  lib/
    components/    # Feature-grouped: flows/, categories/, templates/, history/, stats/, ui/, layout/
    stores/        # Svelte 5 rune stores (in-memory, pending DB wiring)
    server/        # Server-only: embeddings.ts (HF singleton pipeline)
    helpers/       # tigerId.ts (nanoid), slugify.ts
    config/        # defaults.ts (id_length: 21)
db/
  schema/base.ts   # Single source of truth — tables + enums + relations
  validators.ts    # Auto-generated Zod schemas from Drizzle
  index.ts         # PGLite DB client (embedded, server-side)
  scripts/         # CLI tools: seed.ts, wipe.ts, check_db.ts, db.ts
  migrations/      # SQL migration files
types/index.ts     # *Row (flat) + composed domain types (e.g. Template = TemplateRow + actions[])
data/pglite/       # Local database storage (gitignored)
```

## Database

PGLite runs an embedded Postgres — no external database setup needed. Data is stored locally in `./data/pglite/`. The pgvector extension is loaded automatically for embedding support.

Tables: `users`, `categories`, `templates`, `template_actions`, `flows`, `flow_actions`, `tags`, `template_tags`, `enum_sets`, `enum_values`

Key patterns:

- `userId IS NULL` = system-owned (public); non-null = user-owned
- Slugs: partial unique indexes (per-user scope vs system scope)
- Timestamps: ISO-8601 strings (`mode: 'string'`)
- Embeddings: `vector(384)` columns, `.notNull()`
- `flow_status` enum: `active | completed | abandoned`
- `template_mode` enum: `strict | loose` — controls which UI renders the flow
- Flow actions snapshot template data at instantiation
- Category/template FKs on flows use `SET NULL` on delete (preserve history)
- For loose templates: `config` jsonb on `template_actions` stores emoji (`{ emoji: "🧭" }`)
- Daily log entries are flows keyed by date (`title` = ISO date string)

## Path Aliases (tsconfig)

| Alias    | Path        |
| -------- | ----------- |
| `$lib`   | `./src/lib` |
| `@src`   | `./src`     |
| `@db`    | `./db`      |
| `~types` | `./types`   |

## Dev Commands

```bash
bun run dev          # Dev server → http://localhost:1920
bun run build        # Production build
bun run check        # svelte-check + tsc
bun run test         # vitest (CI mode)
bun run format       # prettier --write
bun run lint         # prettier --check

# DB
bun run db:gen       # Generate migration from schema diff
bun run db:push      # Push schema directly (dev only)
bun run db:mig       # Run pending migrations
bun run db:stud      # Drizzle Studio UI
bun run db:seed      # Seed with demo data + embeddings
```

## Key Architecture Notes

**Local-first with PGLite.** No external database or env vars needed. PGLite embeds Postgres with pgvector support. Data lives in `./data/pglite/`.

**Stores are in-memory.** DB layer is scaffolded but not wired to routes yet. Next step: server load functions calling Drizzle.

**Auth not yet implemented.** `users` table + `authId` column exist in schema. `userId` on flows/categories/templates is nullable until auth lands.

**Embeddings are server-only.** Import `embed`/`embedMany` only from `+page.server.ts` or `+server.ts`. HF pipeline is a singleton initialized once.

**Type layers:**

1. `*Row` — flat DB row type (from Zod/Drizzle)
2. Domain type — composed (e.g. `Template` includes `actions: TemplateActionRow[]`)
3. UI/computed types — `CategoryStats`, `HistoryFilters`, etc.

**Store pattern:** factory functions returning `{ get items(), add(), update(), remove(), getById() }`. No external state lib.

## Routes

```
/                        → workbox (today's flows across categories)
/flows                   list + manage active flows
/flows/[id]              execution mode (cards, progress)
/flows/[id]/quick        capture mode (dense inline editor)
/categories              list categories
/categories/new          create
/categories/[id]         detail + flow list
/categories/[id]/edit    edit
/categories/[id]/[flowId] view flow
/templates               list
/templates/[id]          detail
/history                 timeline browser
/stats                   statistics dashboard
```

## Key Concepts

**Workbox:** The default landing view — scoped to today's date for v0. Shows all active flows for the current scope. Not a DB entity, just a filtered query + UI shell.

**Capture Mode (DailyQuickView):** Keyboard-first, dense, single-column. Emoji+label+value rows. Enter/Shift+Enter navigation, auto-save, slash commands. No cards, no modals, no validation. Renders a Flow's actions as flat editable text.

**Execution Mode (FlowView):** Existing card-based UI. Progress bars, metadata, status lifecycle. Used for strict templates and complex workflows.

**Transition rule:** The capture editor is a VIEW over the workflow engine's data, not a replacement. Both modes share the same Flow + FlowAction types. `template.mode` determines which UI renders.

## Pending / Known Issues

- `flows.userId` + slug partial index deferred until auth wired
- No tests yet (vitest configured)
- Stores not connected to DB (in-memory only)
- Auth integration not started
- `template.mode` column not yet added (pending migration)
