import type { LayoutServerLoad } from './$types';
import { loadFlowData } from '$lib/server/flowData';

export const load: LayoutServerLoad = async () => {
	return {
		flowData: await loadFlowData()
	};
};
