# TigerFlows PGLite to Turso Migration Checklist

Companion to [ADR-001](./001-migrate-pglite-to-turso.md). Phase numbers map to the ADR's Migration Plan.

## 0. Spike (Already Done — Do Not Repeat Here)

- [x] Vector mechanics (`vector32(?)` insert, `vector_distance_cos()` ranking parity, raw `Float32Array` blob compatibility) validated in the sibling TigerTrack repo's `src/eval/libsqlEval.ts`.
- [x] Findings transfer: they validate libSQL dialect mechanics, not flows app logic.

**Constraints (in force for this repo):** no external data added to `flows`; no test scripts referencing external data. The spike/eval stays in `track`.

**Review point:** confirm Outcome B (plain BLOB + raw SQL `vector32()`) is the chosen vector path before schema work.

## 1. Prep / Git Hygiene

- [ ] Confirm current branch and worktree state.
- [ ] Commit any pending ADR/doc changes before schema work starts.
- [ ] Keep unrelated staged/unstaged changes untouched.

**Review point:** decide whether doc changes are committed before schema work starts.

## 2. Schema Rewrite (`db/schema/base.ts` + `db/schema/agentic.ts`)

- [ ] Convert both files from `drizzle-orm/pg-core` to `drizzle-orm/sqlite-core` (`pgTable` → `sqliteTable`).
- [ ] Convert IDs from `char({ length: 21 })` to `text(...)`.
- [ ] Convert booleans to `integer(..., { mode: 'boolean' })`.
- [ ] Convert timestamps to ISO string `text(...)` with `.$defaultFn(() => new Date().toISOString())`.
- [ ] Convert any Postgres arrays to `text(..., { mode: 'json' }).$type<string[]>()`.
- [ ] Convert all 14 `jsonb` columns (`config` x6, `configSchema` x2, `defaults` x2, `toolSpec`, `trace`, `result`, `value`) to `text({ mode: 'json' }).$type<T>()`; convert object defaults — Drizzle serializes `default({})` for the DDL.
- [ ] Replace all 6 `pgEnum`s with plain `text(...)` columns; export value tuples as `as const` for reuse in validators (`flow_status`, `action_type`, `executor_type`, `input_source_kind`, `execution_gate_kind`, `gate_position`).
- [ ] Convert `vector(384)` columns to nullable `blob('embeddings', { mode: 'buffer' })` so rows can be inserted first and vectors updated via raw SQL. Keep the current column name `embeddings`. Remove HNSW/pgvector index definitions.
- [ ] Make scoped root-table `userId` columns `notNull()` and replace the `userId IS NULL` system convention with the `'SYSTEM'` sentinel. Self-hosted user content uses `'LOCAL'`; authenticated content uses `users.id`.
- [ ] Collapse the 7 partial unique indexes into single compound `uniqueIndex(...).on(userId, slug)` — works because sentinels are real non-null strings (no SQLite NULL-distinctness quirk).
- [ ] Keep composite PKs on join tables and other plain indexes (map directly).
- [ ] Add `db/schema/shared.ts`: `SYSTEM_USER_ID`/`LOCAL_USER_ID` sentinels, enum value tuples, nanoid helper.
- [ ] Preserve `relations.ts` (single DB, all FKs local — no structural change).
- [ ] Use the sqlite extra-config array-return syntax `(table) => [...]`.

**Review point:** inspect schema diff before touching connection, config, or seeds.

## 3. Connection + Drizzle Config

- [ ] Replace PGLite client in `db/index.ts` with `@libsql/client` + `drizzle-orm/libsql`.
- [ ] Default local dev to `file:./data/userFlows.db`; support `TURSO_DB_URL` / `TURSO_AUTH_TOKEN`.
- [ ] Enable FK enforcement per connection: `await client.execute('PRAGMA foreign_keys = ON')` before `drizzle(...)`.
- [ ] Do **not** run migration or system seed as a side effect of importing `db/index.ts` or starting the app. Migration and seed/install are explicit CLI/provisioning commands.
- [ ] Replace `db/scripts/db.ts` (CLI client) with the same single libSQL client; drop `CREATE EXTENSION vector`.
- [ ] Update `drizzle.config.ts` → `dialect: 'turso'`, `dbCredentials` url/authToken.
- [ ] Update `.env.example`.
- [ ] Defer embedded-replica / `syncUrl` config to the future sync milestone.

**Review point:** confirm env naming, local/remote behavior, and PRAGMA placement.

## 4. Migration Baseline

