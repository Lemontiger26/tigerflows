/**
 * Runtime validation schemas derived from the Drizzle schema.
 * Use these in server actions / API routes to validate incoming data.
 *
 * drizzle-zod generates:
 *   createSelectSchema → full row (all fields required)
 *   createInsertSchema → insert row (defaults/generated fields optional)
 */
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
	users,
	categories,
	templates,
	templateActions,
	flows,
	flowActions,
	tags,
	templateTags,
	enumSets,
	enumValues
} from './schema';

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users, {
	email: (s) => s.email()
});

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export const selectCategorySchema = createSelectSchema(categories);
export const insertCategorySchema = createInsertSchema(categories, {
	name: (s) => s.min(1, 'Name is required'),
	slug: (s) => s.min(1)
});
export const updateCategorySchema = insertCategorySchema.partial().required({ id: true });

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

export const selectTemplateSchema = createSelectSchema(templates);
export const insertTemplateSchema = createInsertSchema(templates, {
	name: (s) => s.min(1, 'Name is required'),
	slug: (s) => s.min(1)
});
export const updateTemplateSchema = insertTemplateSchema.partial().required({ id: true });

// ---------------------------------------------------------------------------
// template_actions
// ---------------------------------------------------------------------------

export const selectTemplateActionSchema = createSelectSchema(templateActions);
export const insertTemplateActionSchema = createInsertSchema(templateActions, {
	title: (s) => s.min(1, 'Title is required'),
	slug: (s) => s.min(1),
	order: (s) => s.int().nonnegative()
});

// ---------------------------------------------------------------------------
// flows
// ---------------------------------------------------------------------------

export const selectFlowSchema = createSelectSchema(flows);
export const insertFlowSchema = createInsertSchema(flows, {
	title: (s) => s.min(1, 'Title is required'),
	slug: (s) => s.min(1)
});
export const updateFlowSchema = insertFlowSchema.partial().required({ id: true });

// ---------------------------------------------------------------------------
// flow_actions
// ---------------------------------------------------------------------------

export const selectFlowActionSchema = createSelectSchema(flowActions);
export const insertFlowActionSchema = createInsertSchema(flowActions, {
	title: (s) => s.min(1, 'Title is required'),
	order: (s) => s.int().nonnegative()
});
export const updateFlowActionSchema = insertFlowActionSchema.partial().required({ id: true });

// ---------------------------------------------------------------------------
// tags
// ---------------------------------------------------------------------------

export const selectTagSchema = createSelectSchema(tags);
export const insertTagSchema = createInsertSchema(tags, {
	name: (s) => s.min(1, 'Name is required'),
	slug: (s) => s.min(1)
});

export const selectTemplateTagSchema = createSelectSchema(templateTags);
export const insertTemplateTagSchema = createInsertSchema(templateTags);

// ---------------------------------------------------------------------------
// enum_sets + enum_values
// ---------------------------------------------------------------------------

export const selectEnumSetSchema = createSelectSchema(enumSets);
export const insertEnumSetSchema = createInsertSchema(enumSets, {
	name: (s) => s.min(1, 'Name is required'),
	slug: (s) => s.min(1)
});
export const updateEnumSetSchema = insertEnumSetSchema.partial().required({ id: true });

export const selectEnumValueSchema = createSelectSchema(enumValues);
export const insertEnumValueSchema = createInsertSchema(enumValues, {
	value: (s) => s.min(1),
	label: (s) => s.min(1),
	order: (s) => s.int().nonnegative()
});

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type UserRow = z.infer<typeof selectUserSchema>;
export type InsertUserRow = z.infer<typeof insertUserSchema>;

export type CategoryRow = z.infer<typeof selectCategorySchema>;
export type InsertCategoryRow = z.infer<typeof insertCategorySchema>;

export type TemplateRow = z.infer<typeof selectTemplateSchema>;
export type InsertTemplateRow = z.infer<typeof insertTemplateSchema>;

export type TemplateActionRow = z.infer<typeof selectTemplateActionSchema>;
export type InsertTemplateActionRow = z.infer<typeof insertTemplateActionSchema>;

export type FlowRow = z.infer<typeof selectFlowSchema>;
export type InsertFlowRow = z.infer<typeof insertFlowSchema>;

export type FlowActionRow = z.infer<typeof selectFlowActionSchema>;
export type InsertFlowActionRow = z.infer<typeof insertFlowActionSchema>;

export type TagRow = z.infer<typeof selectTagSchema>;
export type InsertTagRow = z.infer<typeof insertTagSchema>;

export type EnumSetRow = z.infer<typeof selectEnumSetSchema>;
export type InsertEnumSetRow = z.infer<typeof insertEnumSetSchema>;

export type EnumValueRow = z.infer<typeof selectEnumValueSchema>;
export type InsertEnumValueRow = z.infer<typeof insertEnumValueSchema>;
