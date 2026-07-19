import type { ImportPageSlice } from './lib/import-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { queryToolsListPage } from './lib/tools-queries';
import { TimetablePlanningPageState } from './timetable-planning-page.svelte';

const TOOLS_VERSION_FAMILIES = [] as const;

const TOOLS_PAGE_STATE_KEY = Symbol('tools-page-state');

export type { ImportPageSlice };

export class ToolsPageState {
	slice = $state<ImportPageSlice | null>(null);
	importModalOpen = $state(false);
	timetablePlanningModalOpen = $state(false);
	readonly planningPage = new TimetablePlanningPageState();

	private readonly versions = new RouteVersionSnapshot(TOOLS_VERSION_FAMILIES);

	applySlice(data: ImportPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	queryListPage() {
		return queryToolsListPage(this);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		this.applySlice({ ready: true });
	}
}

export function setToolsPageState(state: ToolsPageState) {
	setContext(TOOLS_PAGE_STATE_KEY, state);
}

export function getToolsPageState() {
	return getContext<ToolsPageState>(TOOLS_PAGE_STATE_KEY);
}
