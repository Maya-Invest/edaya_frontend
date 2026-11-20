import { expect, test } from 'bun:test';
import { localDateTimeInput, localDateTimeValue, dateValuePreservingInstant } from '$lib/date/temporal-inputs';
test('unrelated validity edits retain exact instants, including seconds and milliseconds', () => {
	const instant = '2026-10-20T14:32:59.321Z';
	expect(localDateTimeValue(localDateTimeInput(instant), instant)).toBe(instant);
	expect(dateValuePreservingInstant('2026-10-20', instant)).toBe(instant);
	expect(localDateTimeValue('', instant)).toBeNull();
	expect(dateValuePreservingInstant('', instant)).toBeNull();
	const changed = '2026-11-01T10:30:00';
	expect(localDateTimeValue(changed, instant)).toBe(new Date(changed).toISOString());
});
