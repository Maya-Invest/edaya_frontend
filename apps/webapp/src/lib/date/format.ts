export function formatDateInput(value: unknown): string {
	if (!value)
		return '';
	if (value instanceof Date)
		return value.toISOString().slice(0, 10);
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed)
			return '';
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed))
			return trimmed.slice(0, 10);
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime()))
			return parsed.toISOString().slice(0, 10);
	}
	return '';
}

export function dateInputToIso(value: string): string | undefined {
	const trimmed = value.trim();
	if (!trimmed)
		return undefined;
	return new Date(`${trimmed}T12:00:00`).toISOString();
}
