import type { PeriodDefinition } from '../../../../../src/lib/types/school';
import { describe, expect, it, mock } from 'bun:test';
import { PeriodCalendarWriter, isEmptyWeekend, periodMovePreview, periodResizeEnd, periodCalendarCreation, periodCalendarDate, periodCalendarEvent, snapPeriodCalendarChange, validatePeriodCalendarChange } from '../../../../../src/routes/(app)/configuration/period-grid/lib/period-calendar';

function slot(id = 'one', overrides: Partial<PeriodDefinition> = {}): PeriodDefinition {
	return { id, schoolId: 'school', academicYearId: 'year', dayOfWeek: 'monday', label: 'Period 1', order: 1, startTime: '07:30', endTime: '08:15', isBreak: false, isTeachingSlot: true, ...overrides };
}
const first = slot();
const pause = slot('break', { label: 'Break', startTime: '08:15', endTime: '08:30', order: 2, isBreak: true, isTeachingSlot: false });
const end = (time: string) => ({ end: periodCalendarDate(time) });

describe('weekly period calendar editing', () => {
	it('maps civil times to weekday columns without real academic dates or UTC conversion', () => {
		const mapped = periodCalendarEvent(slot('sun', { dayOfWeek: 'sunday' }));
		expect(mapped.dayOfWeek).toBe('sunday');
		expect(mapped.start.getHours()).toBe(7);
		expect(mapped.start.getMinutes()).toBe(30);
		expect(mapped.start.getDate()).toBe(3);
		expect(mapped.end.getHours()).toBe(8);
	});

	it('normalizes unit-column pointer positions to five-minute boundaries without mutating events', () => {
		const original = new Date(2000, 0, 3, 8, 12, 20);
		const snapped = snapPeriodCalendarChange({ end: original });
		expect(snapped.end).toEqual(periodCalendarDate('08:10'));
		expect(original.getMinutes()).toBe(12);
		expect(snapPeriodCalendarChange({ end: new Date(2000, 0, 3, 8, 13) }).end).toEqual(periodCalendarDate('08:15'));
		expect(validatePeriodCalendarChange('one', snapPeriodCalendarChange({ end: new Date(2000, 0, 3, 23, 59) }), [first]).ok).toBe(false);
	});

	it('allows shortening and touching a neighbour, but rejects overlaps including breaks', () => {
		expect(validatePeriodCalendarChange('one', end('08:10'), [first, pause]).ok).toBe(true);
		expect(validatePeriodCalendarChange('one', end('08:15'), [first, pause]).ok).toBe(true);
		expect(validatePeriodCalendarChange('one', end('08:20'), [first, pause])).toEqual({ ok: false, error: 'overlap', conflict: 'Break' });
		expect(validatePeriodCalendarChange('one', end('09:00'), [first, pause]).ok).toBe(false);
	});

	it('ignores different weekdays, schools and years, but catches containment', () => {
		for (const overrides of [{ dayOfWeek: 'tuesday' as const }, { schoolId: 'other' }, { academicYearId: 'other' }]) {
			expect(validatePeriodCalendarChange('one', end('08:30'), [first, { ...pause, ...overrides }]).ok).toBe(true);
		}
		expect(validatePeriodCalendarChange('one', end('08:10'), [first, slot('contains', { startTime: '07:00', endTime: '09:00' })]).ok).toBe(false);
	});

	it('rejects wrong dates, zero duration, off-grid times and invalid weekdays', () => {
		for (const value of [new Date(NaN), new Date(2000, 0, 4, 8), new Date(2026, 0, 3, 8), periodCalendarDate('07:30'), periodCalendarDate('08:12'), new Date(2000, 0, 3, 8, 10, 1), '08:10']) {
			expect(validatePeriodCalendarChange('one', { end: value }, [first])).toEqual({ ok: false, error: 'invalid' });
		}
		expect(validatePeriodCalendarChange('one', { ...end('08:10'), start: periodCalendarDate('07:32') }, [first])).toEqual({ ok: false, error: 'invalid' });
		expect(validatePeriodCalendarChange('one', { ...end('08:10'), dayOfWeek: 'not-a-day' }, [first])).toEqual({ ok: false, error: 'invalid' });
		expect(validatePeriodCalendarChange('missing', end('08:10'), [first])).toEqual({ ok: false, error: 'stale' });
	});

	it('does not save invalid, unchanged or unauthorized edits', async () => {
		let allowed = true;
		const save = mock(async () => true);
		const writer = new PeriodCalendarWriter({ canEdit: () => allowed, definitions: () => [first, pause], save });
		await writer.update('one', end('08:20'));
		await writer.update('one', end('08:15'));
		allowed = false;
		expect(await writer.update('one', end('08:10'))).toEqual({ ok: false, error: 'forbidden' });
		expect(save).not.toHaveBeenCalled();
	});

	it('serializes saves, preserves identity and metadata, and recovers after failure', async () => {
		let finish!: (ok: boolean) => void;
		const save = mock((_def: PeriodDefinition, _changes: Pick<PeriodDefinition, 'startTime' | 'endTime' | 'dayOfWeek'>) => new Promise<boolean>(resolve => { finish = resolve; }));
		const writer = new PeriodCalendarWriter({ canEdit: () => true, definitions: () => [first, pause], save });
		const pending = writer.update('one', end('08:10'));
		expect(await writer.update('one', end('08:05'))).toEqual({ ok: false, error: 'busy' });
		expect(save).toHaveBeenCalledWith(first, { startTime: '07:30', endTime: '08:10', dayOfWeek: 'monday' });
		finish(false);
		expect(await pending).toEqual({ ok: false, error: 'failed' });
		expect(first.endTime).toBe('08:15');
		const retry = writer.update('one', end('08:05'));
		finish(true);
		expect(await retry).toEqual({ ok: true });
		expect(save).toHaveBeenCalledTimes(2);
	});

	it('checks current context and neighbours at save time and handles rejected requests', async () => {
		let definitions = [first];
		const save = mock(async () => { throw new Error('offline'); });
		const writer = new PeriodCalendarWriter({ canEdit: () => true, definitions: () => definitions, save });
		definitions = [first, pause];
		expect((await writer.update('one', end('08:20'))).ok).toBe(false);
		expect(save).not.toHaveBeenCalled();
		definitions = [];
		expect(await writer.update('one', end('08:10'))).toEqual({ ok: false, error: 'stale' });
		definitions = [first];
		expect(await writer.update('one', end('08:10'))).toEqual({ ok: false, error: 'failed' });
		expect(first.endTime).toBe('08:15');
	});
});


