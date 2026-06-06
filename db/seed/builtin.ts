import { slugify } from '$lib/helpers/slugify';
import type { Template, Category, Flow } from '~types';
import { SYSTEM_USER_ID } from '../schema/shared';

// ─── Templates ────────────────────────────────────────────────────────────────

const dailyStandupTemplateId = 'tpl-daily-standup';
const incidentResponseTemplateId = 'tpl-incident-response';
const releaseChecklistTemplateId = 'tpl-release-checklist';

function makeTemplateStep(
	id: string,
	order: number,
	title: string,
	description: string,
	isCritical: boolean,
	templateId: string
) {
	return {
		id,
		templateId,
		slug: slugify(title),
		order,
		title,
		description,
		stepType: 'boolean' as const,
		executorType: 'human' as const,
		config: {},
		isCritical,
		embeddings: null
	};
}

const dailyStandupSteps = [
	makeTemplateStep(
		'tpl-step-daily-ticket-status',
		0,
		'Check ticket status',
		'Review your assigned tickets and update status.',
		true,
		dailyStandupTemplateId
	),
	makeTemplateStep(
		'tpl-step-daily-blockers',
		1,
		'Blockers',
		'Identify any blockers preventing progress.',
		true,
		dailyStandupTemplateId
	),
	makeTemplateStep(
		'tpl-step-daily-parking-lot',
		2,
		'Parking lot',
		'Note any topics to revisit later.',
		false,
		dailyStandupTemplateId
	),
	makeTemplateStep(
		'tpl-step-daily-next-steps',
		3,
		'Next steps',
		'Capture concrete next steps from yesterday.',
		false,
		dailyStandupTemplateId
	),
	makeTemplateStep(
		'tpl-step-daily-notes',
		4,
		'Notes',
		'Any miscellaneous notes for the team.',
		false,
		dailyStandupTemplateId
	)
];

const incidentResponseSteps = [
	makeTemplateStep(
		'tpl-step-incident-detect',
		0,
		'Detect',
		'Identify that an incident has occurred.',
		true,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-assess-severity',
		1,
		'Assess severity',
		'Determine impact scope and severity level.',
		true,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-notify',
		2,
		'Notify',
		'Alert relevant stakeholders and on-call team.',
		true,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-mitigate',
		3,
		'Mitigate',
		'Take immediate action to limit damage.',
		true,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-resolve',
		4,
		'Resolve',
		'Implement the fix or workaround.',
		true,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-document',
		5,
		'Document',
		'Record timeline, impact, and resolution details.',
		false,
		incidentResponseTemplateId
	),
	makeTemplateStep(
		'tpl-step-incident-postmortem',
		6,
		'Post-mortem',
		'Schedule and conduct a blameless review.',
		false,
		incidentResponseTemplateId
	)
];

const releaseChecklistSteps = [
	makeTemplateStep(
		'tpl-step-release-code-freeze',
		0,
		'Code freeze',
		'Confirm no new features or breaking changes are being merged.',
		true,
		releaseChecklistTemplateId
	),
	makeTemplateStep(
		'tpl-step-release-smoke-tests',
		1,
		'Smoke tests',
		'Run the automated smoke test suite and verify all pass.',
		true,
		releaseChecklistTemplateId
	),
	makeTemplateStep(
		'tpl-step-release-migration',
		2,
		'Migration',
		'Apply any pending database migrations in staging.',
		true,
		releaseChecklistTemplateId
	),
	makeTemplateStep(
		'tpl-step-release-deploy',
		3,
		'Deploy',
		'Deploy to production following the deployment runbook.',
		true,
		releaseChecklistTemplateId
	),
	makeTemplateStep(
		'tpl-step-release-verify',
		4,
		'Verify',
		'Confirm the release is healthy via dashboards and sanity checks.',
		true,
		releaseChecklistTemplateId
	),
	makeTemplateStep(
		'tpl-step-release-rollback-plan',
		5,
		'Rollback plan',
		'Document the rollback procedure in case of regression.',
		false,
		releaseChecklistTemplateId
	)
];

