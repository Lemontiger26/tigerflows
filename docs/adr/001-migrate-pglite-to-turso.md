# ADR-001: Migrate from PGLite to Turso (libSQL)

**Status:** Proposed  
**Date:** 2026-06-02  
**Authors:** @bernd-malle

## Context

TigerFlows uses PGLite (embedded Postgres) for local-first data storage. PGLite delivers the zero-setup developer experience we want, but has a critical limitation: it acquires an exclusive lock on the data directory, meaning only one process can access the database at a time. You cannot run the dev server and inspect the database with Drizzle Studio (or any other tool) simultaneously.

With sync/team features on the roadmap for late summer 2026, we'd also need to build a full sync layer on top of PGLite — conflict resolution, offline queue, reconnection, and a hosted Postgres backend. That's a significant engineering effort for a feature that already exists as a solved problem in other ecosystems.

### Current state (as of this ADR)

- **No application code imports from the DB layer.** Routes and components use in-memory stores. The DB wiring is the next planned milestone.
- **Schema surface:** 19 tables across `base.ts` (10) and `agentic.ts` (9), plus `relations.ts`
- **DB client:** `db/index.ts` (app) and `db/scripts/db.ts` (CLI) — both PGLite-specific, ~10 lines each
- **Postgres-specific features in use:** pg enums (6), partial unique indexes (7), jsonb columns (~12), `vector(384)` columns, `timestamp with time zone`
- **Embedding pipeline:** server-only HuggingFace `Xenova/bge-small-en-v1.5` — dialect-independent

## Decision

Migrate from PGLite (embedded Postgres) to **Turso** (libSQL, a SQLite fork) using Drizzle's `drizzle-orm/libsql` adapter.

### Why Turso specifically (not plain SQLite)

- **Embedded replicas** — local SQLite file that auto-syncs to Turso's cloud edge network. Same local-first DX, cloud sync as a config change.
- **Database-per-tenant** — Turso is built for this pattern. Spin up a DB per user via their Platform API on signup. Shared compute groups keep costs flat.
- **Built-in vector search** — native to libSQL, sufficient for our scale (few thousand rows, 384-dim vectors, brute-force is sub-millisecond).
- **Multi-process access** — SQLite allows concurrent readers. Dev server + DB inspector work simultaneously.

## Architecture: Database Topology

### Two files, one runtime DB

```
./data/
├── systemFlows.db   (bundled distribution artifact — built-in templates, demos, showcases)
└── userFlows.db     (single runtime DB — all data lives here)
```

**`systemFlows.db`** ships bundled with the app. It contains built-in templates, categories, tags, skills, demo flows, showcase workflows, and onboarding examples. It is never queried at runtime — on startup, its contents are upserted into `userFlows.db`, then it is closed. Think of it as a structured seed file that happens to be a SQLite database.

**`userFlows.db`** is the single runtime database. All queries — system and user data alike — go here. Records are scoped by `userId` using sentinel values:

| `userId` value | Meaning |
|---|---|
| `'SYSTEM'` | System-owned (built-in templates, demos). Read-only in UI. |
| `'LOCAL'` | Self-hosted user (no auth). Default for local-only mode. |
| `users.id` value | Authenticated user. Cloud/team mode. |

Both sentinels are seeded as rows in the `users` table so that FK constraints on `userId` columns are satisfied. For authenticated users, scoped table `userId` values reference `users.id`; external auth provider identifiers live only in `users.authId`. The `UNIQUE(userId, slug)` compound index enforces slug uniqueness per scope — and because all three values are non-null strings, the constraint works correctly (SQLite treats NULLs as distinct in unique indexes, which would break uniqueness; sentinels avoid this).

This approach eliminates cross-DB foreign key problems entirely — all FKs are local within `userFlows.db`. System templates, user templates, flows, categories — everything in one DB, differentiated by `userId`.

### Self-hosted (local, no cloud)

