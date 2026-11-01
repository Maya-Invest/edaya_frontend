import { describe, expect, it } from 'bun:test';
import { parseSubjectWorkload } from '$lib/subjects/subject-workload';

describe('subject workload form values', () => {
	it('converts blank inputs to explicit clears and accepts positive whole periods', () => {
		expect(parseSubjectWorkload({ periodsPerWeek: ' 5 ', minPeriodSpan: '', maxPeriodSpan: ' ' })).toEqual({
			value: { periodsPerWeek: 5, minPeriodSpan: null, maxPeriodSpan: null },
		});
	});

	it('rejects non-positive, fractional, and non-finite inputs', () => {
		for (const value of ['0', '-1', '1.5', 'Infinity', 'invalid']) {
			for (const key of ['periodsPerWeek', 'minPeriodSpan', 'maxPeriodSpan']) {
				expect(parseSubjectWorkload({ periodsPerWeek: '3', minPeriodSpan: '1', maxPeriodSpan: '2', [key]: value }))
					.toEqual({ error: 'timetable.periodSpanInvalid' });
			}
		}
	});

	it('rejects reversed spans and accepts equal or unspecified bounds', () => {
		expect(parseSubjectWorkload({ periodsPerWeek: '3', minPeriodSpan: '2', maxPeriodSpan: '1' }))
			.toEqual({ error: 'timetable.periodSpanRangeInvalid' });
		expect(parseSubjectWorkload({ periodsPerWeek: '3', minPeriodSpan: '2', maxPeriodSpan: '2' }).value?.maxPeriodSpan).toBe(2);
		expect(parseSubjectWorkload({ periodsPerWeek: '', minPeriodSpan: '', maxPeriodSpan: '2' }).value?.minPeriodSpan).toBeNull();
	});
});
