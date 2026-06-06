import { relations } from 'drizzle-orm';
import {
	users,
	categories,
	templates,
	templateSteps,
	flows,
	flowSteps,
	tags,
	templateTags,
	enumSets,
	enumValues
} from './base';
import {
	skills,
	templateStepSkills,
	flowStepSkills,
	inputSourceTemplates,
	inputSources,
	flowInputSources,
	executionGateTemplates,
	executionGates,
	flowExecutionGates
} from './agentic';

export const usersRelations = relations(users, ({ many }) => ({
	categories: many(categories),
	templates: many(templates),
	flows: many(flows),
	tags: many(tags),
	enumSets: many(enumSets),
	skills: many(skills),
	inputSourceTemplates: many(inputSourceTemplates),
	executionGateTemplates: many(executionGateTemplates)
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	user: one(users, { fields: [categories.userId], references: [users.id] }),
	templates: many(templates),
	flows: many(flows)
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
	user: one(users, { fields: [templates.userId], references: [users.id] }),
	category: one(categories, { fields: [templates.categoryId], references: [categories.id] }),
	templateSteps: many(templateSteps),
	flows: many(flows),
	tags: many(templateTags)
}));

export const templateStepsRelations = relations(templateSteps, ({ one, many }) => ({
	template: one(templates, { fields: [templateSteps.templateId], references: [templates.id] }),
	flowSteps: many(flowSteps),
	skills: many(templateStepSkills),
	inputSources: many(inputSources),
	executionGates: many(executionGates)
}));

export const flowsRelations = relations(flows, ({ one, many }) => ({
	user: one(users, { fields: [flows.userId], references: [users.id] }),
	category: one(categories, { fields: [flows.categoryId], references: [categories.id] }),
	template: one(templates, { fields: [flows.templateId], references: [templates.id] }),
	flowSteps: many(flowSteps)
}));

export const flowStepsRelations = relations(flowSteps, ({ one, many }) => ({
	flow: one(flows, { fields: [flowSteps.flowId], references: [flows.id] }),
	templateStep: one(templateSteps, {
		fields: [flowSteps.templateStepId],
		references: [templateSteps.id]
	}),
	skills: many(flowStepSkills),
	inputSources: many(flowInputSources),
	executionGates: many(flowExecutionGates)
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, { fields: [tags.userId], references: [users.id] }),
	templates: many(templateTags)
}));

export const templateTagsRelations = relations(templateTags, ({ one }) => ({
	template: one(templates, { fields: [templateTags.templateId], references: [templates.id] }),
	tag: one(tags, { fields: [templateTags.tagId], references: [tags.id] })
}));

export const enumSetsRelations = relations(enumSets, ({ one, many }) => ({
	user: one(users, { fields: [enumSets.userId], references: [users.id] }),
	values: many(enumValues)
}));

export const enumValuesRelations = relations(enumValues, ({ one }) => ({
	set: one(enumSets, { fields: [enumValues.enumSetId], references: [enumSets.id] })
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
	user: one(users, { fields: [skills.userId], references: [users.id] }),
	templateSteps: many(templateStepSkills),
	flowSteps: many(flowStepSkills)
}));

export const templateStepSkillsRelations = relations(templateStepSkills, ({ one }) => ({
	templateStep: one(templateSteps, {
		fields: [templateStepSkills.templateStepId],
		references: [templateSteps.id]
	}),
	skill: one(skills, { fields: [templateStepSkills.skillId], references: [skills.id] })
}));

export const flowStepSkillsRelations = relations(flowStepSkills, ({ one }) => ({
	flowStep: one(flowSteps, {
		fields: [flowStepSkills.flowStepId],
		references: [flowSteps.id]
	}),
	skill: one(skills, { fields: [flowStepSkills.skillId], references: [skills.id] })
}));

export const inputSourceTemplatesRelations = relations(inputSourceTemplates, ({ one, many }) => ({
	user: one(users, { fields: [inputSourceTemplates.userId], references: [users.id] }),
	instances: many(inputSources)
}));

export const inputSourcesRelations = relations(inputSources, ({ one, many }) => ({
	templateStep: one(templateSteps, {
		fields: [inputSources.templateStepId],
		references: [templateSteps.id]
	}),
	sourceTemplate: one(inputSourceTemplates, {
		fields: [inputSources.sourceTemplateId],
		references: [inputSourceTemplates.id]
	}),
	flowInstances: many(flowInputSources)
}));

export const flowInputSourcesRelations = relations(flowInputSources, ({ one }) => ({
	flowStep: one(flowSteps, {
		fields: [flowInputSources.flowStepId],
		references: [flowSteps.id]
	}),
	inputSource: one(inputSources, {
		fields: [flowInputSources.inputSourceId],
		references: [inputSources.id]
	})
}));

export const executionGateTemplatesRelations = relations(executionGateTemplates, ({ one, many }) => ({
	user: one(users, { fields: [executionGateTemplates.userId], references: [users.id] }),
	instances: many(executionGates)
}));

export const executionGatesRelations = relations(executionGates, ({ one, many }) => ({
	templateStep: one(templateSteps, {
		fields: [executionGates.templateStepId],
		references: [templateSteps.id]
	}),
	gateTemplate: one(executionGateTemplates, {
		fields: [executionGates.gateTemplateId],
		references: [executionGateTemplates.id]
	}),
	flowInstances: many(flowExecutionGates)
}));

export const flowExecutionGatesRelations = relations(flowExecutionGates, ({ one }) => ({
	flowStep: one(flowSteps, {
		fields: [flowExecutionGates.flowStepId],
		references: [flowSteps.id]
	}),
	executionGate: one(executionGates, {
		fields: [flowExecutionGates.executionGateId],
		references: [executionGates.id]
	})
}));
