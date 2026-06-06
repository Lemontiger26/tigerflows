# TigerFlows PGLite to Turso Migration Checklist

Companion to [ADR-001](./001-migrate-pglite-to-turso.md). Phase numbers map to the ADR's Migration Plan.

## 0. Source Freeze + Spike Results

- [x] Vector mechanics (`vector32(?)` insert, `vector_distance_cos()` ranking parity, raw `Float32Array` blob compatibility) validated in the sibling TigerTrack repo's `src/eval/libsqlEval.ts`.
- [x] Findings transfer: they validate libSQL dialect mechanics, not flows app logic.
- [x] Decision locked: PGLite is now only the source/reference implementation. Do not spend more time stabilizing PGLite unless needed to inspect old state.
- [x] Migration mechanism locked: re-seed/import controlled seed/system content into libSQL. Do not perform a live `data/pglite/` data-directory conversion.

**Constraints (in force for this repo):** no external data added to `flows`; no test scripts referencing external data. The spike/eval stays in `track`.

**Review point:** confirm Outcome B (plain BLOB + raw SQL `vector32()`) remains the chosen vector path before schema work.

## 1. Prep / Git Hygiene

- [x] Confirm current branch and worktree state.
- [x] Commit any pending ADR/doc changes before schema work starts.
- [x] Keep unrelated staged/unstaged changes untouched.
- [x] Stop any stale `pglite-server` process before testing DB tools; DBeaver/Studio must not accidentally connect to the old PGLite socket.
- [x] Preserve the current seed data as the import source while rewriting scripts.

**Review point:** decide whether doc changes are committed before schema work starts.

## 2. Schema Rewrite (`db/schema/base.ts` + `db/schema/agentic.ts`)

- [x] Convert both files from `drizzle-orm/pg-core` to `drizzle-orm/sqlite-core` (`pgTable` → `sqliteTable`).
- [x] Convert IDs from `char({ length: 21 })` to `text(...)`.
- [x] Convert booleans to `integer(..., { mode: 'boolean' })`.
- [x] Convert timestamps to ISO string `text(...)` with `.$defaultFn(() => new Date().toISOString())`.
- [x] Convert any Postgres arrays to `text(..., { mode: 'json' }).$type<string[]>()`.
- [x] Convert all 14 `jsonb` columns (`config` x6, `configSchema` x2, `defaults` x2, `toolSpec`, `trace`, `result`, `value`) to `text({ mode: 'json' }).$type<T>()`; convert object defaults — Drizzle serializes `default({})` for the DDL.
- [x] Replace all 6 `pgEnum`s with plain `text(...)` columns; export value tuples as `as const` for reuse in validators (`flow_status`, `step_type`, `executor_type`, `input_source_kind`, `execution_gate_kind`, `gate_position`).
- [x] Convert `vector(384)` columns to nullable `blob('embeddings', { mode: 'buffer' })` so rows can be inserted first and vectors updated via raw SQL. Keep the current column name `embeddings`. Remove HNSW/pgvector index definitions.
- [x] Make scoped root-table `userId` columns `notNull()` and replace the `userId IS NULL` system convention with the `'SYSTEM'` sentinel. Self-hosted user content uses `'LOCAL'`; authenticated content uses `users.id`.
- [x] Collapse the 7 partial unique indexes into single compound `uniqueIndex(...).on(userId, slug)` — works because sentinels are real non-null strings (no SQLite NULL-distinctness quirk).
- [x] Keep composite PKs on join tables and other plain indexes (map directly).
- [x] Add `db/schema/shared.ts`: `SYSTEM_USER_ID`/`LOCAL_USER_ID` sentinels, enum value tuples, nanoid helper.
- [x] Preserve `relations.ts` (single DB, all FKs local — no structural change).
- [x] Use the sqlite extra-config array-return syntax `(table) => [...]`.

**Review point:** inspect schema diff before touching connection, config, or seeds.

## 3. Connection + Drizzle Config

- [x] Replace PGLite client in `db/index.ts` with `@libsql/client` + `drizzle-orm/libsql`.
- [x] Default local dev to `file:./data/userFlows.db`; support `TURSO_DB_URL` / `TURSO_AUTH_TOKEN`.
- [x] Enable FK enforcement per connection: `await client.execute('PRAGMA foreign_keys = ON')` before `drizzle(...)`.
- [x] Do **not** run migration or system seed as a side effect of importing `db/index.ts` or starting the app. Migration and seed/install are explicit CLI/provisioning commands.
- [x] Replace `db/scripts/db.ts` (CLI client) with the same single libSQL client; drop `CREATE EXTENSION vector`.
- [x] Update `drizzle.config.ts` → `dialect: 'turso'`, `dbCredentials` url/authToken.
- [x] Update `.env.example`.
- [x] Defer embedded-replica / `syncUrl` config to the future sync milestone.

**Review point:** confirm env naming, local/remote behavior, and PRAGMA placement.

## 4. Migration Baseline

- [x] Delete the old Postgres baseline (`db/migrations/0000_goofy_major_mapleleaf.sql` + `meta/`).
- [x] Generate a fresh SQLite/libSQL migration (`bun run db:gen`).
- [ ] Inspect generated SQL: `embeddings blob`, JSON columns as `text`, timestamp `text`, booleans `integer DEFAULT`, compound unique constraints, FK clauses.
- [ ] Apply the generated migration to a fresh `data/userFlows.db`.
- [ ] Confirm `PRAGMA foreign_key_check` returns no rows on an empty migrated DB.

