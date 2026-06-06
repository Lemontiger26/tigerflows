/**
 * Application types — single source of truth is the Drizzle schema in db/schema.ts.
 *
 * Raw DB row types (flat, no relations) come from db/validators.ts via drizzle-zod.
 * Composed app-domain types add nested children that the server assembles via joins.
 * UI/computed types (no DB representation) are defined here directly.
 */

// ---------------------------------------------------------------------------
// Re-export raw DB row types
// ---------------------------------------------------------------------------

export type {
	UserRow,
	InsertUserRow,
	TemplateRow,
	InsertTemplateRow,
	TemplateStepRow,
	InsertTemplateStepRow,
	CategoryRow,
	InsertCategoryRow,
	FlowRow,
	InsertFlowRow,
	FlowStepRow,
	InsertFlowStepRow
} from '../db/validators';

// ---------------------------------------------------------------------------
// Composed app-domain types
// The server assembles these from joined queries; stores and components use them.
// ---------------------------------------------------------------------------

import type { TemplateRow, TemplateStepRow, CategoryRow, FlowRow, FlowStepRow } from '../db/validators';

/** Template with its steps + tags pre-loaded (ordered by `order` asc) */
export type Template = TemplateRow & {
	steps: TemplateStepRow[];
	tags: string[]; // tag names for display; server joins through template_tags
};

/** Alias — TemplateStep is just the flat row type */
export type TemplateStep = TemplateStepRow;

/** Category is flat (no nested relations needed at query time) */
export type Category = CategoryRow;

/** Flow with its steps pre-loaded (ordered by `order` asc) */
export type Flow = FlowRow & {
	steps: FlowStepRow[];
};

/** Alias — FlowStep is just the flat row type */
export type FlowStep = FlowStepRow;

// ---------------------------------------------------------------------------
// UI / computed types — no DB table, derived at runtime
// ---------------------------------------------------------------------------

export interface CategoryStats {
	totalFlows: number;
	completedFlows: number;
	abandonedFlows: number;
	averageCompletionPercent: number;
	averageCompletionTimeMs: number | null;
	stepCompletionRates: { stepTitle: string; rate: number }[];
	timelineData: { date: string; count: number; completed: number }[];
}

export interface HistoryFilters {
	categoryId: string | null;
	status: FlowRow['status'] | null;
	dateFrom: string | null;
	dateTo: string | null;
	search: string;
}