- [ ] Delete the old Postgres baseline (`db/migrations/0000_goofy_major_mapleleaf.sql` + `meta/`).
- [ ] Generate a fresh SQLite/libSQL migration (`bun run db:gen`).
- [ ] Inspect generated SQL: `embeddings blob`, JSON columns as `text`, timestamp `text`, booleans `integer DEFAULT`, compound unique constraints, FK clauses.

**Review point:** review generated SQL before seeding.

## 5. Validators & Types

- [ ] `db/validators.ts`: add Zod `z.enum(...)` refinements for the 6 ex-enum columns (referencing the schema's `as const` tuples). `createInsertSchema`/`createSelectSchema` otherwise dialect-agnostic.
- [ ] `types/index.ts`: no changes expected (composed types reference `*Row` inferred types).

**Review point:** confirm enum refinements compile and cover every ex-enum column.

## 6. Seed & CLI Scripts

- [ ] `db/scripts/seed.ts`: Drizzle insert API is dialect-agnostic — only client import changes. Convert any `Date` objects to ISO strings.
- [ ] Write embeddings via raw SQL `UPDATE ... SET embeddings = vector32(?) WHERE id = ?`.
- [ ] Replace all current `userId: null` seed/store defaults with `SYSTEM_USER_ID` for built-ins and `LOCAL_USER_ID` for self-hosted user-created records.
- [ ] `db/scripts/wipe.ts`, `check_db.ts`, `migrate.ts`, `embed.ts`: update client import; remove any `CREATE EXTENSION` calls.
- [ ] Run wipe + seed against the local libSQL file; spot-check row counts and a few rows.

**Review point:** inspect seeded counts and representative rows (including a stored embedding round-trip).

## 7. Dependencies & Data Directory

- [ ] Remove `@electric-sql/pglite` and `@electric-sql/pglite-socket`.
- [ ] Add `@libsql/client`.
- [ ] Remove the `db:serve` (pglite-server) script from `package.json`.
- [ ] `.gitignore`: ignore local runtime DBs (`data/userFlows.db*`) while allowing committed/bundled `data/systemFlows.db` (`data/*` + `!data/systemFlows.db`).

**Review point:** confirm no stray pglite references remain (`grep -ri pglite`).

## 8. System Data Seeding (Sentinel + Bundled systemFlows.db)

- [ ] Define `SYSTEM_USER_ID = 'SYSTEM'`, `LOCAL_USER_ID = 'LOCAL'` in `shared.ts`.
- [ ] Replace the `userId IS NULL` system convention with the `'SYSTEM'` sentinel across queries.
- [ ] Seed both sentinels as rows in `users` (satisfy FK constraints) via explicit init/install commands and `onConflictDoNothing`.
- [ ] Give all system content **stable hardcoded IDs** (not random `tigerid()` at module load) so upsert-by-PK updates rather than duplicates.
- [ ] Add `db:build-system` CLI: fresh libSQL DB, apply migrations, insert release-managed built-in content with `userId='SYSTEM'` + stable IDs → `data/systemFlows.db` (committed/bundled). Content includes the `SYSTEM` sentinel row, categories, tags, skills, templates, agentic input/gate templates, demos/showcases, and onboarding examples.
- [ ] Add `db:install-system` CLI / `db/seed-system.ts`: ensure `SYSTEM` + `LOCAL` users in `userFlows.db` → open `systemFlows.db` read-only → copy in FK-safe order (root tables with `userId`, then child tables by FK) → `onConflictDoUpdate` by PK → close source.
- [ ] Keep system installation explicit. Do not wire `seedSystemData` into app startup.
- [ ] Use only synthetic, privacy-safe showcase content. Avoid health, medical, mental-health, employee surveillance, customer PII, or other sensitive personal data.

**Review point:** verify a fresh `userFlows.db` ends up with SYSTEM/LOCAL users + all system content after explicit install, and that re-running the install updates (not duplicates) by PK.

## 9. Cleanup + Verification

- [ ] `grep -ri "pglite\|pg-core\|pgEnum\|jsonb\|vector(" db/ src/` returns nothing stale.
- [ ] Run `bun run check` (svelte-check + tsc) → 0 errors.
- [ ] Run `bun run test`.
- [ ] Run wipe + seed + build-system + install-system; start dev server, confirm multi-process access (dev server + `db:stud` simultaneously — the original motivation).
- [ ] Review full diff.

**Final review:** schema, generated migration, seed/system-seed behavior, multi-process access, dependency cleanup.
