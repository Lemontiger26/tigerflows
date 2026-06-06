import * as s from 'drizzle-orm/sqlite-core';
import {
	executionGateKindValues,
	gatePositionValues,
	idLength,
	inputSourceKindValues,
	nowIso,
	tigerid
} from './shared';
import { users, templateSteps, flowSteps } from './base';

// ---------------------------------------------------------------------------
// skills — executable capabilities an agent can invoke
// ---------------------------------------------------------------------------

export const skills = s.sqliteTable(
	'skills',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: s.text('name').notNull(),
		slug: s.text('slug').notNull(),
		description: s.text('description').notNull().default(''),
		// { kind: 'mcp'|'http'|'builtin', spec: {...} }
		toolSpec: s.text('tool_spec', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('skills_user_slug_idx').on(t.userId, t.slug)]
);

// m:n template_steps <-> skills
export const templateStepSkills = s.sqliteTable(
	'template_step_skills',
	{
		templateStepId: s.text('template_step_id', { length: idLength }).notNull(),
		skillId: s
			.text('skill_id', { length: idLength })
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		order: s.integer('order').notNull().default(0)
	},
	(t) => [
		s.primaryKey({ columns: [t.templateStepId, t.skillId] }),
		s
			.foreignKey({
				name: 'template_step_skills_template_step_fk',
				columns: [t.templateStepId],
				foreignColumns: [templateSteps.id]
			})
			.onDelete('cascade')
	]
);

// m:n flow_steps <-> skills (snapshot + runtime trace)
export const flowStepSkills = s.sqliteTable(
	'flow_step_skills',
	{
		flowStepId: s
			.text('flow_step_id', { length: idLength })
			.notNull()
			.references(() => flowSteps.id, { onDelete: 'cascade' }),
		skillId: s
			.text('skill_id', { length: idLength })
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		order: s.integer('order').notNull().default(0),
		trace: s.text('trace', { mode: 'json' }).$type<Record<string, unknown>>()
	},
	(t) => [s.primaryKey({ columns: [t.flowStepId, t.skillId] })]
);

// ---------------------------------------------------------------------------
// input sources — templates (library) + instances (bound to template_step)
// ---------------------------------------------------------------------------

export const inputSourceTemplates = s.sqliteTable(
	'input_source_templates',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: s.text('kind', { enum: inputSourceKindValues }).notNull(),
		name: s.text('name').notNull(),
		slug: s.text('slug').notNull(),
		description: s.text('description').notNull().default(''),
		// JSON Schema describing required config keys (path, url, auth, ...)
		configSchema: s.text('config_schema', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		defaults: s.text('defaults', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('isrc_tmpl_user_slug_idx').on(t.userId, t.slug)]
);

export const inputSources = s.sqliteTable('input_sources', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	templateStepId: s
		.text('template_step_id', { length: idLength })
		.notNull()
		.references(() => templateSteps.id, { onDelete: 'cascade' }),
	sourceTemplateId: s
		.text('source_template_id', { length: idLength })
		.notNull()
		.references(() => inputSourceTemplates.id),
	name: s.text('name').notNull(),
	// validated against sourceTemplate.configSchema
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	order: s.integer('order').notNull().default(0)
});

// Runtime snapshot on flow side
export const flowInputSources = s.sqliteTable('flow_input_sources', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	flowStepId: s
		.text('flow_step_id', { length: idLength })
		.notNull()
		.references(() => flowSteps.id, { onDelete: 'cascade' }),
	inputSourceId: s.text('input_source_id', { length: idLength }).references(() => inputSources.id, {
		onDelete: 'set null'
	}),
	kind: s.text('kind', { enum: inputSourceKindValues }).notNull(),
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	result: s.text('result', { mode: 'json' }).$type<unknown>(),
	fetchedAt: s.text('fetched_at')
});

// ---------------------------------------------------------------------------
// execution gates — templates (library) + instances (bound to template_step)
// gates carry a workflow position (pre/post/branch/merge/loop)
// ---------------------------------------------------------------------------

export const executionGateTemplates = s.sqliteTable(
	'execution_gate_templates',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		kind: s.text('kind', { enum: executionGateKindValues }).notNull(),
		name: s.text('name').notNull(),
		slug: s.text('slug').notNull(),
		description: s.text('description').notNull().default(''),
		configSchema: s.text('config_schema', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		defaults: s.text('defaults', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('gate_tmpl_user_slug_idx').on(t.userId, t.slug)]
);

export const executionGates = s.sqliteTable('execution_gates', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	templateStepId: s
		.text('template_step_id', { length: idLength })
		.notNull()
		.references(() => templateSteps.id, { onDelete: 'cascade' }),
	gateTemplateId: s
		.text('gate_template_id', { length: idLength })
		.notNull()
		.references(() => executionGateTemplates.id),
	name: s.text('name').notNull(),
	position: s.text('position', { enum: gatePositionValues }).notNull().default('pre'),
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	order: s.integer('order').notNull().default(0)
});

// Runtime state on flow side
export const flowExecutionGates = s.sqliteTable('flow_execution_gates', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	flowStepId: s
		.text('flow_step_id', { length: idLength })
		.notNull()
		.references(() => flowSteps.id, { onDelete: 'cascade' }),
	executionGateId: s.text('execution_gate_id', { length: idLength }).references(() => executionGates.id, {
		onDelete: 'set null'
	}),
	kind: s.text('kind', { enum: executionGateKindValues }).notNull(),
	position: s.text('position', { enum: gatePositionValues }).notNull().default('pre'),
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	passed: s.integer('passed', { mode: 'boolean' }),
	evaluatedAt: s.text('evaluated_at'),
	reason: s.text('reason')
});
