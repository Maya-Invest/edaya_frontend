import type { ListEntityTableColumn } from './list-entity-table-types';

export function availableTableColumns(columns: readonly ListEntityTableColumn[]) {
	return columns.filter(column => column.available !== false);
}
export function resolveTableColumnKeys(columns: readonly ListEntityTableColumn[], saved?: readonly string[] | null): string[] {
	const available = availableTableColumns(columns);
	const identity = available.find(column => column.key !== 'actions')?.key;
	const selected = available.filter(column => column.key === 'actions' || column.key === identity || column.required || (saved ? saved.includes(column.key) : column.defaultVisible !== false));
	return [...selected.filter(column => column.key !== 'actions'), ...selected.filter(column => column.key === 'actions')].map(column => column.key);
}
export function tableColumnStorageKey(user: string, school: string, list: string) {
	return `edaya:table-columns:v1:${encodeURIComponent(user)}:${encodeURIComponent(school)}:${encodeURIComponent(list)}`;
}
export function loadTableColumnKeys(key: string): string[] | null {
	try {
		if (typeof localStorage === 'undefined')
			return null;
		const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
		return saved && typeof saved === 'object' && 'version' in saved && saved.version === 1 && 'keys' in saved && Array.isArray(saved.keys) && saved.keys.every((key: unknown) => typeof key === 'string') ? saved.keys : null;
	}
	catch { return null; }
}
export function saveTableColumnKeys(key: string, keys: readonly string[]) {
	try {
		if (typeof localStorage !== 'undefined')
			localStorage.setItem(key, JSON.stringify({ version: 1, keys }));
	}
	catch { /* Browsing remains available when browser storage is disabled. */ }
}