**Review point:** review generated SQL before seeding.

## 5. Validators & Types

- [x] `db/validators.ts`: add Zod `z.enum(...)` refinements for the 6 ex-enum columns (referencing the schema's `as const` tuples). `createInsertSchema`/`createSelectSchema` otherwise dialect-agnostic.
- [ ] `types/index.ts`: no changes expected (composed types reference `*Row` inferred types).

**Review point:** confirm enum refinements compile and cover every ex-enum column.

## 6. Seed & CLI Scripts

- [x] `db/scripts/seed.ts`: rewrite as the libSQL seed/import path. Drizzle insert API remains useful for ordinary fields. Convert any `Date` objects to ISO strings.
- [x] Move original built-in seed source from `src/lib/stores/seed.ts` to `db/seed/builtin.ts`.
- [x] Bundle synthetic incident-postmortem showcase flow JSON under `db/seed/postmortems/` (50 files, product demo content, no extra download).
- [x] Write embeddings via raw SQL `UPDATE ... SET embeddings = vector32(?) WHERE id = ?`.
- [x] Replace all current `userId: null` seed/store defaults with `SYSTEM_USER_ID` for built-ins and `LOCAL_USER_ID` for self-hosted user-created records.
- [x] Seed/import all existing built-in demo content from `db/seed/builtin.ts`: categories, tags, templates, template steps, flows, flow steps, skills, execution gates, input sources, enum sets/values, and join tables.
- [ ] Seed/import bundled postmortem showcase flows from `db/seed/postmortems/` as `SYSTEM` demo/showcase content.
- [x] Seed/import `SYSTEM` and `LOCAL` sentinel users before any scoped records.
- [x] `db/scripts/wipe.ts`, `check_db.ts`, `migrate.ts`, `embed.ts`: update client import; remove any `CREATE EXTENSION` calls.
- [ ] Run wipe + migrate + seed against the local libSQL file.
- [x] Assert table counts match expected seed counts.
- [ ] Assert representative rows by stable slug/ID (`SYSTEM` category/template/tag, at least one flow, at least one agentic gate/input source).
- [x] Assert `PRAGMA foreign_key_check` returns no rows after seed.
- [x] Assert at least one stored embedding round-trip and one `vector_distance_cos()` query work.

**Review point:** inspect seeded counts and representative rows (including a stored embedding round-trip).

## 7. Dependencies & Data Directory

- [ ] Remove `@electric-sql/pglite` and `@electric-sql/pglite-socket`.
- [ ] Remove `@electric-sql/pglite-pgvector`.
- [ ] Add `@libsql/client`.
- [ ] Remove the `db:serve` (pglite-server) script from `package.json`.
- [ ] `.gitignore`: ignore local runtime DBs (`data/userFlows.db*`) while allowing committed/bundled `data/systemFlows.db` (`data/*` + `!data/systemFlows.db`).

**Review point:** confirm no stray pglite references remain (`grep -ri pglite`).

## 8. System Data Seeding (Sentinel + Bundled systemFlows.db)

- [ ] Define `SYSTEM_USER_ID = 'SYSTEM'`, `LOCAL_USER_ID = 'LOCAL'` in `shared.ts`.
- [ ] Replace the `userId IS NULL` system convention with the `'SYSTEM'` sentinel across queries.
- [ ] Seed both sentinels as rows in `users` (satisfy FK constraints) via explicit init/install commands and `onConflictDoNothing`.
- [ ] Give all system content **stable hardcoded IDs** (not random `tigerid()` at module load) so upsert-by-PK updates rather than duplicates.
- [ ] Add `db:build-system` CLI: fresh libSQL DB, apply migrations, insert release-managed built-in content with `userId='SYSTEM'` + stable IDs → `data/systemFlows.db` (committed/bundled). Content includes the `SYSTEM` sentinel row, categories, tags, skills, templates, agentic input/gate templates, demos/onboarding examples, and the 50-flow postmortem showcase from `db/seed/postmortems/`.
- [ ] Add `db:install-system` CLI / `db/seed-system.ts`: ensure `SYSTEM` + `LOCAL` users in `userFlows.db` → open `systemFlows.db` read-only → copy in FK-safe order (root tables with `userId`, then child tables by FK) → `onConflictDoUpdate` by PK → close source.
- [ ] Keep system installation explicit. Do not wire `seedSystemData` into app startup.
- [ ] Use only synthetic, privacy-safe showcase content. Avoid health, medical, mental-health, employee surveillance, customer PII, or other sensitive personal data.

**Review point:** verify a fresh `userFlows.db` ends up with SYSTEM/LOCAL users + all system content after explicit install, and that re-running the install updates (not duplicates) by PK.

## 9. Cleanup + Verification

- [ ] `grep -ri "pglite\|pg-core\|pgEnum\|jsonb\|vector(" db/ src/` returns nothing stale.
- [ ] Run `bun run check` (svelte-check + tsc) → 0 errors.
- [ ] Run `bun run test`.
- [ ] Run wipe + migrate + seed/import + build-system + install-system.
- [ ] Start dev server and open DB inspector simultaneously against `data/userFlows.db` — confirm multi-process access, the original motivation.
- [ ] Remove or archive `data/pglite/` after libSQL seed/import verification passes.
- [ ] Review full diff.

**Final review:** schema, generated migration, seed/system-seed behavior, multi-process access, dependency cleanup.
