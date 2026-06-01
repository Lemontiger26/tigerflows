import * as p from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { nolookalikes } from 'nanoid-dictionary';
import defaults from '@src/config/defaults';
import { users, templateActions, flowActions } from './base';

const id_length = defaults.id_length;
const tigerid = customAlphabet(nolookalikes, id_length);

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const inputSourceKindEnum = p.pgEnum('input_source_kind', [
	'log_file',
	'rest_health',
	'systemctl_status',
	'email',
	'sql_query',
	'http_get',
	'rag_corpus',
	'webhook',
	'custom'
]);

export const executionGateKindEnum = p.pgEnum('execution_gate_kind', [
	'human_approval',
	'predicate',
	'budget',
	'time_window',
	'dependency',
	'rate_limit',
	'custom'
]);

// Where in the workflow the gate fires.
// pre/post = around a single action.
// pre_branch/pre_merge = around conditional splits/joins.
// pre_loop/post_loop = around iteration boundaries.
export const gatePositionEnum = p.pgEnum('gate_position', [
	'pre',
	'post',
	'pre_branch',
	'post_branch',
	'pre_merge',
	'post_merge',
	'pre_loop',
	'post_loop'
]);

// ---------------------------------------------------------------------------
// skills — executable capabilities an agent can invoke
// ---------------------------------------------------------------------------

export const skills = p.pgTable(
	'skills',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		name: p.text('name').notNull(),
		slug: p.text('slug').notNull(),
		description: p.text('description').notNull().default(''),
		// { kind: 'mcp'|'http'|'builtin', spec: {...} }
		toolSpec: p.jsonb('tool_spec').$type<Record<string, unknown>>().notNull().default({}),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('skills_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('skills_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

// m:n template_actions <-> skills
export const templateActionSkills = p.pgTable(
	'template_action_skills',
	{
		templateActionId: p
			.char('template_action_id', { length: id_length })
			.notNull(),
		skillId: p
			.char('skill_id', { length: id_length })
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		order: p.integer('order').notNull().default(0)
	},
	(t) => [
		p.primaryKey({ columns: [t.templateActionId, t.skillId] }),
		p
			.foreignKey({
				name: 'template_action_skills_template_action_fk',
				columns: [t.templateActionId],
				foreignColumns: [templateActions.id]
			})
			.onDelete('cascade')
	]
);

// m:n flow_actions <-> skills (snapshot + runtime trace)
export const flowActionSkills = p.pgTable(
	'flow_action_skills',
	{
		flowActionId: p
			.char('flow_action_id', { length: id_length })
			.notNull()
			.references(() => flowActions.id, { onDelete: 'cascade' }),
		skillId: p
			.char('skill_id', { length: id_length })
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		order: p.integer('order').notNull().default(0),
		trace: p.jsonb('trace').$type<Record<string, unknown>>()
	},
	(t) => [p.primaryKey({ columns: [t.flowActionId, t.skillId] })]
);

// ---------------------------------------------------------------------------
// input sources — templates (library) + instances (bound to template_action)
// ---------------------------------------------------------------------------

export const inputSourceTemplates = p.pgTable(
	'input_source_templates',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		kind: inputSourceKindEnum('kind').notNull(),
		name: p.text('name').notNull(),
		slug: p.text('slug').notNull(),
		description: p.text('description').notNull().default(''),
		// JSON Schema describing required config keys (path, url, auth, ...)
		configSchema: p.jsonb('config_schema').$type<Record<string, unknown>>().notNull().default({}),
		defaults: p.jsonb('defaults').$type<Record<string, unknown>>().notNull().default({}),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('isrc_tmpl_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('isrc_tmpl_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

export const inputSources = p.pgTable('input_sources', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	templateActionId: p
		.char('template_action_id', { length: id_length })
		.notNull()
		.references(() => templateActions.id, { onDelete: 'cascade' }),
	sourceTemplateId: p
		.char('source_template_id', { length: id_length })
		.notNull()
		.references(() => inputSourceTemplates.id),
	name: p.text('name').notNull(),
	// validated against sourceTemplate.configSchema
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	order: p.integer('order').notNull().default(0)
});

// Runtime snapshot on flow side
export const flowInputSources = p.pgTable('flow_input_sources', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	flowActionId: p
		.char('flow_action_id', { length: id_length })
		.notNull()
		.references(() => flowActions.id, { onDelete: 'cascade' }),
	inputSourceId: p
		.char('input_source_id', { length: id_length })
		.references(() => inputSources.id, { onDelete: 'set null' }),
	kind: inputSourceKindEnum('kind').notNull(),
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	result: p.jsonb('result').$type<unknown>(),
	fetchedAt: p.timestamp('fetched_at', { withTimezone: true, mode: 'string' })
});

// ---------------------------------------------------------------------------
// execution gates — templates (library) + instances (bound to template_action)
// gates carry a workflow position (pre/post/branch/merge/loop)
// ---------------------------------------------------------------------------

export const executionGateTemplates = p.pgTable(
	'execution_gate_templates',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		kind: executionGateKindEnum('kind').notNull(),
		name: p.text('name').notNull(),
		slug: p.text('slug').notNull(),
		description: p.text('description').notNull().default(''),
		configSchema: p.jsonb('config_schema').$type<Record<string, unknown>>().notNull().default({}),
		defaults: p.jsonb('defaults').$type<Record<string, unknown>>().notNull().default({}),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('gate_tmpl_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('gate_tmpl_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

export const executionGates = p.pgTable('execution_gates', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	templateActionId: p
		.char('template_action_id', { length: id_length })
		.notNull()
		.references(() => templateActions.id, { onDelete: 'cascade' }),
	gateTemplateId: p
		.char('gate_template_id', { length: id_length })
		.notNull()
		.references(() => executionGateTemplates.id),
	name: p.text('name').notNull(),
	position: gatePositionEnum('position').notNull().default('pre'),
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	order: p.integer('order').notNull().default(0)
});

// Runtime state on flow side
export const flowExecutionGates = p.pgTable('flow_execution_gates', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	flowActionId: p
		.char('flow_action_id', { length: id_length })
		.notNull()
		.references(() => flowActions.id, { onDelete: 'cascade' }),
	executionGateId: p
		.char('execution_gate_id', { length: id_length })
		.references(() => executionGates.id, { onDelete: 'set null' }),
	kind: executionGateKindEnum('kind').notNull(),
	position: gatePositionEnum('position').notNull().default('pre'),
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	passed: p.boolean('passed'),
	evaluatedAt: p.timestamp('evaluated_at', { withTimezone: true, mode: 'string' }),
	reason: p.text('reason')
});
