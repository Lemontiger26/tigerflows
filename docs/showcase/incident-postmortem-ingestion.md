# Incident Postmortem Showcase Ingestion

This note describes the technical strategy for turning public incident
postmortem patterns into TigerFlows showcase content.

The goal is not to demonstrate that an LLM can read every document and invent a
workflow. The goal is to demonstrate that TigerFlows can help inspect messy
source data, produce explicit ingestion logic, validate the result, and then
operate on recurring structured history.

## Source Data And Licensing

The current research corpus has two useful shapes:

- `postmortems.app`: broad corpus, currently 242 JSON documents. These records
  are compact and mostly structured metadata plus summary text.
- iLert postmortem library: smaller corpus, currently 18 English HTML-derived
  JSON documents. These records are richer and include section headings,
  severity labels, source links, and timeline-like entries.

These sources are useful for pattern analysis and local experiments, but they
should not be bundled into the open-source repository or app distribution.

`postmortems.app` lists its corpus license as GPL-3. That means the app should
not redistribute its JSON payloads, summaries, normalized records, or derived
showcase rows as bundled product content. Use this material only to study field
shapes, category vocabularies, timing completeness, and common incident
structures. The bundled showcase should use synthetic source material generated
from these observed patterns, not copied records.

For any real public corpus, source download should be explicit and
user-triggered. A demo button may ask the user to download source data locally
and run the importer on their machine. That flow keeps source acquisition
separate from app distribution and makes licensing boundaries visible.

The source files should be treated as local input artifacts, not as the final
showcase schema. Ingestion should preserve source URL, parser version, and
payload hash so generated records remain auditable and reproducible without
requiring bundled source payloads.

## Design Principle

The model should inspect data and help write ingestion code. It should not be
the ingestion engine.

Normal ingestion must be deterministic:

1. Read source records.
2. Apply explicit mapping and normalization code.
3. Validate typed output.
4. Emit import results and exception reports.
5. Insert or update local demo records from validated output.

Model assistance is appropriate for:

- inspecting representative source samples;
- proposing a target mapping;
- generating or modifying importer code;
- generating validation tests and fixtures;
- reviewing ambiguous or failed records after deterministic validation.

Model assistance is not appropriate for:

- classifying every row by prompt during normal import;
- generating final persisted values without reproducible mapping logic;
- silently filling missing fields that should be marked as unknown;
- bypassing schema validation because the generated prose "looks right".

## Target Showcase Flow

Category: `Reliability / Incident Learning`

Template: `Incident Postmortem Review`

The template should combine typed actions with source traceability. The flow
represents one incident report. A local demo database can then contain many
completed synthetic or user-downloaded flows, allowing filtering, statistics,
recurrence analysis, and chat over historical incident patterns.

### Actions

1. `Source intake`
   - Type: agent/input
   - Captures source kind, source URL, archive URL, original ID/slug, raw
     payload path when locally available, payload hash, parser version, and
     import timestamp.

2. `Classify incident`
   - Type: mixed typed fields
   - Captures company, product/service, severity, normalized categories,
     keywords, and source quality.

3. `Normalize timing`
   - Type: dates and numbers
   - Captures start time, end time, published time, duration hours, and timing
     confidence.

4. `Summarize impact`
   - Type: text plus enums
   - Captures impact summary, affected systems, affected user/customer text,
     and business risk.

5. `Extract timeline`
   - Type: structured JSON
   - Captures timeline entries as `{ time, event, stage }` objects.

6. `Identify root cause`
   - Type: text plus enums
   - Captures root cause, trigger type, contributing factors, and
     preventability.

7. `Response and communication`
   - Type: text, booleans, enums
   - Captures mitigation, response summary, communication quality,
     status-page issue, and whether customer-visible updates are present.

8. `Lessons learned`
   - Type: text plus multi-enum
   - Captures key learnings and recommended controls.

9. `Review quality`
   - Type: validation metadata
   - Captures extraction confidence, missing required fields, warnings, and
     whether human review is needed.

## Suggested Typed Fields

The first typed target does not need a new table per field. It can live in
flow action values and action config while the showcase is still proving the
shape. If these fields become central product primitives later, promote them
into first-class schema only after real usage confirms the shape.

Recommended field set:

- `sourceKind`: `postmortems_app` | `ilert`
- `sourceId`: source UUID or slug
- `sourceUrl`: URL
- `archiveUrl`: URL or empty
- `company`: text
- `product`: text
- `title`: text
- `summary`: text
- `description`: text
- `severity`: `SEV-0` | `SEV-1` | `SEV-2` | `SEV-3` | `unknown`
- `categories`: multi-enum
- `keywords`: string array
- `riskTypes`: multi-enum
- `startTime`: ISO timestamp or null
- `endTime`: ISO timestamp or null
- `publishedAt`: ISO timestamp or null
- `durationHours`: number or null
- `timingConfidence`: `exact` | `derived` | `missing`
- `timeline`: array of timeline entries
- `sourceQuality`: `structured` | `semi_structured` | `free_text`
- `extractionConfidence`: number from 0 to 1
- `needsReview`: boolean

Recommended category/risk vocabularies should start from observed source data:

- categories: `config-change`, `cloud`, `automation`, `security`,
  `cascading-failure`, `hardware`, `time`, `network`, `database`, `auth`,
  `deployment`
- risks: `availability`, `security`, `data_loss`, `latency`,
  `configuration`, `network`, `customer_comms`, `compliance`, `unknown`
- controls: `canary`, `rollback`, `schema_validation`, `rate_limits`,
  `synthetic_monitoring`, `blast_radius_reduction`, `runbook`, `ownership`,
  `customer_comms`

## Pattern Analysis