One runtime DB, no auth. User records have `userId = 'LOCAL'`. System records have `userId = 'SYSTEM'`. Demo content is explorable out of the box and clearly separated from user data. Resetting demos = re-running the system seed.

### Cloud / Team (with sync)

```
Turso Platform
├── tenant-{userId-1}  (user's private data, embedded replica syncs here)
│   └── system records (userId='SYSTEM') + user records (userId=users.id)
├── tenant-{userId-2}
│   └── ...
└── team-{workspaceId} (shared workspace, multiple members)
    └── system records + user records with userId as createdBy attribution
```

- **System data** (`userId = 'SYSTEM'`) is seeded into each tenant DB on startup from the bundled `systemFlows.db`, same as self-hosted.
- **Tenant DBs** are created dynamically via `POST /v1/organizations/{org}/databases` on user signup. Each tenant's embedded replica syncs to their cloud DB.
- **`userId` column** identifies record ownership: `'SYSTEM'` = system-owned (read-only in UI), `users.id` = user-owned, `createdBy` attribution in team workspaces. External provider auth IDs are stored in `users.authId`, not in scoped table FKs.
- **Updates to system content** (new built-in templates, updated demos) ship with app releases. The startup seed upserts by primary key, so existing system records are updated and new ones are added. User data is never touched.

### The transition: local-only to sync

```ts
import { createClient } from '@libsql/client';

// Self-hosted: pure local, no Turso account needed
const db = createClient({ url: 'file:./data/userFlows.db' });

// Cloud: add syncUrl + authToken
const db = createClient({
	url: 'file:./data/userFlows.db',
	syncUrl: 'libsql://tenant-abc-myorg.turso.io',
	authToken: process.env.TURSO_AUTH_TOKEN,
	syncInterval: 60
});
```

Application code, queries, Drizzle schema — all unchanged. Sync is a configuration concern, not a code change.

> **Caveat:** Turso embedded replicas with `@libsql/client` handle the online case well (local reads, writes to cloud primary). For true offline-first writes with bidirectional sync and multi-writer convergence, Turso's `@tursodatabase/sync` package or equivalent may be required. The sync story needs a spike when that milestone approaches — the dialect migration itself is independent of sync.

## Migration Plan

### Phase 1: Schema Translation

Rewrite `db/schema/base.ts` and `db/schema/agentic.ts` from `drizzle-orm/pg-core` to `drizzle-orm/sqlite-core`.

#### 1.1 Table definitions

Every `p.pgTable(...)` becomes `s.sqliteTable(...)`.

```ts
// Before
import * as p from 'drizzle-orm/pg-core';
export const categories = p.pgTable('categories', { ... });

// After
import * as s from 'drizzle-orm/sqlite-core';
export const categories = s.sqliteTable('categories', { ... });
```

#### 1.2 Column type mappings

