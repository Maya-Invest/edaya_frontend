export function csvCell(value: string | number | null | undefined): string {
	const text = String(value ?? '');
	return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadCsv(filename: string, rows: readonly (readonly (string | number)[])[]) {
	const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const href = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = href;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(href);
}
