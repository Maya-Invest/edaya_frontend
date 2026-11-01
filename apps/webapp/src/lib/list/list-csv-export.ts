import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

export function csvCell(value: string | number | null | undefined): string {
	const text = String(value ?? '');
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvText(rows: readonly (readonly (string | number)[])[]): string {
	return rows.map(row => row.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]) {
	const blob = new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' });
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}

/** Load every matching row, including pages not yet shown in the list window. */
export async function loadMatchingCollection<T>(input: {
	isComplete: () => boolean;
	ensureComplete: () => Promise<void>;
	current: () => readonly T[];
}): Promise<T[]> {
	if (!input.isComplete()) {
		await input.ensureComplete();
	}
	return [...input.current()];
}

export async function exportMatchingList(input: {
	filename: string;
	headers: readonly string[];
	loadAll: () => Promise<readonly (readonly (string | number)[])[]>;
}): Promise<number> {
	const rows = await input.loadAll();
	downloadCsv(input.filename, [input.headers, ...rows]);
	toast.success(get(t)('list.exportedCount', { n: rows.length }));
	return rows.length;
}
