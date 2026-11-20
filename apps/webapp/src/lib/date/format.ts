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

function zonedParts(isoOrMs: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hour12: false,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(isoOrMs);
	const value = (type: Intl.DateTimeFormatPartTypes) => {
		const raw = parts.find(part => part.type === type)?.value ?? '0';
		if (type === 'hour' && raw === '24') {
			return 0;
		}
		return Number.parseInt(raw, 10);
	};
	return {
		year: value('year'),
		month: value('month'),
		day: value('day'),
		hour: value('hour'),
		minute: value('minute'),
		second: value('second'),
	};
}

/** Convert a school-local civil date + `HH:MM` into a UTC ISO instant. */
export function civilDateTimeInTimeZoneToIso(
	dateInput: string,
	timeInput: string,
	timeZone: string,
): string {
	const date = dateInput.trim().slice(0, 10);
	const time = timeInput.trim().length === 5 ? `${timeInput.trim()}:00` : timeInput.trim();
	const [year, month, day] = date.split('-').map(value => Number.parseInt(value, 10));
	const [hour, minute, second] = time.split(':').map(value => Number.parseInt(value, 10));
	const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);
	let utcMs = targetUtc;
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const shown = zonedParts(new Date(utcMs), timeZone);
		const shownUtc = Date.UTC(
			shown.year,
			shown.month - 1,
			shown.day,
			shown.hour,
			shown.minute,
			shown.second,
		);
		const delta = targetUtc - shownUtc;
		if (delta === 0) {
			break;
		}
		utcMs += delta;
	}
	return new Date(utcMs).toISOString();
}

/** Split an ISO instant into civil `YYYY-MM-DD` and `HH:MM` in the school time zone. */
export function isoToZonedDateAndTime(iso: string, timeZone: string): { date: string; time: string } {
	const shown = zonedParts(new Date(iso), timeZone);
	return {
		date: `${String(shown.year).padStart(4, '0')}-${String(shown.month).padStart(2, '0')}-${String(shown.day).padStart(2, '0')}`,
		time: `${String(shown.hour).padStart(2, '0')}:${String(shown.minute).padStart(2, '0')}`,
	};
}

export function formatLocaleDate(
	value: string,
	locale: string,
	options: Intl.DateTimeFormatOptions,
): string {
	return parseCivilDate(value).toLocaleDateString(locale, options);
}

/** Persisted event instants retain their time and offset; date-only values are not event timestamps. */
export function formatLocaleTimestamp(value: unknown, locale: string, options: Intl.DateTimeFormatOptions = {}): string | null {
	if (!(value instanceof Date) && (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)))
		return null;
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime()))
		return null;
	return date.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', ...options });
}
