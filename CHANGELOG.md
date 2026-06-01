# Changelog

All notable changes to TigerFlows are recorded here.

---

## [Unreleased] — 2026-04-20 (session)

### Fixed

- `flows.userId` was inserting as empty string `''` causing silent FK violations; changed to `null` throughout store and seed data
- `flow_actions.flowId` in seed data was always `''` (placeholder never filled); seed script now uses `flow.id` directly
- `db/scripts/embed.ts` was a duplicate of `src/lib/server/embeddings.ts`; replaced with a thin re-export to eliminate drift risk

### Changed

- `flows.userId` made nullable (consistent with templates/categories pre-auth; to be restored `.notNull()` when Supabase auth is wired up — see memory note)
- All `embeddings` columns on all tables marked `.notNull()`
- Seed script rewritten: wipes all tables at start; computes all embeddings in a single batched pass before any inserts (was: insert nulls, then two-pass update)
- Client-side seed data: `embeddings: null` replaced with `[] as number[]` to satisfy updated TS types

### Deferred (noted in memory)

- `flows.userId` must be restored `.notNull()` once auth lands
- `flows` slug index needs a partial `WHERE userId IS NULL` index (mirroring categories/templates) while userId remains nullable

---

## [0.8.0] — 2026-04-20 · Seeding infrastructure

### Added

- `db/scripts/db.ts` — standalone Drizzle client for scripts (dotenv, no SvelteKit aliases)
- `db/scripts/seed.ts` — seed script inserting system categories, templates, and demo flows
- `db/scripts/embed.ts` — embedding utility for seed scripts
- `db/scripts/wipe.ts` — ordered table wipe (FK-safe)
- `db/scripts/check_db.ts` — DB connectivity smoke check
- `src/lib/server/embeddings.ts` — server-side singleton pipeline using `@huggingface/transformers` / BAAI/bge-small-en-v1.5 (384d); exports `embed()` and `embedMany()`
- Drizzle migration `20260420140654_strong_scarecrow`: pgvector extension enable

---

## [0.7.0] — 2026-04-20 · Migrations + embeddings schema

### Added

- First Drizzle migration generated (`20260420130710_gray_angel`): full schema DDL
- `pgvector` `embeddings vector(384)` column added to all six tables (categories, templates, template_actions, flows, flow_actions, users excluded)
- Second migration (`20260420132228_parallel_rattler`): schema refinements

### Changed

- Seed data in `src/lib/stores/seed.ts` adapted to new DB schema shape
- `src/lib/stores/flows.svelte.ts` updated for schema alignment

---

## [0.6.0] — 2026-04-20 · DB relations + system ownership

### Added

- Full Drizzle `defineRelations` map across all six tables
- Partial unique indexes: `categories_system_slug_idx` and `templates_system_slug_idx` enforce slug uniqueness among system rows (`WHERE userId IS NULL`)

### Changed

- `categories.userId` and `templates.userId` made nullable — `null` signals system-owned (no user); cascade delete still applies for user-owned rows
- Composite unique indexes `categories_user_slug_idx` and `templates_user_slug_idx` scope slugs per user

---

## [0.5.0] — 2026-04-20 · Drizzle 1.0 beta upgrade

### Changed

- `drizzle-orm` and `drizzle-kit` updated to `1.0.0-beta`
- Schema and config adjusted for updated API surface

---

## [0.4.0] — 2026-04-20 · Database layer

### Added

- `db/schema/base.ts` — Drizzle/PostgreSQL schema: `users`, `categories`, `templates`, `template_actions`, `flows`, `flow_actions`, `flow_status` enum
- `db/validators.ts` — Zod validators via `drizzle-zod` (`createSelectSchema` / `createInsertSchema`); inferred `*Row` types re-exported
- `db/index.ts` — SvelteKit-aware Drizzle client (Supabase Supavisor pooler via `$env/static/private`)
- `drizzle.config.ts` — Drizzle Kit config targeting Supabase
- `src/config/defaults.ts` — shared constants (ID length)
- `src/lib/helpers/tigerId.ts` updated to use nanoid with nolookalikes alphabet
- `types/index.ts` rebuilt: raw `*Row` types from validators, composed app types (`Template`, `Category`, `Flow` with nested actions), UI types (`CategoryStats`, `HistoryFilters`)
- `strategy/00.narrow_wedge_plan.md` — product strategy document

### Changed

- `tsconfig.json` — path aliases: `~types`, `$lib`, `@src`, `$env`
- `src/lib/stores/seed.ts` — seed data expanded and aligned with DB schema types

---

## [0.3.0] — 2026-04-14 · TigerFlows rebrand + full terminology rename

### Changed (renamed)

- Product: **TigerSteps → TigerFlows**
- `groups` → `categories`
- `incidences` → `flows`
- `steps` → `actions`
- `timeline` → `history`
- `StepCard` → `ActionCard`
- `TemplateStepEditor` → `TemplateActionEditor`
- `GroupDetail/Editor/List` → `CategoryDetail/Editor/List`
- `IncidenceList/View/NewIncidenceModal` → `FlowList/FlowView/NewFlowModal`
- `TimelineBrowser` → `HistoryBrowser`
- Routes restructured: `/groups` → `/categories`, `/timeline` → `/history`, `/flows` added

### Removed

- `.agents/prompts/` and `.agents/skills/` — agent orchestration prompt files removed from repo

---

## [0.2.0] — 2026-04-13–14 · Sonnet/Opus rewrite + slugification

### Changed

- Full component and store rewrite for correctness and Svelte 5 idioms
- Navigation store simplified; routing moved to dedicated route files
- `tsconfig.json` strict mode adjustments

### Added

- `src/lib/helpers/slugify.ts` — URL-safe slug generator
- Slug-based routing for groups, incidences, and templates (`[id]` routes now use slugs)
- `src/routes/groups/[id]/[incidenceId]/+page.svelte` — deep-linked incidence view
- `archive/agents_260414.tar.bz` — snapshot of first agent-developed version

---

## [0.1.0] — 2026-04-13 · Initial agent-developed version

### Added

- SvelteKit + Svelte 5 + DaisyUI + Tailwind project scaffold
- Full localStorage-persisted store layer: `groups`, `incidences`, `templates`, `navigation`, `stats`
- UI components: `Badge`, `ConfirmDialog`, `MarkdownEditor`, `MarkdownView`, `Modal`, `SearchField`, `StepCard`
- Layout: `Header`, `Sidebar`, `MobileNav`
- Feature components: `GroupDetail`, `GroupEditor`, `GroupList`, `IncidenceList`, `IncidenceView`, `NewIncidenceModal`, `TemplateEditor`, `TemplateList`, `TemplateStepEditor`, `StatsPanel`, `TimelineBrowser`
- Routes: `/` (dashboard), `/groups`, `/templates`, `/stats`, `/timeline`
- Seed data for demo groups, templates, and incidences
- `types/index.ts` — initial TypeScript domain types
