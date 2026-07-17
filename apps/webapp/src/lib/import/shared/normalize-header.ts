const BOM = '\uFEFF';

export function normalizeHeader(value: string): string {
	return value.replace(new RegExp(`^${BOM}`), '').trim().toLowerCase();
}
