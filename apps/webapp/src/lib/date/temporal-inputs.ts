import { formatDateInput, dateInputToIso } from './format';

/** Local datetime form value; keep the original instant when the draft is unchanged. */
export function localDateTimeInput(value: unknown): string {
	if (!value)
		return '';
	const date = value instanceof Date ? value : new Date(String(value));
	if (!Number.isFinite(date.getTime()))
		return '';
	const pad = (part: number) => String(part).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
export function localDateTimeValue(draft: string, existing?: unknown): string | null {
	if (!draft)
		return null;
	if (draft === localDateTimeInput(existing))
		return existing instanceof Date ? existing.toISOString() : String(existing);
	return new Date(draft).toISOString();
}
export function dateValuePreservingInstant(draft: string, existing?: unknown): string | null {
	if (!draft)
		return null;
	if (draft === formatDateInput(existing))
		return existing instanceof Date ? existing.toISOString() : String(existing);
	return dateInputToIso(draft) ?? null;
}