| Postgres (current)                            | SQLite/libSQL (target)                        | Notes                                                              |
| --------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `p.char('id', { length: 21 })`                | `s.text('id')`                                | SQLite has no fixed-length char; text works identically for nanoid |
| `p.text(...)`                                 | `s.text(...)`                                 | Direct mapping                                                     |
| `p.integer(...)`                              | `s.integer(...)`                              | Direct mapping                                                     |
| `p.boolean(...)`                              | `s.integer({ mode: 'boolean' })`              | SQLite stores booleans as 0/1                                      |
| `p.timestamp(..., { mode: 'string' })`        | `s.text(...)`                                 | See [Section 1.2.1](#121-timestamp-defaults)                       |
| `p.jsonb(...).$type<T>()`                     | `s.text({ mode: 'json' }).$type<T>()`         | See [Section 1.3](#13-jsonb-columns)                               |
| `p.vector('embeddings', { dimensions: 384 })` | See [Section 1.5](#15-vector-columns)         | Turso-native vector type                                           |
| `p.pgEnum(...)`                               | Removed — see [Section 1.4](#14-enum-columns) |                                                                    |

##### 1.2.1 Timestamp defaults

Postgres `defaultNow()` generates `NOW()`, which doesn't exist in SQLite. Since we already store timestamps as ISO-8601 strings (`mode: 'string'`), use a Drizzle `$defaultFn`:

```ts
// Before (Postgres)
createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),

// After (SQLite) — generate ISO string at insert time
createdAt: s.text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
updatedAt: s.text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
```

Alternatively, use SQLite's built-in: `.default(sql`(datetime('now'))`)` — but this returns `YYYY-MM-DD HH:MM:SS` without timezone offset, whereas `$defaultFn` gives full ISO-8601 with `Z` suffix, consistent with the current Postgres output.

#### 1.3 jsonb columns

Current usage across 12 columns: `config`, `toolSpec`, `configSchema`, `defaults`, `trace`, `result`, `value`.

**None of these are queried with JSON path operators** (`->`, `@>`, `?`). Every usage is whole-object read/write. Drizzle's `text({ mode: 'json' })` handles serialization/deserialization transparently. If JSON path queries are ever needed, libSQL supports `json_extract()`.

Defaults also need adjustment — Postgres `jsonb` accepts object literals, SQLite `text` needs string defaults:

```ts
// Before (Postgres)
config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),

// After (SQLite)
config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
```

Drizzle's `text({ mode: 'json' })` handles the `default({})` correctly — it serializes the object to `'{}'` for the DDL. No behavioral change for application code.

#### 1.4 Enum columns

Six pg enums currently defined:

| Enum                  | Values                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `flow_status`         | `active`, `completed`, `abandoned`                                                                                 |
| `action_type`         | `boolean`, `text`, `number`, `date`, `enum_single`, `enum_multi`, `agent`                                          |
| `executor_type`       | `human`, `agent`                                                                                                   |
| `input_source_kind`   | `log_file`, `rest_health`, `systemctl_status`, `email`, `sql_query`, `http_get`, `rag_corpus`, `webhook`, `custom` |
| `execution_gate_kind` | `human_approval`, `predicate`, `budget`, `time_window`, `dependency`, `rate_limit`, `custom`                       |
| `gate_position`       | `pre`, `post`, `pre_branch`, `post_branch`, `pre_merge`, `post_merge`, `pre_loop`, `post_loop`                     |

**Strategy:** Replace with `text()` columns. Validation moves to Zod schemas in `db/validators.ts` (where it's already enforced at the application boundary). SQLite CHECK constraints are an option but add no value when Zod already validates before insert.

```ts
// Before
export const flowStatusEnum = p.pgEnum('flow_status', ['active', 'completed', 'abandoned']);
// ... later:
status: flowStatusEnum('status').notNull().default('active'),

// After — column becomes plain text
status: s.text('status').notNull().default('active'),

// Validation in validators.ts (already the enforcement point)
const flowStatusValues = ['active', 'completed', 'abandoned'] as const;
export type FlowStatus = typeof flowStatusValues[number];
// Zod refinement on insert schema:
export const insertFlowSchema = createInsertSchema(flows, {
  status: () => z.enum(flowStatusValues),
});
```

Export the value arrays as const tuples from the schema file so both schema and validators reference a single source of truth.

#### 1.5 Vector columns

libSQL has native vector types with multiple precision levels:

| Type              | Size              | Use case                                   |
|---|---|---|
| `vector32`        | 4 bytes/dim       | Standard ML embeddings (our default)       |
| `vector64`        | 8 bytes/dim       | Higher precision                           |
| `vector8`         | 1 byte/dim        | ~4x compression, quantized                 |
| `vector1bit`      | 1 bit/dim         | ~32x compression, binary hashing           |
| `vector32_sparse` | non-zero vals only | High-dimensional sparse vectors            |

Max dimensionality: 65,536. More than enough for 384 or 768-dim embeddings.

Vectors are stored as `BLOB` columns and converted via type-specific functions:

```sql
-- Schema
CREATE TABLE categories (
    -- ...
    embeddings BLOB NOT NULL
);

-- Insert
INSERT INTO categories (embeddings) VALUES (vector32('[0.2, 0.5, ...]'));

-- Similarity search (cosine distance — lower = more similar)
SELECT *, vector_distance_cos(embeddings, vector32('[0.25, 0.55, ...]')) AS distance
FROM categories
ORDER BY distance
LIMIT 10;
```

Drizzle column definition is deliberately gated on the Phase 0 vector spike. The implementation must prove that values inserted through Drizzle can be read back and used by Turso's distance functions. Two viable outcomes:

```ts
// Outcome A: Drizzle custom type, if raw BLOB bytes are vector32-compatible.
// The custom type must use Drizzle's current `driverData` API.
embeddings: vector32('embeddings').notNull(),

// Outcome B: plain BLOB column plus raw SQL at insert/query boundaries:
// INSERT ... VALUES (vector32(?))
// ORDER BY vector_distance_cos(embeddings, vector32(?))
```

Available distance functions: `vector_distance_cos()` (cosine), `vector_distance_l2()` (euclidean), `vector_distance_dot()` (dot product), `vector_distance_jaccard()` (Jaccard for sparse/binary).

The embedding pipeline (`src/lib/server/embeddings.ts`) is unchanged — it produces `number[]` arrays regardless of storage backend. Dimension count (currently 384, may move to 768 — see open questions) is determined by the model, not the column type.

#### 1.6 Indexes

**Partial unique indexes (7 instances) → compound unique indexes.**

Current Postgres pattern uses two indexes per table — one partial, one compound — to scope system vs user slugs. SQLite does support partial indexes (since 3.8.0), but we don't need them: the sentinel `userId = 'SYSTEM'` is a real non-null value, so a single compound unique index is simpler and covers both system and user scopes.

```ts
// Before (Postgres): two indexes, one with WHERE clause
uniqueIndex('categories_user_slug_idx').on(t.userId, t.slug),
uniqueIndex('categories_system_slug_idx').on(t.slug).where(sql`${t.userId} IS NULL`)

// After (SQLite): single compound index — works because 'SYSTEM' is a real value, not NULL
uniqueIndex('categories_user_slug_idx').on(t.userId, t.slug)
```

All `userId` values are non-null strings (`'SYSTEM'`, `'LOCAL'`, or a `users.id` value), so the compound unique constraint works correctly. This avoids SQLite's NULL-distinctness quirk entirely (SQLite treats each NULL as unique in unique indexes, which would silently allow duplicate slugs).

**`userId` column:** Retained on all scoped tables. `'SYSTEM'` = system-owned, `'LOCAL'` = self-hosted user, actual `users.id` = authenticated user. Both sentinels exist as rows in the `users` table to satisfy FK constraints. The column doubles as `createdBy` attribution in future team DBs.

**Other indexes** (composite primary keys on join tables, `flows_user_slug_idx`) — map directly to SQLite.

### Phase 2: DB Client

Replace the two PGLite client files with a single libSQL client.

#### 2.1 `db/index.ts` (application client)

```ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';
import { seedSystemData } from './seed-system';

const client = createClient({
	url: process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db',
	authToken: process.env.TURSO_AUTH_TOKEN
	// syncUrl + syncInterval added when cloud sync is enabled
});

export const db = drizzle(client, { schema });

// Startup: migrate schema, then seed system data from bundled systemFlows.db
await migrate(db, { migrationsFolder: './db/migrations' });
await seedSystemData(db);

export * from './schema';
```

#### 2.2 `db/scripts/db.ts` (CLI scripts client)

Same single-client pattern. No more `CREATE EXTENSION IF NOT EXISTS vector` — libSQL vector types are built-in.

### Phase 3: Drizzle Config

Single config for the single runtime DB:

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema/index.ts',
	out: './db/migrations',
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DB_URL ?? 'file:./data/userFlows.db',
		authToken: process.env.TURSO_AUTH_TOKEN
	},
	verbose: true,
	strict: true
});
```

`systemFlows.db` doesn't need its own Drizzle config — it uses the same schema and is only read from (not migrated) at runtime. It's built/seeded via a separate CLI script during development.

### Phase 4: Dependencies

```diff
# Remove
- @electric-sql/pglite
- @electric-sql/pglite-socket

# Add
+ @libsql/client
```

`drizzle-orm`, `drizzle-kit`, `drizzle-zod` — no version changes needed, just different dialect imports.

### Phase 5: Validators & Types

`db/validators.ts` — **Minimal changes.** `drizzle-zod`'s `createInsertSchema` / `createSelectSchema` work identically across dialects. The only additions are Zod enum refinements for columns that were previously pg enums (see Section 1.4).

`types/index.ts` — **No changes.** Composed types reference `*Row` types from validators, which are inferred from Zod schemas. The underlying column types change but the TypeScript types stay the same (strings remain strings, numbers remain numbers).

### Phase 6: Seed Script & CLI Tools

`db/scripts/seed.ts` — **No query changes.** Uses Drizzle's insert API, which is dialect-agnostic. Only the import path for the db client changes (already handled in Phase 2).

`db/scripts/wipe.ts`, `check_db.ts`, `migrate.ts` — Update db client import. Remove any `CREATE EXTENSION` calls.

### Phase 7: Data Directory

```diff
- data/pglite/     (directory with multiple PG data files)
+ data/userFlows.db (single SQLite file)
```

Update `.gitignore` accordingly. Both are already gitignored under `data/`.

### Phase 8: System Data Seeding with Sentinel

Implement the `userId = 'SYSTEM'` sentinel pattern and the startup seed mechanism.

#### 8.1 Sentinel convention

Replace the current `userId IS NULL` convention for system-owned records with explicit sentinel values:

```ts
// db/schema/shared.ts
export const SYSTEM_USER_ID = 'SYSTEM';
export const LOCAL_USER_ID = 'LOCAL';
```

Both sentinels are seeded as rows in the `users` table on first startup, so FK constraints on `userId` columns are satisfied:

```ts
// Seeded into users table
{ id: 'SYSTEM', authId: 'SYSTEM', email: 'system@tigerflows.local' }
{ id: 'LOCAL',  authId: 'LOCAL',  email: 'local@tigerflows.local'  }
```

All system records use `userId = 'SYSTEM'`. Self-hosted user records use `userId = 'LOCAL'`. Authenticated user records use their `users.id` value; the provider identifier remains in `users.authId`. The `UNIQUE(userId, slug)` compound index enforces slug uniqueness per scope — and because `userId` is always a non-null string, the constraint works correctly.

Application queries filter accordingly:

```ts
// All templates visible to the current user (system + own)
const templates = await db.select().from(templates)
  .where(inArray(templates.userId, [SYSTEM_USER_ID, currentUserId]));

// System templates only (read-only in UI)
const systemTemplates = await db.select().from(templates)
  .where(eq(templates.userId, SYSTEM_USER_ID));
```

Where `currentUserId` is `LOCAL_USER_ID` for self-hosted or the authenticated user's `users.id` value for cloud.

#### 8.2 Stable system IDs

Current seed data generates IDs with `tigerid()` (random nanoid) at module load. If `systemFlows.db` is rebuilt, new random IDs would cause "upsert by primary key" to append duplicates instead of updating.

**System content must have deterministic, stable IDs.** Two approaches:

1. **Hardcoded IDs** — define system content IDs as constants (e.g., `SYS_CAT_HEALTH = 'sys-cat-health______'`). Simple, explicit, grep-able.
2. **Derived from slug** — generate a deterministic ID from a hash of the slug/path (e.g., `nanoid`-alphabet encoding of a SHA-256 truncation). Avoids maintaining a manual ID registry.

Recommendation: **hardcoded IDs** for the initial set (it's small), with the option to switch to derived IDs if the system catalog grows large. The IDs are defined in the seed data module and never change across releases.

#### 8.3 Build the system seed DB

`systemFlows.db` is built at development/release time via a CLI script:

```bash
bun run db:build-system   # creates/rebuilds data/systemFlows.db
```

This script creates a fresh libSQL database, applies the same schema migrations, and inserts all built-in content with `userId = 'SYSTEM'` and stable IDs. The resulting file is committed to the repo (or bundled with releases).

#### 8.4 Startup seed: systemFlows.db → userFlows.db

On app startup, after schema migration, the system seed function:

1. Seeds sentinel user rows (`SYSTEM`, `LOCAL`) if they don't exist
2. Opens `systemFlows.db` as a read-only source
3. Copies records into `userFlows.db` in FK-safe order (parents before children)
4. Closes `systemFlows.db`

**Not every table has `userId`.** Root tables (categories, templates, tags, enum_sets, skills, flows, input_source_templates, execution_gate_templates) carry ownership via `userId = 'SYSTEM'`. Dependent tables (template_actions, flow_actions, template_tags, enum_values, template_action_skills, input_sources, execution_gates, etc.) are copied by FK traversal — the seed reads all child rows belonging to system parent records.

```ts
// db/seed-system.ts — simplified
export async function seedSystemData(targetDb: ReturnType<typeof drizzle>) {
  // 1. Ensure sentinel users exist
  await targetDb.insert(schema.users)
    .values({ id: SYSTEM_USER_ID, authId: 'SYSTEM', email: 'system@tigerflows.local' })
    .onConflictDoNothing();
  await targetDb.insert(schema.users)
    .values({ id: LOCAL_USER_ID, authId: 'LOCAL', email: 'local@tigerflows.local' })
    .onConflictDoNothing();

  // 2. Open bundled system DB
  const sourceClient = createClient({ url: 'file:./data/systemFlows.db' });
  const sourceDb = drizzle(sourceClient, { schema });

  // 3. Copy in FK-safe order: parents → children
  //    Root tables (have userId = 'SYSTEM'):
  const systemCategories = await sourceDb.select().from(schema.categories);
  const systemTemplates = await sourceDb.select().from(schema.templates);
  const systemTags = await sourceDb.select().from(schema.tags);
  const systemFlows = await sourceDb.select().from(schema.flows);
  // ...

  //    Child tables (no userId — belong to system parents by FK):
  const systemTemplateActions = await sourceDb.select().from(schema.templateActions);
  const systemFlowActions = await sourceDb.select().from(schema.flowActions);
  const systemTemplateTags = await sourceDb.select().from(schema.templateTags);
  // ...

  // 4. Upsert into target by primary key
  for (const cat of systemCategories) {
    await targetDb.insert(schema.categories).values(cat)
      .onConflictDoUpdate({ target: schema.categories.id, set: cat });
  }
  // ... parents first, then children

  sourceClient.close();
}
```

**Update semantics:** Append-only for now — new system records are added, existing ones are updated (name, description, etc.), nothing is deleted. Reconciliation logic for breaking changes to system content (e.g., removing a built-in template) is deferred to when we actually need it.

#### 8.5 Schema file restructure

```
db/schema/
├── base.ts         # All 10 base tables (unchanged table set, rewritten to sqlite-core)
├── agentic.ts      # All 9 agentic tables (unchanged table set, rewritten to sqlite-core)
├── shared.ts       # NEW: SYSTEM_USER_ID sentinel, enum value tuples, vector32 helper, nanoid
├── relations.ts    # Relations (no structural change — single DB, all FKs local)
└── index.ts        # Re-exports
```

The schema structure stays simple — no system/user schema split needed because everything lives in one runtime DB. `shared.ts` extracts constants and helpers that were previously inlined.

### Auto-migration & Seed Strategy

The app self-migrates on startup — a pattern well-established in SQLite-based apps (Electron, mobile, self-hosted tools). Drizzle tracks which migrations have run in a `__drizzle_migrations` metadata table. `migrate()` is idempotent — if the DB is current, it's a no-op.

#### Startup sequence

```ts
// 1. Migrate schema
await migrate(db, { migrationsFolder: './db/migrations' });

// 2. Seed system data from bundled systemFlows.db
await seedSystemData(db);

// 3. Serve requests
```

#### Why this works across all deployment modes

| Mode | Behavior |
|---|---|
| **Self-hosted** | App starts, migrates `userFlows.db`, seeds system data, serves requests. Zero user intervention. |
| **Cloud (tenant DBs)** | Each tenant's embedded replica runs migrations + seed on app startup. All tenants converge to the same schema and system content. |
| **Team (shared DB)** | First instance to start migrates the shared DB. Others see it's already current. SQLite WAL mode handles the brief write lock gracefully. Note: concurrent startup migration races need an explicit lock or "leader election" — deferred until team DBs ship. |

## Migration Effort Estimate

| Phase                    | Scope                                         | Effort       |
| ------------------------ | --------------------------------------------- | ------------ |
| 0. Vector spike          | Validate Drizzle custom type + vector search   | half day     |
| 1. Schema translation    | 2 files, ~250 lines each                       | 1-2 days     |
| 2. DB client             | 2 files, single libSQL client                  | 30 min       |
| 3. Drizzle config        | 1 file                                         | 15 min       |
| 4. Dependencies          | package.json                                   | 15 min       |
| 5. Validators            | 1 file, enum refinements + sentinel            | 1-2 hours    |
| 6. Seed & scripts        | 4-5 files + new system seed script             | 2-3 hours    |
| 7. Data directory        | .gitignore, docs                               | 15 min       |
| 8. System data seeding   | Sentinel convention, seed-system.ts, build CLI | half day     |
| **Total**                |                                                | **3-4 days** |

Phase 0 (vector spike) is a prerequisite gate — if it reveals issues with Drizzle's custom type or Turso's `vector_distance_cos()`, we adjust before committing to the full rewrite. The bulk of the remaining work is Phase 1 (mechanical schema rewrite). No application code changes are needed because routes/components don't import from the DB layer yet.

## What We Gain

| Benefit                    | Detail                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| **Multi-process access**   | Dev server + Drizzle Studio + CLI scripts simultaneously               |
| **Sync path**              | Turso embedded replicas provide the foundation. Online sync is config-level; offline-first writes need further investigation (see caveat in Architecture). Far less work than building sync from scratch on PGLite. |
| **DB-per-tenant**          | True data isolation. No RLS policies. API-driven provisioning.         |
| **Self-migrating schema**  | App auto-migrates on startup — works for self-hosted, cloud, and team. |
| **Simpler schema**         | Sentinel replaces partial unique indexes. One compound index per table. |
| **Smaller footprint**      | SQLite file vs. PG data directory. No `CREATE EXTENSION`.              |
| **Edge-ready**             | Turso replicates to edge locations. Relevant for team/pro.             |

## What We Lose (and why it's acceptable)

| Loss                       | Mitigation                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **pg enums**               | Zod validation at application boundary (already the enforcement point). Same runtime safety.                                                   |
| **jsonb operators**        | Not currently used. libSQL `json_extract()` available if needed.                                                                               |
| **pgvector maturity**      | Turso's vector search is adequate at our scale (~thousands of rows). HNSW/IVFFlat indexing would only matter at 100K+ rows.                    |
| **Partial unique indexes** | Replaced by compound `UNIQUE(userId, slug)` with sentinel `'SYSTEM'`. Same uniqueness guarantees, SQLite-compatible.                            |
| **Postgres ecosystem**     | We don't use any advanced Postgres features (CTEs, window functions, lateral joins). Our queries are straightforward CRUD + similarity search. |
| **PGLite's zero-config**   | Turso local (`file:`) is equally zero-config. No account needed for self-hosted.                                                               |

## What We Defer

| Item                                                 | When                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| Turso Platform API integration (dynamic DB creation) | With auth + signup flow                               |
| Auth integration                                     | Same timeline as PGLite — unchanged by this migration |
| Team/workspace shared DBs                            | After single-user sync is stable                      |

## Risks

- **Turso vendor dependency for cloud features.** Mitigated: self-hosted mode uses plain libSQL (`file:` URL), which is open-source. Cloud sync is additive, not required. If Turso disappears, self-hosted keeps working and we'd build sync on top of libSQL replication protocol (also open-source).
- **libSQL vector search is younger than pgvector.** Mitigated: at our scale (brute-force over thousands of rows), the implementation complexity that could harbor bugs is minimal. We're not relying on approximate nearest neighbor indexes.
- **Schema rewrite introduces bugs.** Mitigated: no application code depends on the DB layer yet. The rewrite is mechanical and can be verified by seeding + running the existing seed script.
- **Drizzle custom type for vectors may not produce Turso-compatible BLOBs.** Mitigated: Phase 0 vector spike validates insert → read-back → cosine search before committing to the full migration. Known concerns: (a) the custom type API may use `driverData` not `driverValue` depending on Drizzle version, (b) raw `Float32Array` bytes may not match Turso's `vector32(...)` wire format. The spike determines whether to use the custom type or fall back to raw SQL with `vector32()` conversion functions.

## Resolved Questions

1. **System / User data separation: how?** Single runtime DB (`userFlows.db`) with sentinel `userId = 'SYSTEM'` for system records and `userId = 'LOCAL'` for self-hosted users. `systemFlows.db` is a bundled distribution artifact, not a runtime dependency. All FKs are local, no cross-DB complexity. Both sentinels seeded as rows in the `users` table to satisfy FK constraints.
2. **`userId` column: keep or drop?** Keep on all scoped tables, effectively non-null. `'SYSTEM'` = system-owned, `'LOCAL'` = self-hosted user, actual `users.id` = authenticated user. External provider IDs stay in `users.authId`. Also serves as `createdBy` in future team DBs.
3. **Vector column helper: custom Drizzle type or raw SQL?** libSQL has native vector types (`vector32`, `vector64`, `vector8`, `vector1bit`, `vector32_sparse`). Drizzle doesn't have first-class libSQL vector support yet. Phase 0 decides whether to use a `customType` wrapper with Drizzle's current `driverData` API or raw SQL with `vector32()` conversion functions.

## Open Questions

1. **Embedding dimensions:** Currently 384 (`bge-small-en-v1.5`). Experiments in the sibling TigerTrack repo are comparing 384 vs 768-dim models. The decision will be made there and applied here. libSQL vector columns are untyped `BLOB` with dimensions enforced by the embedding pipeline, so changing dimensions is a data migration (re-embed all rows), not a schema change.

## References

- [Turso embedded replicas](https://docs.turso.tech/features/embedded-replicas)
- [Turso vector search](https://docs.turso.tech/guides/vector-search)
- [Turso database-per-tenant](https://docs.turso.tech/features/multi-db-schemas) (note: the "schema databases" sub-feature on this page is deprecated for new users — see [Auto-migration strategy](#auto-migration-strategy))
- [Drizzle libSQL migrator](https://orm.drizzle.team/docs/kit-custom-migrations)
- [Drizzle libSQL adapter](https://orm.drizzle.team/docs/get-started/libsql-new)
- [libSQL (open-source SQLite fork)](https://github.com/tursodatabase/libsql)
