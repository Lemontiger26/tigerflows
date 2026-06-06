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
	executorTypeValues,
	flowStatusValues,
	users,
	categories,
	templates,
	templateSteps,
	flows,
	flowSteps,
	stepTypeValues,
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
// template_steps
// ---------------------------------------------------------------------------

export const selectTemplateStepSchema = createSelectSchema(templateSteps, {
	stepType: () => z.enum(stepTypeValues),
	executorType: () => z.enum(executorTypeValues)
});
export const insertTemplateStepSchema = createInsertSchema(templateSteps, {
	title: (s) => s.min(1, 'Title is required'),
	slug: (s) => s.min(1),
	order: (s) => s.int().nonnegative(),
	stepType: () => z.enum(stepTypeValues),
	executorType: () => z.enum(executorTypeValues)
});

// ---------------------------------------------------------------------------
// flows
// ---------------------------------------------------------------------------

export const selectFlowSchema = createSelectSchema(flows, {
	status: () => z.enum(flowStatusValues)
});
export const insertFlowSchema = createInsertSchema(flows, {
	title: (s) => s.min(1, 'Title is required'),
	slug: (s) => s.min(1),
	status: () => z.enum(flowStatusValues)
});
export const updateFlowSchema = insertFlowSchema.partial().required({ id: true });

// ---------------------------------------------------------------------------
// flow_steps
// ---------------------------------------------------------------------------

export const selectFlowStepSchema = createSelectSchema(flowSteps, {
	stepType: () => z.enum(stepTypeValues),
	executorType: () => z.enum(executorTypeValues)
});
export const insertFlowStepSchema = createInsertSchema(flowSteps, {
	title: (s) => s.min(1, 'Title is required'),
	order: (s) => s.int().nonnegative(),
	stepType: () => z.enum(stepTypeValues),
	executorType: () => z.enum(executorTypeValues)
});
export const updateFlowStepSchema = insertFlowStepSchema.partial().required({ id: true });

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

export type TemplateStepRow = z.infer<typeof selectTemplateStepSchema>;
export type InsertTemplateStepRow = z.infer<typeof insertTemplateStepSchema>;

export type FlowRow = z.infer<typeof selectFlowSchema>;
export type InsertFlowRow = z.infer<typeof insertFlowSchema>;

export type FlowStepRow = z.infer<typeof selectFlowStepSchema>;
export type InsertFlowStepRow = z.infer<typeof insertFlowStepSchema>;

export type TagRow = z.infer<typeof selectTagSchema>;
export type InsertTagRow = z.infer<typeof insertTagSchema>;

export type EnumSetRow = z.infer<typeof selectEnumSetSchema>;
export type InsertEnumSetRow = z.infer<typeof insertEnumSetSchema>;

export type EnumValueRow = z.infer<typeof selectEnumValueSchema>;
export type InsertEnumValueRow = z.infer<typeof insertEnumValueSchema>;
