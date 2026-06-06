import * as s from 'drizzle-orm/sqlite-core';
import { executorTypeValues, flowStatusValues, idLength, nowIso, stepTypeValues, tigerid } from './shared';

// All timestamp columns are stored as ISO-8601 strings. Drizzle runtime
// defaults keep this consistent across local file and remote Turso clients.

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = s.sqliteTable('users', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	authId: s.text('auth_id').notNull().unique(),
	email: s.text('email').notNull(),
	createdAt: s.text('created_at').notNull().$defaultFn(nowIso),
	updatedAt: s.text('updated_at').notNull().$defaultFn(nowIso)
});

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export const categories = s.sqliteTable(
	'categories',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: s.text('name').notNull(),
		description: s.text('description').notNull().default(''),
		color: s.text('color').notNull().default('primary'),
		slug: s.text('slug').notNull(),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso),
		updatedAt: s.text('updated_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('categories_user_slug_idx').on(t.userId, t.slug)]
);

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

export const templates = s.sqliteTable(
	'templates',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		categoryId: s.text('category_id', { length: idLength }).references(() => categories.id, {
			onDelete: 'set null'
		}),
		name: s.text('name').notNull(),
		description: s.text('description').notNull().default(''),
		slug: s.text('slug').notNull(),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso),
		updatedAt: s.text('updated_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('templates_user_slug_idx').on(t.userId, t.slug)]
);

// ---------------------------------------------------------------------------
// template_steps
// ---------------------------------------------------------------------------

export const templateSteps = s.sqliteTable('template_steps', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	templateId: s
		.text('template_id', { length: idLength })
		.notNull()
		.references(() => templates.id, { onDelete: 'cascade' }),
	slug: s.text('slug').notNull(),
	order: s.integer('order').notNull(),
	title: s.text('title').notNull(),
	description: s.text('description').notNull().default(''),
	stepType: s.text('step_type', { enum: stepTypeValues }).notNull().default('boolean'),
	executorType: s.text('executor_type', { enum: executorTypeValues }).notNull().default('human'),
	// type-specific config: { min,max,step } | { enumSetId } | { agent hints }
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	isCritical: s.integer('is_critical', { mode: 'boolean' }).notNull().default(false),
	embeddings: s.blob('embeddings', { mode: 'buffer' })
});

// ---------------------------------------------------------------------------
// flows
// ---------------------------------------------------------------------------

export const flows = s.sqliteTable(
	'flows',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		categoryId: s.text('category_id', { length: idLength }).references(() => categories.id, {
			onDelete: 'set null'
		}),
		templateId: s
			.text('template_id', { length: idLength })
			.notNull()
			.references(() => templates.id),
		title: s.text('title').notNull(),
		status: s.text('status', { enum: flowStatusValues }).notNull().default('active'),
		slug: s.text('slug').notNull(),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso),
		updatedAt: s.text('updated_at').notNull().$defaultFn(nowIso),
		completedAt: s.text('completed_at')
	},
	(t) => [s.uniqueIndex('flows_user_slug_idx').on(t.userId, t.slug)]
);

// ---------------------------------------------------------------------------
// flow_steps
// Snapshot template_step data at instantiation so template edits
// don't affect in-progress flows. Stores typed runtime value.
// ---------------------------------------------------------------------------

export const flowSteps = s.sqliteTable('flow_steps', {
	id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
	flowId: s
		.text('flow_id', { length: idLength })
		.notNull()
		.references(() => flows.id, { onDelete: 'cascade' }),
	templateStepId: s
		.text('template_step_id', { length: idLength })
		.notNull()
		.references(() => templateSteps.id),
	order: s.integer('order').notNull(),
	title: s.text('title').notNull(),
	description: s.text('description').notNull().default(''),
	stepType: s.text('step_type', { enum: stepTypeValues }).notNull().default('boolean'),
	executorType: s.text('executor_type', { enum: executorTypeValues }).notNull().default('human'),
	config: s.text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
	isCritical: s.integer('is_critical', { mode: 'boolean' }).notNull().default(false),
	checked: s.integer('checked', { mode: 'boolean' }).notNull().default(false),
	// typed answer: bool | str | num | ISO date | enum value id(s)
	value: s.text('value', { mode: 'json' }).$type<unknown>(),
	checkedAt: s.text('checked_at'),
	comment: s.text('comment').notNull().default(''),
	embeddings: s.blob('embeddings', { mode: 'buffer' })
});

// ---------------------------------------------------------------------------
// tags — SQL + embeddings, m:n with templates
// ---------------------------------------------------------------------------

export const tags = s.sqliteTable(
	'tags',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: s.text('name').notNull(),
		slug: s.text('slug').notNull(),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('tags_user_slug_idx').on(t.userId, t.slug)]
);

export const templateTags = s.sqliteTable(
	'template_tags',
	{
		templateId: s
			.text('template_id', { length: idLength })
			.notNull()
			.references(() => templates.id, { onDelete: 'cascade' }),
		tagId: s
			.text('tag_id', { length: idLength })
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [s.primaryKey({ columns: [t.templateId, t.tagId] })]
);

// ---------------------------------------------------------------------------
// user-defined enums (for enum_single / enum_multi step types)
// ---------------------------------------------------------------------------

export const enumSets = s.sqliteTable(
	'enum_sets',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		userId: s
			.text('user_id', { length: idLength })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: s.text('name').notNull(),
		slug: s.text('slug').notNull(),
		description: s.text('description').notNull().default(''),
		embeddings: s.blob('embeddings', { mode: 'buffer' }),
		createdAt: s.text('created_at').notNull().$defaultFn(nowIso)
	},
	(t) => [s.uniqueIndex('enum_sets_user_slug_idx').on(t.userId, t.slug)]
);

export const enumValues = s.sqliteTable(
	'enum_values',
	{
		id: s.text('id', { length: idLength }).primaryKey().$defaultFn(tigerid),
		enumSetId: s
			.text('enum_set_id', { length: idLength })
			.notNull()
			.references(() => enumSets.id, { onDelete: 'cascade' }),
		value: s.text('value').notNull(),
		label: s.text('label').notNull(),
		color: s.text('color'),
		order: s.integer('order').notNull().default(0)
	},
	(t) => [s.uniqueIndex('enum_values_set_value_idx').on(t.enumSetId, t.value)]
);
