import type { CategoryStats } from '~types';
import { flowStore } from './flows.svelte';

function createStatsStore() {
	function getCategoryStats(categoryId: string): CategoryStats {
		const flows = flowStore.getByCategory(categoryId);

		const totalFlows = flows.length;
		const completedFlows = flows.filter((f) => f.status === 'completed').length;
		const abandonedFlows = flows.filter((f) => f.status === 'abandoned').length;

		// Average completion percent across all flows
		const completionPercents = flows.map((flow) => {
			if (flow.actions.length === 0) return 0;
			const checked = flow.actions.filter((a) => a.checked).length;
			return (checked / flow.actions.length) * 100;
		});
		const averageCompletionPercent =
			totalFlows > 0
				? completionPercents.reduce((a, b) => a + b, 0) / totalFlows
				: 0;

		// Average completion time for completed flows only
		const completedWithTime = flows
			.filter((f) => f.status === 'completed' && f.completedAt)
			.map((f) => new Date(f.completedAt!).getTime() - new Date(f.createdAt).getTime());
		const averageCompletionTimeMs =
			completedWithTime.length > 0
				? completedWithTime.reduce((a, b) => a + b, 0) / completedWithTime.length
				: null;

		// Action completion rates: for each unique action title, what % are checked
		const actionTitleMap = new Map<string, { total: number; checked: number }>();
		for (const flow of flows) {
			for (const action of flow.actions) {
				if (!actionTitleMap.has(action.title)) {
					actionTitleMap.set(action.title, { total: 0, checked: 0 });
				}
				const entry = actionTitleMap.get(action.title)!;
				entry.total++;
				if (action.checked) entry.checked++;
			}
		}
		const actionCompletionRates = Array.from(actionTitleMap.entries())
			.map(([actionTitle, { total, checked }]) => ({
				actionTitle,
				rate: total > 0 ? (checked / total) * 100 : 0,
			}))
			.sort((a, b) => a.actionTitle.localeCompare(b.actionTitle));

		// Timeline data: last 30 days, { date, count, completed }
		const today = new Date();
		today.setHours(23, 59, 59, 999);
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - 29);
		startDate.setHours(0, 0, 0, 0);

		const timelineData: { date: string; count: number; completed: number }[] = [];
		for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
			const dateStr = d.toISOString().split('T')[0];
			const dayFlows = flows.filter((f) => f.createdAt.split('T')[0] === dateStr);
			timelineData.push({
				date: dateStr,
				count: dayFlows.length,
				completed: dayFlows.filter((f) => f.status === 'completed').length,
			});
		}

		return {
			totalFlows,
			completedFlows,
			abandonedFlows,
			averageCompletionPercent,
			averageCompletionTimeMs,
			actionCompletionRates,
			timelineData,
		};
	}

	return { getCategoryStats };
}

export const statsStore = createStatsStore();
