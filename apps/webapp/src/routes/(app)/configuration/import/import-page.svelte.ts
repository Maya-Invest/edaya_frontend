import type { ImportPageSlice } from './lib/import-helpers';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { queryImportListPage } from './lib/import-queries';

const IMPORT_VERSION_FAMILIES = [] as const;

const IMPORT_PAGE_STATE_KEY = Symbol('import-page-state');

export type { ImportPageSlice };

export class ImportPageState {
	slice = $state<ImportPageSlice | null>(null);
	importModalOpen = $state(false);

	private readonly versions = new RouteVersionSnapshot(IMPORT_VERSION_FAMILIES);

	applySlice(data: ImportPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	queryListPage() {
		return queryImportListPage(this);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		this.applySlice({ ready: true });
	}
}

export function setImportPageState(state: ImportPageState) {
	setContext(IMPORT_PAGE_STATE_KEY, state);
}

export function getImportPageState() {
	return getContext<ImportPageState>(IMPORT_PAGE_STATE_KEY);
}
