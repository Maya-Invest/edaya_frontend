import type { PeriodDefinition, PeriodDefinitionDayOfWeek } from '$lib/types/school';

// This is a weekly template, not dated school events. Each weekday is a unit
// column; all times use the same local civil date, never UTC or persisted dates.
export function periodCalendarDate(time = '00:00'): Date {
	const [hours, minutes] = time.split(':').map(Number);
	return new Date(2000, 0, 3, hours, minutes);
}

export function periodCalendarEvent(definition: PeriodDefinition) {
	return {
		id: definition.id,
		text: definition.label,
		start: periodCalendarDate(definition.startTime),
		end: periodCalendarDate(definition.endTime),
		dayOfWeek: definition.dayOfWeek,
		isBreak: definition.isBreak,
		isTeachingSlot: definition.isTeachingSlot,
	};
}

// Unit-column layouts can return sub-minute pointer positions even with
// snapStep configured. Normalize at the adapter boundary as well.
function snapTime(value: Date): Date {
	const snapped = new Date(value);
	snapped.setMinutes(Math.round((snapped.getMinutes() + snapped.getSeconds() / 60 + snapped.getMilliseconds() / 60000) / 5) * 5, 0, 0);
	return snapped;
}

export function snapPeriodCalendarChange(change: Record<string, unknown>): Record<string, unknown> {
	if (!(change.end instanceof Date) || !Number.isFinite(+change.end))
		return change;
	// Moves include both endpoints. Snap the start and retain the duration;
	// resizing includes only the end. Never mutate the vendor's event objects.
	if (change.start instanceof Date && Number.isFinite(+change.start)) {
		const start = snapTime(change.start);
		return { ...change, start, end: new Date(+start + (+change.end - +change.start)) };
	}
	return { ...change, end: snapTime(change.end) };
}

export type PeriodCalendarError = 'invalid' | 'overlap' | 'forbidden' | 'busy' | 'failed' | 'stale';
export type PeriodCalendarResult = { ok: true } | { ok: false; error: PeriodCalendarError; conflict?: string };

type CalendarValidation = { ok: true; definition: PeriodDefinition; changes: PeriodCalendarChanges } | Exclude<PeriodCalendarResult, { ok: true }>;

function minutes(time: string) {
	const [hours, mins] = time.split(':').map(Number);
	return hours * 60 + mins;
}

export type PeriodCalendarChanges = Pick<PeriodDefinition, 'startTime' | 'endTime' | 'dayOfWeek'>;

function validTime(value: unknown): value is Date {
	return value instanceof Date && Number.isFinite(+value)
		&& value.getFullYear() === 2000 && value.getMonth() === 0 && value.getDate() === 3
		&& value.getSeconds() === 0 && value.getMilliseconds() === 0 && value.getMinutes() % 5 === 0;
}

