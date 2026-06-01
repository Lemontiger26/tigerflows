import { tigerid } from '$lib/helpers/tigerId';
import { slugify } from '$lib/helpers/slugify';
import type { Template, Category, Flow } from '~types';

// ─── Templates ────────────────────────────────────────────────────────────────

const t1id = tigerid();
const t2id = tigerid();
const t3id = tigerid();

function makeTemplateAction(
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
		actionType: 'boolean' as const,
		executorType: 'human' as const,
		config: {},
		isCritical,
		embeddings: [] as unknown as number[]
	};
}

const dailyStandupActions = [
	makeTemplateAction(
		tigerid(),
		0,
		'Check ticket status',
		'Review your assigned tickets and update status.',
		true,
		t1id
	),
	makeTemplateAction(tigerid(), 1, 'Blockers', 'Identify any blockers preventing progress.', true, t1id),
	makeTemplateAction(tigerid(), 2, 'Parking lot', 'Note any topics to revisit later.', false, t1id),
	makeTemplateAction(tigerid(), 3, 'Action items', 'Capture concrete next steps from yesterday.', false, t1id),
	makeTemplateAction(tigerid(), 4, 'Notes', 'Any miscellaneous notes for the team.', false, t1id)
];

const incidentResponseActions = [
	makeTemplateAction(tigerid(), 0, 'Detect', 'Identify that an incident has occurred.', true, t2id),
	makeTemplateAction(tigerid(), 1, 'Assess severity', 'Determine impact scope and severity level.', true, t2id),
	makeTemplateAction(tigerid(), 2, 'Notify', 'Alert relevant stakeholders and on-call team.', true, t2id),
	makeTemplateAction(tigerid(), 3, 'Mitigate', 'Take immediate action to limit damage.', true, t2id),
	makeTemplateAction(tigerid(), 4, 'Resolve', 'Implement the fix or workaround.', true, t2id),
	makeTemplateAction(tigerid(), 5, 'Document', 'Record timeline, impact, and resolution details.', false, t2id),
	makeTemplateAction(tigerid(), 6, 'Post-mortem', 'Schedule and conduct a blameless review.', false, t2id)
];

const releaseChecklistActions = [
	makeTemplateAction(
		tigerid(),
		0,
		'Code freeze',
		'Confirm no new features or breaking changes are being merged.',
		true,
		t3id
	),
	makeTemplateAction(
		tigerid(),
		1,
		'Smoke tests',
		'Run the automated smoke test suite and verify all pass.',
		true,
		t3id
	),
	makeTemplateAction(tigerid(), 2, 'Migration', 'Apply any pending database migrations in staging.', true, t3id),
	makeTemplateAction(tigerid(), 3, 'Deploy', 'Deploy to production following the deployment runbook.', true, t3id),
	makeTemplateAction(
		tigerid(),
		4,
		'Verify',
		'Confirm the release is healthy via dashboards and sanity checks.',
		true,
		t3id
	),
	makeTemplateAction(
		tigerid(),
		5,
		'Rollback plan',
		'Document the rollback procedure in case of regression.',
		false,
		t3id
	)
];

export const seedTemplates: Template[] = [
	{
		id: t1id,
		userId: null,
		categoryId: null,
		name: 'Daily Standup Checklist',
		description: 'A concise checklist to guide productive daily standup meetings.',
		actions: dailyStandupActions,
		tags: ['daily', 'team', 'meeting'],
		slug: slugify('Daily Standup Checklist'),
		embeddings: [] as number[],
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: t2id,
		userId: null,
		categoryId: null,
		name: 'Incident Response Runbook',
		description: 'Step-by-step runbook for detecting, assessing, and resolving production incidents.',
		actions: incidentResponseActions,
		tags: ['ops', 'incident', 'on-call'],
		slug: slugify('Incident Response Runbook'),
		embeddings: [] as number[],
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: t3id,
		userId: null,
		categoryId: null,
		name: 'Release Checklist',
		description: 'Pre- and post-release validation steps to ensure safe deployments.',
		actions: releaseChecklistActions,
		tags: ['release', 'deployment', 'devops'],
		slug: slugify('Release Checklist'),
		embeddings: [] as number[],
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	}
];

// ─── Categories ───────────────────────────────────────────────────────────────

const c1id = tigerid();
const c2id = tigerid();

export const seedCategories: Category[] = [
	{
		id: c1id,
		userId: null,
		name: 'Operations',
		description: 'Daily standup logs and team routine tracking.',
		color: 'primary',
		slug: slugify('Operations'),
		embeddings: [] as number[],
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	},
	{
		id: c2id,
		userId: null,
		name: 'Dev Ops',
		description: 'Production incidents and crisis response logs.',
		color: 'error',
		slug: slugify('Dev Ops'),
		embeddings: [] as number[],
		createdAt: '2026-04-01T08:00:00.000Z',
		updatedAt: '2026-04-01T08:00:00.000Z'
	}
];

