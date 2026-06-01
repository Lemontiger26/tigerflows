import { relations } from 'drizzle-orm';
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
} from './base';
import {
	skills,
	templateActionSkills,
	flowActionSkills,
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
	templateActions: many(templateActions),
	flows: many(flows),
	tags: many(templateTags)
}));

export const templateActionsRelations = relations(templateActions, ({ one, many }) => ({
	template: one(templates, { fields: [templateActions.templateId], references: [templates.id] }),
	flowActions: many(flowActions),
	skills: many(templateActionSkills),
	inputSources: many(inputSources),
	executionGates: many(executionGates)
}));

export const flowsRelations = relations(flows, ({ one, many }) => ({
	user: one(users, { fields: [flows.userId], references: [users.id] }),
	category: one(categories, { fields: [flows.categoryId], references: [categories.id] }),
	template: one(templates, { fields: [flows.templateId], references: [templates.id] }),
	flowActions: many(flowActions)
}));

export const flowActionsRelations = relations(flowActions, ({ one, many }) => ({
	flow: one(flows, { fields: [flowActions.flowId], references: [flows.id] }),
	templateAction: one(templateActions, {
		fields: [flowActions.templateActionId],
		references: [templateActions.id]
	}),
	skills: many(flowActionSkills),
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
	templateActions: many(templateActionSkills),
	flowActions: many(flowActionSkills)
}));

export const templateActionSkillsRelations = relations(templateActionSkills, ({ one }) => ({
	templateAction: one(templateActions, {
		fields: [templateActionSkills.templateActionId],
		references: [templateActions.id]
	}),
	skill: one(skills, { fields: [templateActionSkills.skillId], references: [skills.id] })
}));

export const flowActionSkillsRelations = relations(flowActionSkills, ({ one }) => ({
	flowAction: one(flowActions, {
		fields: [flowActionSkills.flowActionId],
		references: [flowActions.id]
	}),
	skill: one(skills, { fields: [flowActionSkills.skillId], references: [skills.id] })
}));

export const inputSourceTemplatesRelations = relations(inputSourceTemplates, ({ one, many }) => ({
	user: one(users, { fields: [inputSourceTemplates.userId], references: [users.id] }),
	instances: many(inputSources)
}));

export const inputSourcesRelations = relations(inputSources, ({ one, many }) => ({
	templateAction: one(templateActions, {
		fields: [inputSources.templateActionId],
		references: [templateActions.id]
	}),
	sourceTemplate: one(inputSourceTemplates, {
		fields: [inputSources.sourceTemplateId],
		references: [inputSourceTemplates.id]
	}),
	flowInstances: many(flowInputSources)
}));

export const flowInputSourcesRelations = relations(flowInputSources, ({ one }) => ({
	flowAction: one(flowActions, {
		fields: [flowInputSources.flowActionId],
		references: [flowActions.id]
	}),
	inputSource: one(inputSources, {
		fields: [flowInputSources.inputSourceId],
		references: [inputSources.id]
	})
}));

export const executionGateTemplatesRelations = relations(
	executionGateTemplates,
	({ one, many }) => ({
		user: one(users, { fields: [executionGateTemplates.userId], references: [users.id] }),
		instances: many(executionGates)
	})
);

export const executionGatesRelations = relations(executionGates, ({ one, many }) => ({
	templateAction: one(templateActions, {
		fields: [executionGates.templateActionId],
		references: [templateActions.id]
	}),
	gateTemplate: one(executionGateTemplates, {
		fields: [executionGates.gateTemplateId],
		references: [executionGateTemplates.id]
	}),
	flowInstances: many(flowExecutionGates)
}));

export const flowExecutionGatesRelations = relations(flowExecutionGates, ({ one }) => ({
	flowAction: one(flowActions, {
		fields: [flowExecutionGates.flowActionId],
		references: [flowActions.id]
	}),
	executionGate: one(executionGates, {
		fields: [flowExecutionGates.executionGateId],
		references: [executionGates.id]
	})
}));