export const seedTemplates: Template[] = [
	{
		id: dailyStandupTemplateId,
		userId: SYSTEM_USER_ID,
		categoryId: null,
		name: 'Daily Standup Checklist',
		description: 'A concise checklist to guide productive daily standup meetings.',
		steps: dailyStandupSteps,
		tags: ['daily', 'team', 'meeting'],
		slug: slugify('Daily Standup Checklist'),
		embeddings: null,
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: incidentResponseTemplateId,
		userId: SYSTEM_USER_ID,
		categoryId: null,
		name: 'Incident Response Runbook',
		description: 'Step-by-step runbook for detecting, assessing, and resolving production incidents.',
		steps: incidentResponseSteps,
		tags: ['ops', 'incident', 'on-call'],
		slug: slugify('Incident Response Runbook'),
		embeddings: null,
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: releaseChecklistTemplateId,
		userId: SYSTEM_USER_ID,
		categoryId: null,
		name: 'Release Checklist',
		description: 'Pre- and post-release validation steps to ensure safe deployments.',
		steps: releaseChecklistSteps,
		tags: ['release', 'deployment', 'devops'],
		slug: slugify('Release Checklist'),
		embeddings: null,
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	}
];

// ─── Categories ───────────────────────────────────────────────────────────────

const operationsCategoryId = 'cat-operations';
const devopsCategoryId = 'cat-devops';

export const seedCategories: Category[] = [
	{
		id: operationsCategoryId,
		userId: SYSTEM_USER_ID,
		name: 'Operations',
		description: 'Daily standup logs and team routine tracking.',
		color: 'primary',
		slug: slugify('Operations'),
		embeddings: null,
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: devopsCategoryId,
		userId: SYSTEM_USER_ID,
		name: 'Dev Ops',
		description: 'Production incidents and crisis response logs.',
		color: 'error',
		slug: slugify('Dev Ops'),
		embeddings: null,
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	}
];

// ─── Flows ────────────────────────────────────────────────────────────────────

function makeFlowStep(
	id: string,
	flowId: string,
	templateStep: (typeof dailyStandupSteps)[number],
	checked = false,
	checkedAt: string | null = null,
	comment = ''
) {
	return {
		id,
		flowId,
		templateStepId: templateStep.id,
		order: templateStep.order,
		title: templateStep.title,
		description: templateStep.description,
		stepType: 'boolean' as const,
		executorType: 'human' as const,
		config: {},
		isCritical: templateStep.isCritical,
		checked,
		value: null,
		checkedAt,
		comment,
		embeddings: null
	};
}

const f1id = 'flow-daily-2026-04-11';
const f1Created = '2026-04-11T09:00:00.000Z';
const f1Completed = '2026-04-11T09:08:00.000Z';
const f2id = 'flow-daily-2026-04-12';
const f2Created = '2026-04-12T09:00:00.000Z';
const f2Completed = '2026-04-12T09:12:00.000Z';
const f3id = 'flow-daily-2026-04-13';
const f3Created = '2026-04-13T09:00:00.000Z';
const f4id = 'flow-incident-db-pool';
const f4Created = '2026-04-11T14:30:00.000Z';
const f4Completed = '2026-04-11T15:45:00.000Z';
const f5id = 'flow-incident-auth-degradation';
const f5Created = '2026-04-09T16:00:00.000Z';

