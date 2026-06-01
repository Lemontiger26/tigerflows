import type { HistoryFilters } from '~types';

const LS_THEME = 'tigerflows:theme';
const LS_SIDEBAR = 'tigerflows:sidebar-expanded';

function getInitialTheme(): 'tigerlight' | 'tigerdark' {
	if (typeof window === 'undefined') return 'tigerlight';
	const stored = localStorage.getItem(LS_THEME);
	if (stored === 'tigerlight' || stored === 'tigerdark') return stored;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'tigerdark' : 'tigerlight';
}

function getInitialSidebar(): boolean {
	if (typeof window === 'undefined') return true;
	const stored = localStorage.getItem(LS_SIDEBAR);
	return stored === null ? true : stored === 'true';
}

function createNavigationStore() {
	let sidebarExpanded = $state<boolean>(getInitialSidebar());
	let searchQuery = $state<string>('');
	let historyFilters = $state<HistoryFilters>({
		categoryId: null,
		status: null,
		dateFrom: null,
		dateTo: null,
		search: ''
	});

	let theme = $state<'tigerlight' | 'tigerdark'>(getInitialTheme());

	return {
		get sidebarExpanded() {
			return sidebarExpanded;
		},
		get searchQuery() {
			return searchQuery;
		},
		get historyFilters() {
			return historyFilters;
		},
		get theme() {
			return theme;
		},

		toggleSidebar() {
			sidebarExpanded = !sidebarExpanded;
			if (typeof localStorage !== 'undefined')
				localStorage.setItem(LS_SIDEBAR, String(sidebarExpanded));
		},

		setTheme(t: 'tigerlight' | 'tigerdark') {
			theme = t;
			if (typeof localStorage !== 'undefined')
				localStorage.setItem(LS_THEME, t);
		},

		setSearchQuery(q: string) {
			searchQuery = q;
		},

		setHistoryFilters(f: Partial<HistoryFilters>) {
			historyFilters = { ...historyFilters, ...f };
		}
	};
}

export const navigationStore = createNavigationStore();