describe('weekly period moves', () => {
	it('snaps a whole-slot move without changing its duration or source dates', () => {
		const start = new Date(2000, 0, 3, 7, 2, 20);
		const end = new Date(+start + 45 * 60000);
		const change = snapPeriodCalendarChange({ start, end, dayOfWeek: 'saturday' });
		expect(change.start).toEqual(periodCalendarDate('07:00'));
		expect(change.end).toEqual(periodCalendarDate('07:45'));
		expect(start.getSeconds()).toBe(20);
		expect(validatePeriodCalendarChange('one', change, [first, pause])).toMatchObject({ ok: true, changes: { startTime: '07:00', endTime: '07:45', dayOfWeek: 'saturday' } });
	});
	it('validates both endpoints and rejects moves crossing midnight', () => {
		for (const start of [new Date(NaN), new Date(2000, 0, 2, 23, 55), '07:00']) {
			expect(validatePeriodCalendarChange('one', { start, end: periodCalendarDate('07:45') }, [first]).ok).toBe(false);
		}
		expect(validatePeriodCalendarChange('one', snapPeriodCalendarChange({ start: new Date(2000, 0, 3, 23, 32), end: new Date(2000, 0, 4, 0, 17) }), [first]).ok).toBe(false);
	});
	it('checks the destination weekday, allowing touching slots and ignoring other school/year scopes', () => {
		const change = { start: periodCalendarDate('07:00'), end: periodCalendarDate('07:45'), dayOfWeek: 'tuesday' };
		const neighbour = slot('target', { dayOfWeek: 'tuesday', label: 'Target', startTime: '07:40', endTime: '08:00' });
		expect(validatePeriodCalendarChange('one', change, [first, neighbour])).toEqual({ ok: false, error: 'overlap', conflict: 'Target' });
		for (const overrides of [{ dayOfWeek: 'monday' as const }, { schoolId: 'other' }, { academicYearId: 'other' }, { startTime: '07:45' }]) {
			expect(validatePeriodCalendarChange('one', change, [first, { ...neighbour, ...overrides }]).ok).toBe(true);
		}
	});
	it('saves moved times and weekday with original identity, order and flags, without optimistic mutation', async () => {
		const save = mock(async () => false);
		const writer = new PeriodCalendarWriter({ canEdit: () => true, definitions: () => [first], save });
		const result = await writer.update('one', { start: periodCalendarDate('07:00'), end: periodCalendarDate('07:45'), dayOfWeek: 'sunday' });
		expect(save).toHaveBeenCalledWith(first, { startTime: '07:00', endTime: '07:45', dayOfWeek: 'sunday' });
		expect(result).toEqual({ ok: false, error: 'failed' });
		expect(first).toEqual(slot());
	});
});