export const seedFlows: Flow[] = [
	{
		id: f1id,
		userId: SYSTEM_USER_ID,
		categoryId: operationsCategoryId,
		templateId: dailyStandupTemplateId,
		title: 'Daily Log — Friday Apr 11',
		status: 'completed',
		slug: slugify('Daily Log — Friday Apr 11'),
		embeddings: null,
		steps: dailyStandupSteps.map((a) =>
			a.isCritical
				? makeFlowStep(`${f1id}-${a.slug}`, f1id, a, true, '2026-04-11T09:04:00.000Z')
				: makeFlowStep(`${f1id}-${a.slug}`, f1id, a, false)
		),
		createdAt: f1Created,
		updatedAt: f1Completed,
		completedAt: f1Completed
	},
	{
		id: f2id,
		userId: SYSTEM_USER_ID,
		categoryId: operationsCategoryId,
		templateId: dailyStandupTemplateId,
		title: 'Daily Log — Saturday Apr 12',
		status: 'completed',
		slug: slugify('Daily Log — Saturday Apr 12'),
		embeddings: null,
		steps: dailyStandupSteps.map((a) => makeFlowStep(`${f2id}-${a.slug}`, f2id, a, true, '2026-04-12T09:10:00.000Z')),
		createdAt: f2Created,
		updatedAt: f2Completed,
		completedAt: f2Completed
	},
	{
		id: f3id,
		userId: SYSTEM_USER_ID,
		categoryId: operationsCategoryId,
		templateId: dailyStandupTemplateId,
		title: 'Daily Log — Sunday Apr 13',
		status: 'active',
		slug: slugify('Daily Log — Sunday Apr 13'),
		embeddings: null,
		steps: [
			makeFlowStep(
				`${f3id}-${dailyStandupSteps[0].slug}`,
				f3id,
				dailyStandupSteps[0],
				true,
				'2026-04-13T09:02:00.000Z'
			),
			makeFlowStep(
				`${f3id}-${dailyStandupSteps[1].slug}`,
				f3id,
				dailyStandupSteps[1],
				true,
				'2026-04-13T09:03:00.000Z'
			),
			makeFlowStep(`${f3id}-${dailyStandupSteps[2].slug}`, f3id, dailyStandupSteps[2]),
			makeFlowStep(`${f3id}-${dailyStandupSteps[3].slug}`, f3id, dailyStandupSteps[3]),
			makeFlowStep(`${f3id}-${dailyStandupSteps[4].slug}`, f3id, dailyStandupSteps[4])
		],
		createdAt: f3Created,
		updatedAt: f3Created,
		completedAt: null
	},
	{
		id: f4id,
		userId: SYSTEM_USER_ID,
		categoryId: devopsCategoryId,
		templateId: incidentResponseTemplateId,
		title: 'DB connection pool exhaustion',
		status: 'completed',
		slug: slugify('DB connection pool exhaustion'),
		embeddings: null,
		steps: incidentResponseSteps.map((a) => {
			if (a.title === 'Mitigate')
				return makeFlowStep(
					`${f4id}-${a.slug}`,
					f4id,
					a,
					true,
					'2026-04-11T15:40:00.000Z',
					'Scaled up connection pool and added temporary read replica to offload queries.'
				);
			if (a.title === 'Document')
				return makeFlowStep(
					`${f4id}-${a.slug}`,
					f4id,
					a,
					true,
					'2026-04-11T15:40:00.000Z',
					'Incident lasted ~75 min, affected ~12k users. Full timeline documented in Incident Tracker.'
				);
			return makeFlowStep(`${f4id}-${a.slug}`, f4id, a, true, '2026-04-11T14:35:00.000Z');
		}),
		createdAt: f4Created,
		updatedAt: f4Completed,
		completedAt: f4Completed
	},
	{
		id: f5id,
		userId: SYSTEM_USER_ID,
		categoryId: devopsCategoryId,
		templateId: incidentResponseTemplateId,
		title: 'Auth service degradation',
		status: 'abandoned',
		slug: slugify('Auth service degradation'),
		embeddings: null,
		steps: incidentResponseSteps
			.slice(0, 3)
			.map((a) => makeFlowStep(`${f5id}-${a.slug}`, f5id, a, true, '2026-04-09T16:20:00.000Z')),
		createdAt: f5Created,
		updatedAt: '2026-04-09T16:45:00.000Z',
		completedAt: null
	}
];