function clockTime(value: Date): string {
	return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function validatePeriodCalendarChange(
	id: string,
	change: Record<string, unknown>,
	definitions: PeriodDefinition[],
): CalendarValidation {
	const definition = definitions.find(item => item.id === id);
	if (!definition)
		return { ok: false, error: 'stale' };
	const start = 'start' in change ? change.start : periodCalendarDate(definition.startTime);
	const end = change.end;
	const dayOfWeek = 'dayOfWeek' in change ? change.dayOfWeek : definition.dayOfWeek;
	if (!validTime(start) || !validTime(end) || +end <= +start
		|| !['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(String(dayOfWeek))) {
		return { ok: false, error: 'invalid' };
	}
	const startTime = clockTime(start);
	const endTime = clockTime(end);
	const conflict = definitions.find(other => other.id !== id
		&& other.schoolId === definition.schoolId && other.academicYearId === definition.academicYearId
		&& other.dayOfWeek === dayOfWeek
		&& minutes(startTime) < minutes(other.endTime)
		&& minutes(endTime) > minutes(other.startTime));
	if (conflict)
		return { ok: false, error: 'overlap', conflict: conflict.label };
	return { ok: true, definition, changes: { startTime, endTime, dayOfWeek: dayOfWeek as PeriodDefinition['dayOfWeek'] } };
}

// Serializes writes and keeps the vendor calendar from becoming the source of
// truth. The UI cancels its internal update; only the successful API save updates
// route data. A rejection or failed request therefore leaves the old slot intact.
export class PeriodCalendarWriter {
	private busy = false;
	constructor(private readonly options: {
		canEdit: () => boolean;
		definitions: () => PeriodDefinition[];
		save: (definition: PeriodDefinition, changes: PeriodCalendarChanges) => Promise<boolean>;
	}) {}

	async update(id: string, change: Record<string, unknown>): Promise<PeriodCalendarResult> {
		if (!this.options.canEdit())
			return { ok: false, error: 'forbidden' };
		if (this.busy)
			return { ok: false, error: 'busy' };
		const checked = validatePeriodCalendarChange(id, change, this.options.definitions());
		if (!checked.ok)
			return checked;
		if (checked.changes.endTime === checked.definition.endTime
			&& checked.changes.startTime === checked.definition.startTime
			&& checked.changes.dayOfWeek === checked.definition.dayOfWeek) {
			return { ok: true };
		}
		this.busy = true;
		try {
			return await this.options.save(checked.definition, checked.changes)
				? { ok: true }
				: { ok: false, error: 'failed' };
		}
		catch {
			return { ok: false, error: 'failed' };
		}
		finally {
			this.busy = false;
		}
	}
}

export interface PeriodDayGroup {
	dayOfWeek: PeriodDefinitionDayOfWeek;
	defs: PeriodDefinition[];
}

export function isEmptyWeekend(group: PeriodDayGroup): boolean {
	return (group.dayOfWeek === 'saturday' || group.dayOfWeek === 'sunday') && group.defs.length === 0;
}

// Creation selects two independent boundaries, unlike a move which preserves duration.
export function periodCalendarCreation(change: Record<string, unknown>, definitions: PeriodDefinition[]):
	{ ok: true; values: PeriodCalendarChanges } | Exclude<PeriodCalendarResult, { ok: true }> {
	const start = change.start instanceof Date ? snapTime(change.start) : change.start;
	const end = change.end instanceof Date ? snapTime(change.end) : change.end;
	if (!validTime(start) || !validTime(end) || +end <= +start
		|| !['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(String(change.dayOfWeek))) {
		return { ok: false, error: 'invalid' };
	}
	const values = { startTime: clockTime(start), endTime: clockTime(end), dayOfWeek: change.dayOfWeek as PeriodDefinitionDayOfWeek };
	const conflict = definitions.find(other => other.dayOfWeek === values.dayOfWeek
		&& values.startTime < other.endTime && values.endTime > other.startTime);
	return conflict ? { ok: false, error: 'overlap', conflict: conflict.label } : { ok: true, values };
}

// SVAR box heights are duration * scale - 1px (the row separator).
// Use the rendered scale so resizing also works with short slots and browser zoom.
export function periodResizeEnd(start: Date, end: Date, height: number, deltaY: number): Date | null {
	const duration = +end - +start;
	if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(height) || height <= 0 || !Number.isFinite(deltaY))
		return null;
	const next = new Date(+end + deltaY * duration / (height + 1));
	return snapTime(next);
}

// Preview the native drag position with the same snapping and duration as a save.
export function periodMovePreview(start: Date, end: Date, height: number, deltaY: number): { start: Date; end: Date } | null {
	const duration = +end - +start;
	if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(height) || height <= 0 || !Number.isFinite(deltaY))
		return null;
	const movedStart = snapTime(new Date(+start + deltaY * duration / (height + 1)));
	return { start: movedStart, end: new Date(+movedStart + duration) };
}