describe('calendar slot creation', () => {
	it('snaps both selection boundaries independently and preserves the weekday', () => {
		const start = new Date(2000, 0, 3, 7, 2, 20);
		expect(periodCalendarCreation({ start, end: new Date(2000, 0, 3, 7, 28, 15), dayOfWeek: 'tuesday' }, [first])).toEqual({ ok: true, values: { startTime: '07:00', endTime: '07:30', dayOfWeek: 'tuesday' } });
		expect(start.getSeconds()).toBe(20);
	});
	it('allows empty schedules and touching endpoints but rejects overlaps including breaks', () => {
		const selection = { start: periodCalendarDate('07:00'), end: periodCalendarDate('07:30'), dayOfWeek: 'monday' };
		expect(periodCalendarCreation(selection, []).ok).toBe(true);
		expect(periodCalendarCreation(selection, [first]).ok).toBe(true);
		expect(periodCalendarCreation({ ...selection, end: periodCalendarDate('07:35') }, [first])).toEqual({ ok: false, error: 'overlap', conflict: 'Period 1' });
		expect(periodCalendarCreation({ ...selection, start: periodCalendarDate('08:15'), end: periodCalendarDate('08:30') }, [pause])).toEqual({ ok: false, error: 'overlap', conflict: 'Break' });
	});
	it('rejects invalid, zero-length, reversed and overnight selections', () => {
		for (const [start, end, dayOfWeek] of [
			[periodCalendarDate('07:00'), periodCalendarDate('07:00'), 'monday'],
			[periodCalendarDate('08:00'), periodCalendarDate('07:00'), 'monday'],
			[new Date(NaN), periodCalendarDate('08:00'), 'monday'],
			[periodCalendarDate('23:00'), new Date(2000, 0, 4), 'monday'],
			[periodCalendarDate('07:00'), periodCalendarDate('08:00'), 'invalid'],
		]) expect(periodCalendarCreation({ start, end, dayOfWeek }, [])).toEqual({ ok: false, error: 'invalid' });
	});
	it('retains empty weekdays and populated weekends', () => {
		expect(isEmptyWeekend({ dayOfWeek: 'saturday', defs: [] })).toBe(true);
		expect(isEmptyWeekend({ dayOfWeek: 'sunday', defs: [] })).toBe(true);
		expect(isEmptyWeekend({ dayOfWeek: 'monday', defs: [] })).toBe(false);
		expect(isEmptyWeekend({ dayOfWeek: 'saturday', defs: [slot('sat', { dayOfWeek: 'saturday' })] })).toBe(false);
	});
});


