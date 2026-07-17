import { clampCardColumnsPerRow } from '$lib/list/list-entity-card-layout';

export function loadCardColumnsPreference(key: string, fallback = 3): number {
	if (typeof localStorage === 'undefined') {
		return fallback;
	}
	const raw = localStorage.getItem(key);
	if (!raw) {
		return fallback;
	}
	const parsed = Number(raw);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	return clampCardColumnsPerRow(parsed);
}

export function saveCardColumnsPreference(key: string, columnsPerRow: number) {
	if (typeof localStorage === 'undefined') {
		return;
	}
	localStorage.setItem(key, String(clampCardColumnsPerRow(columnsPerRow)));
}
