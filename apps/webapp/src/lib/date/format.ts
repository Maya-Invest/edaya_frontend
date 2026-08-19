/** Parse an API or form `YYYY-MM-DD` value as local noon to avoid UTC midnight day shifts. */
export function parseCivilDate(value: string): Date {
	return new Date(`${value.trim().slice(0, 10)}T12:00:00`);
}

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

export function nowIso(): string {
	return new Date().toISOString();
}

export function todayDateInput(): string {
	return nowIso().slice(0, 10);
}

/** Clamp a `YYYY-MM-DD` value into `[start, end]` (inclusive). Empty bounds are ignored. */
export function clampDateInput(value: string, start = '', end = ''): string {
	const date = formatDateInput(value) || todayDateInput();
	const min = formatDateInput(start);
	const max = formatDateInput(end);
	if (min && date < min) {
		return min;
	}
	if (max && date > max) {
		return max;
	}
	return date;
}

export function inClassAssessmentWindow(dateInput: string): { startsAt: string; endsAt: string } {
	const [year, month, day] = dateInput.slice(0, 10).split('-').map(value => Number.parseInt(value, 10));
	const startsAt = new Date(Date.UTC(year, month - 1, day, 9, 0, 0, 0));
	const endsAt = new Date(Date.UTC(year, month - 1, day, 10, 0, 0, 0));
	return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

export function formatLocaleDate(
	value: string,
	locale: string,
	options: Intl.DateTimeFormatOptions,
): string {
	return parseCivilDate(value).toLocaleDateString(locale, options);
}