describe('explicit resize handle', () => {
	it('resizes short breaks by five minutes without moving their start', () => {
		const start = periodCalendarDate('09:00');
		const end = periodCalendarDate('09:15');
		expect(periodResizeEnd(start, end, 23, -8)).toEqual(periodCalendarDate('09:10'));
		expect(periodResizeEnd(start, end, 23, 8)).toEqual(periodCalendarDate('09:20'));
		expect(start).toEqual(periodCalendarDate('09:00'));
		expect(end).toEqual(periodCalendarDate('09:15'));
	});
	it('uses the rendered scale for long slots and zoomed grids, snapping small deltas', () => {
		expect(periodResizeEnd(periodCalendarDate('07:30'), periodCalendarDate('08:15'), 71, -8)).toEqual(periodCalendarDate('08:10'));
		expect(periodResizeEnd(periodCalendarDate('09:00'), periodCalendarDate('09:15'), 47, -16)).toEqual(periodCalendarDate('09:10'));
		expect(periodResizeEnd(periodCalendarDate('09:00'), periodCalendarDate('09:15'), 23, 1)).toEqual(periodCalendarDate('09:15'));
	});
	it('leaves range and overlap protection to the canonical validator', () => {
		const end = periodResizeEnd(periodCalendarDate(first.startTime), periodCalendarDate(first.endTime), 71, 8);
		expect(validatePeriodCalendarChange('one', { end }, [first, pause])).toEqual({ ok: false, error: 'overlap', conflict: 'Break' });
		expect(periodResizeEnd(new Date(NaN), periodCalendarDate('08:15'), 71, 8)).toBeNull();
		expect(periodResizeEnd(periodCalendarDate('08:00'), periodCalendarDate('08:15'), 0, 8)).toBeNull();
	});
});


describe('live move preview', () => {
	it('snaps both displayed endpoints together while preserving duration and source dates', () => {
		const start = periodCalendarDate('07:30');
		const end = periodCalendarDate('08:15');
		for (const [delta, expectedStart, expectedEnd] of [[8, '07:35', '08:20'], [-8, '07:25', '08:10'], [0, '07:30', '08:15'], [1, '07:30', '08:15']] as const) {
			expect(periodMovePreview(start, end, 71, delta)).toEqual({ start: periodCalendarDate(expectedStart), end: periodCalendarDate(expectedEnd) });
		}
		expect(start).toEqual(periodCalendarDate('07:30'));
		expect(end).toEqual(periodCalendarDate('08:15'));
	});
	it('supports short slots and different rendered scales, matching the saved move', () => {
		const start = periodCalendarDate('09:00');
		const end = periodCalendarDate('09:15');
		const preview = periodMovePreview(start, end, 23, 8)!;
		expect(preview).toEqual({ start: periodCalendarDate('09:05'), end: periodCalendarDate('09:20') });
		expect(periodMovePreview(start, end, 47, 16)).toEqual(preview);
		expect(snapPeriodCalendarChange({ start: new Date(+start + 5 * 60000), end: new Date(+end + 5 * 60000) })).toEqual(preview);
	});
	it('ignores invalid geometry and leaves overlap validation to the save path', () => {
		const start = periodCalendarDate(first.startTime);
		const end = periodCalendarDate(first.endTime);
		for (const [height, delta] of [[0, 8], [NaN, 8], [71, Infinity]])
			expect(periodMovePreview(start, end, height, delta)).toBeNull();
		expect(periodMovePreview(end, start, 71, 8)).toBeNull();
		expect(periodMovePreview(new Date(NaN), end, 71, 8)).toBeNull();
		const preview = periodMovePreview(start, end, 71, 8)!;
		expect(validatePeriodCalendarChange('one', preview, [first, pause])).toEqual({ ok: false, error: 'overlap', conflict: 'Break' });
	});
});
