import { t } from '$lib/i18n';
import { get } from 'svelte/store';

export function listSortAriaValue(
	currentSort: string,
	currentSortDir: string,
	column: string,
): 'ascending' | 'descending' | 'none' {
	if (currentSort !== column) {
		return 'none';
	}
	return currentSortDir === 'asc' ? 'ascending' : 'descending';
}

export function listSortButtonLabel(
	currentSort: string,
	currentSortDir: string,
	column: string,
	label: string,
): string {
	const direction = listSortAriaValue(currentSort, currentSortDir, column);
	if (direction === 'none') {
		return label;
	}
	return `${label}, ${direction === 'ascending' ? get(t)('list.sortAscending') : get(t)('list.sortDescending')}`;
}