The research corpora should be analyzed to generate synthetic source material
with realistic shape and recurrence. The generator may use aggregate facts such
as field names, missingness rates, category vocabularies, common section
headings, and typical timeline structures. It should not copy source titles,
summaries, descriptions, timelines, or company/product combinations into
bundled demo records.

Useful observed patterns:

- broad metadata records with company, product, title, summary, description,
  categories, keywords, source URL, and start/end/published timestamps;
- richer article records with severity, section headings, timeline entries,
  source links, response notes, communication notes, and learnings;
- incomplete timing fields are common and should be represented explicitly;
- severity is not always present;
- category recurrence is important for the demo: configuration changes, cloud
  services, automation, security, cascading failures, hardware, and time-related
  failures appear repeatedly;
- timeline extraction varies between timestamped events and prose sections.

## Deterministic Mapping

The mapping below describes how a local user-triggered importer should normalize
downloaded source records. It also informs the synthetic source generator.

### postmortems.app

Direct field mapping:

- `UUID` -> `sourceId`
- `URL` -> `sourceUrl`
- `ArchiveURL` -> `archiveUrl`
- `Company` -> `company`
- `Product` -> `product`
- `Title` -> `title`
- `Summary` -> `summary`
- `Description` -> `description`
- `Categories` -> source categories
- `Keywords` -> keywords
- `StartTime` -> `startTime`
- `EndTime` -> `endTime`
- `SourcePublishedAt` -> `publishedAt`
- `SourceFetchedAt` -> source metadata

Derived values:

- `durationHours`: compute only when start and end are valid and end >= start.
- `timingConfidence`: `exact` when start/end are valid, otherwise `missing`.
- `severity`: `unknown`; the source does not provide explicit severity.
- `sourceQuality`: `semi_structured`.
- `riskTypes`: deterministic keyword/category lookup.
- `needsReview`: true when title, summary, start time, or category is missing.

Bundling rule:

- do not bundle raw records;
- do not bundle normalized records generated from raw records;
- do not bundle copied summaries/descriptions/titles;
- use only aggregate patterns to generate synthetic demo records.

### iLert

Direct field mapping:

- `slug` -> `sourceId`
- `url` / `canonicalUrl` -> `sourceUrl`
- `title` -> `title`
- `description` -> `summary`
- `listing.severity` -> `severity`
- `listing.publishedDate` or JSON-LD `datePublished` -> `publishedAt`
- `sections` -> sectioned source text
- `timeline` -> timeline entries
- `sourceLinks` -> source metadata

Derived values:

- `company` and `product`: parse from title and `Company` /
  `Company and product` sections where deterministic rules are sufficient.
- `sourceQuality`: `structured` when severity and timeline/sections are
  present, otherwise `semi_structured`.
- `riskTypes`: deterministic keyword/heading lookup.
- `needsReview`: true when severity is missing, title is missing, or timeline
  extraction produced no entries.

Bundling rule:

- treat iLert records as local source material unless redistribution permission
  is explicitly confirmed;
- synthetic showcase records may mimic the structure, not the content.

## Synthetic Source Generation

The default bundled demo should be generated synthetic source material. It
should look like realistic incident source data before interpretation, so the
demo can still show the ingestion workflow end to end.

Recommended generator inputs:

- deterministic seed;
- company/service name pools that are fictional;
- category/risk vocabularies derived from observed aggregate patterns;
- severity distribution;
- missing-field distribution;
- timeline shape distribution;
- section heading templates;
- incident duration distribution with short, medium, and long incidents;
- source quality modes: `structured`, `semi_structured`, `free_text`.

Recommended generated source artifacts:

- compact JSON records shaped like broad postmortem metadata;
- richer JSON records shaped like parsed article pages;
- a manifest with generator version, seed, source pattern version, and counts.

The synthetic source should still pass through the same deterministic importer
as downloaded real source data. This proves the ingestion path without shipping
third-party content.

## Validation

The importer should validate every normalized record before creating showcase
flows. Validation should reject invalid enum values and malformed dates, but it
should not reject incomplete public data when incompleteness is expected.
Instead, incomplete records should be imported with explicit nulls and warnings.

Validation output should include:

- total source records;
- imported records;
- skipped records;
- warning count;
- records requiring review;
- per-field missing counts;
- parser version;
- import timestamp.

This report is useful demo material itself: it shows that TigerFlows makes
data transformation inspectable rather than magical.

## Demo Data Installation

Showcase templates and the synthetic data generator may be bundled with the
app. Third-party source data should not be bundled.

Demo data should not be fetched, scraped, migrated, or seeded automatically at
app startup. The user must explicitly request demo data installation.

Expected command shape:

```sh
bun run showcase:generate-incidents
bun run db:build-system
bun run db:install-system
```

The exact command names can change, but the behavior should remain explicit:

- scrape/download is a separate local preparation step;
- synthetic showcase JSON is generated by deterministic code;
- system database build may consume synthetic showcase JSON;
- user runtime database receives system showcase content only through explicit
  install/upsert;
- real corpus download/import is a user-triggered local action, not part of app
  packaging.

Suggested in-app behavior:

1. User clicks `Install incident demo`.
2. App explains that the bundled demo uses synthetic data.
3. App optionally offers `Download public postmortem corpus` as a separate
   local action with source/license links.
4. App runs the deterministic importer locally.
5. App shows import report and review queue before installing records.

## Open Questions

- How much synthetic demo data should ship by default.
- Whether any real public source permits redistribution of normalized records.
- Whether optional local corpus download should live in the app UI, a CLI, or
  both.
- Whether incident-specific fields should stay as action values or become
  first-class database columns after the showcase validates the model.

Default recommendation: bundle only synthetic demo generation plus the incident
template/importer; make real-source downloads explicit, local, and
user-triggered; promote schema only after the interaction design proves useful.
