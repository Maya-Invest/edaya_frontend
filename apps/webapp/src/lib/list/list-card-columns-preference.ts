import { clampCardColumnsPerRow } from '$lib/list/list-entity-card-layout';
import { readPreference, writePreference } from '$lib/preferences/storage';

export function loadCardColumnsPreference(key: string, fallback = 3): number {
	const raw = readPreference('local', key);
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
	writePreference('local', key, String(clampCardColumnsPerRow(columnsPerRow)));
}