// ─── Flows ────────────────────────────────────────────────────────────────────

function makeFlowAction(
	templateAction: (typeof dailyStandupActions)[number],
	checked = false,
	checkedAt: string | null = null,
	comment = ''
) {
	return {
		id: tigerid(),
		flowId: '', // filled in when the flow is built
		templateActionId: templateAction.id,
		order: templateAction.order,
		title: templateAction.title,
		description: templateAction.description,
		actionType: 'boolean' as const,
		executorType: 'human' as const,
		config: {},
		isCritical: templateAction.isCritical,
		checked,
		value: null,
		checkedAt,
		comment,
		embeddings: [] as unknown as number[]
	};
}

const f1id = tigerid();
const f1Created = '2026-04-11T09:00:00.000Z';
const f1Completed = '2026-04-11T09:08:00.000Z';
const f2id = tigerid();
const f2Created = '2026-04-12T09:00:00.000Z';
const f2Completed = '2026-04-12T09:12:00.000Z';
const f3id = tigerid();
const f3Created = '2026-04-13T09:00:00.000Z';
const f4id = tigerid();
const f4Created = '2026-04-11T14:30:00.000Z';
const f4Completed = '2026-04-11T15:45:00.000Z';
const f5id = tigerid();
const f5Created = '2026-04-09T16:00:00.000Z';

export const seedFlows: Flow[] = [
	{
		id: f1id,
		userId: null,
		categoryId: c1id,
		templateId: t1id,
		title: 'Daily Log — Friday Apr 11',
		status: 'completed',
		slug: slugify('Daily Log — Friday Apr 11'),
		embeddings: [] as number[],
		actions: dailyStandupActions.map((a) =>
			a.isCritical ? makeFlowAction(a, true, '2026-04-11T09:04:00.000Z') : makeFlowAction(a, false)
		),
		createdAt: f1Created,
		updatedAt: f1Completed,
		completedAt: f1Completed
	},
	{
		id: f2id,
		userId: null,
		categoryId: c1id,
		templateId: t1id,
		title: 'Daily Log — Saturday Apr 12',
		status: 'completed',
		slug: slugify('Daily Log — Saturday Apr 12'),
		embeddings: [] as number[],
		actions: dailyStandupActions.map((a) => makeFlowAction(a, true, '2026-04-12T09:10:00.000Z')),
		createdAt: f2Created,
		updatedAt: f2Completed,
		completedAt: f2Completed
	},
	{
		id: f3id,
		userId: null,
		categoryId: c1id,
		templateId: t1id,
		title: 'Daily Log — Sunday Apr 13',
		status: 'active',
		slug: slugify('Daily Log — Sunday Apr 13'),
		embeddings: [] as number[],
		actions: [
			makeFlowAction(dailyStandupActions[0], true, '2026-04-13T09:02:00.000Z'),
			makeFlowAction(dailyStandupActions[1], true, '2026-04-13T09:03:00.000Z'),
			makeFlowAction(dailyStandupActions[2]),
			makeFlowAction(dailyStandupActions[3]),
			makeFlowAction(dailyStandupActions[4])
		],
		createdAt: f3Created,
		updatedAt: f3Created,
		completedAt: null
	},
	{
		id: f4id,
		userId: null,
		categoryId: c2id,
		templateId: t2id,
		title: 'DB connection pool exhaustion',
		status: 'completed',
		slug: slugify('DB connection pool exhaustion'),
		embeddings: [] as number[],
		actions: incidentResponseActions.map((a) => {
			if (a.title === 'Mitigate')
				return makeFlowAction(
					a,
					true,
					'2026-04-11T15:40:00.000Z',
					'Scaled up connection pool and added temporary read replica to offload queries.'
				);
			if (a.title === 'Document')
				return makeFlowAction(
					a,
					true,
					'2026-04-11T15:40:00.000Z',
					'Incident lasted ~75 min, affected ~12k users. Full timeline documented in Incident Tracker.'
				);
			return makeFlowAction(a, true, '2026-04-11T14:35:00.000Z');
		}),
		createdAt: f4Created,
		updatedAt: f4Completed,
		completedAt: f4Completed
	},
	{
		id: f5id,
		userId: null,
		categoryId: c2id,
		templateId: t2id,
		title: 'Auth service degradation',
		status: 'abandoned',
		slug: slugify('Auth service degradation'),
		embeddings: [] as number[],
		actions: incidentResponseActions.slice(0, 3).map((a) => makeFlowAction(a, true, '2026-04-09T16:20:00.000Z')),
		createdAt: f5Created,
		updatedAt: '2026-04-09T16:45:00.000Z',
		completedAt: null
	}
];
