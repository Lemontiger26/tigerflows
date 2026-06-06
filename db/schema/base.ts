import { customAlphabet } from 'nanoid';
import { nolookalikes } from 'nanoid-dictionary';
import * as p from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import defaults from '@src/config/defaults';

const id_length = defaults.id_length;
const tigerid = customAlphabet(nolookalikes, id_length);

// All p.timestamp columns use mode:'string' so Drizzle returns/accepts ISO-8601
// strings instead of Date objects. Keeps types consistent with JSON
// serialization in SvelteKit load() functions and localStorage stores.

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const flowStatusEnum = p.pgEnum('flow_status', ['active', 'completed', 'abandoned']);

export const stepTypeEnum = p.pgEnum('step_type', [
	'boolean',
	'text',
	'number',
	'date',
	'enum_single',
	'enum_multi',
	'agent'
]);

export const executorTypeEnum = p.pgEnum('executor_type', ['human', 'agent']);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = p.pgTable('users', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	authId: p.text('auth_id').notNull().unique(),
	email: p.text('email').notNull(),
	createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
	updatedAt: p.timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export const categories = p.pgTable(
	'categories',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		name: p.text('name').notNull(),
		description: p.text('description').notNull().default(''),
		color: p.text('color').notNull().default('primary'),
		slug: p.text('slug').notNull(),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
		updatedAt: p.timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('categories_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('categories_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

export const templates = p.pgTable(
	'templates',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		categoryId: p.char('category_id', { length: id_length }).references(() => categories.id, {
			onDelete: 'set null'
		}),
		name: p.text('name').notNull(),
		description: p.text('description').notNull().default(''),
		slug: p.text('slug').notNull(),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
		updatedAt: p.timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('templates_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('templates_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

// ---------------------------------------------------------------------------
// template_steps
// ---------------------------------------------------------------------------

export const templateSteps = p.pgTable('template_steps', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	templateId: p
		.char('template_id', { length: id_length })
		.notNull()
		.references(() => templates.id, { onDelete: 'cascade' }),
	slug: p.text('slug').notNull(),
	order: p.integer('order').notNull(),
	title: p.text('title').notNull(),
	description: p.text('description').notNull().default(''),
	stepType: stepTypeEnum('step_type').notNull().default('boolean'),
	executorType: executorTypeEnum('executor_type').notNull().default('human'),
	// type-specific config: { min,max,step } | { enumSetId } | { agent hints }
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	isCritical: p.boolean('is_critical').notNull().default(false),
	embeddings: p.vector('embeddings', { dimensions: 384 }).notNull()
});

// ---------------------------------------------------------------------------
// flows
// ---------------------------------------------------------------------------

export const flows = p.pgTable(
	'flows',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		categoryId: p.char('category_id', { length: id_length }).references(() => categories.id, {
			onDelete: 'set null'
		}),
		templateId: p
			.char('template_id', { length: id_length })
			.notNull()
			.references(() => templates.id),
		title: p.text('title').notNull(),
		status: flowStatusEnum('status').notNull().default('active'),
		slug: p.text('slug').notNull(),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
		updatedAt: p.timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
		completedAt: p.timestamp('completed_at', { withTimezone: true, mode: 'string' })
	},
	(t) => [p.uniqueIndex('flows_user_slug_idx').on(t.userId, t.slug)]
);

// ---------------------------------------------------------------------------
// flow_steps
// Snapshot template_step data at instantiation so template edits
// don't affect in-progress flows. Stores typed runtime value.
// ---------------------------------------------------------------------------

export const flowSteps = p.pgTable('flow_steps', {
	id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
	flowId: p
		.char('flow_id', { length: id_length })
		.notNull()
		.references(() => flows.id, { onDelete: 'cascade' }),
	templateStepId: p
		.char('template_step_id', { length: id_length })
		.notNull()
		.references(() => templateSteps.id),
	order: p.integer('order').notNull(),
	title: p.text('title').notNull(),
	description: p.text('description').notNull().default(''),
	stepType: stepTypeEnum('step_type').notNull().default('boolean'),
	executorType: executorTypeEnum('executor_type').notNull().default('human'),
	config: p.jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	isCritical: p.boolean('is_critical').notNull().default(false),
	checked: p.boolean('checked').notNull().default(false),
	// typed answer: bool | str | num | ISO date | enum value id(s)
	value: p.jsonb('value').$type<unknown>(),
	checkedAt: p.timestamp('checked_at', { withTimezone: true, mode: 'string' }),
	comment: p.text('comment').notNull().default(''),
	embeddings: p.vector('embeddings', { dimensions: 384 })
});

// ---------------------------------------------------------------------------
// tags — SQL + embeddings, m:n with templates
// ---------------------------------------------------------------------------

export const tags = p.pgTable(
	'tags',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		name: p.text('name').notNull(),
		slug: p.text('slug').notNull(),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('tags_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('tags_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

export const templateTags = p.pgTable(
	'template_tags',
	{
		templateId: p
			.char('template_id', { length: id_length })
			.notNull()
			.references(() => templates.id, { onDelete: 'cascade' }),
		tagId: p
			.char('tag_id', { length: id_length })
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [p.primaryKey({ columns: [t.templateId, t.tagId] })]
);

// ---------------------------------------------------------------------------
// user-defined enums (for enum_single / enum_multi step types)
// ---------------------------------------------------------------------------

export const enumSets = p.pgTable(
	'enum_sets',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		userId: p.char('user_id', { length: id_length }).references(() => users.id, { onDelete: 'cascade' }),
		name: p.text('name').notNull(),
		slug: p.text('slug').notNull(),
		description: p.text('description').notNull().default(''),
		embeddings: p.vector('embeddings', { dimensions: 384 }).notNull(),
		createdAt: p.timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()
	},
	(t) => [
		p.uniqueIndex('enum_sets_user_slug_idx').on(t.userId, t.slug),
		p
			.uniqueIndex('enum_sets_system_slug_idx')
			.on(t.slug)
			.where(sql`${t.userId} IS NULL`)
	]
);

export const enumValues = p.pgTable(
	'enum_values',
	{
		id: p.char('id', { length: id_length }).primaryKey().$defaultFn(tigerid),
		enumSetId: p
			.char('enum_set_id', { length: id_length })
			.notNull()
			.references(() => enumSets.id, { onDelete: 'cascade' }),
		value: p.text('value').notNull(),
		label: p.text('label').notNull(),
		color: p.text('color'),
		order: p.integer('order').notNull().default(0)
	},
	(t) => [p.uniqueIndex('enum_values_set_value_idx').on(t.enumSetId, t.value)]
);
