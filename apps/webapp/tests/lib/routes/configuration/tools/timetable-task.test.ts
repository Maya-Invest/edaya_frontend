import { expect, test } from 'bun:test';
import { scopedTimetableOverrides, timetableTaskOptions, validTimetableTaskNumbers } from '../../../../../src/routes/(app)/configuration/tools/lib/timetable-task';

test('snapshots preferred periods and explicit false/zero without filling inherited options', () => {
	const preferred = ['period-1'];
	const options = timetableTaskOptions({ generationMode: 'weekly', preferredPeriodDefinitionIds: preferred, minDayGapSameSubject: '0', enforceWorkloadFulfillment: false });
	preferred.push('later-period');
	expect(options).toEqual({ generationMode: 'weekly', preferredPeriodDefinitionIds: ['period-1'], minDayGapSameSubject: 0, enforceWorkloadFulfillment: false });
	expect(timetableTaskOptions({ generationMode: 'free', preferredPeriodDefinitionIds: [], minDayGapSameSubject: '' })).toEqual({ generationMode: 'free', preferredPeriodDefinitionIds: [] });
});

test('excluded settings remain in the draft but cannot affect the submitted or validated selection', () => {
	const draft = { included: 3, excluded: Number.NaN };
	const scoped = scopedTimetableOverrides(['included'], draft);
	expect(scoped).toEqual({ included: 3 });
	expect(Number.isNaN(draft.excluded)).toBe(true);
	expect(validTimetableTaskNumbers('', scoped, {}, {})).toBe(true);
	expect(validTimetableTaskNumbers('', scopedTimetableOverrides(['excluded'], draft), {}, {})).toBe(false);
});

test('model validation catches invalid values after their editing step has unmounted', () => {
	for (const dayGap of ['-1', '1.5', 'bad', 'Infinity'])
		expect(validTimetableTaskNumbers(dayGap, {}, {}, {})).toBe(false);
	expect(validTimetableTaskNumbers('0', { a: 0 }, { a: 1 }, { a: 1 })).toBe(true);
	expect(validTimetableTaskNumbers('', { a: -1 }, {}, {})).toBe(false);
	expect(validTimetableTaskNumbers('', {}, { a: 0 }, {})).toBe(false);
	expect(validTimetableTaskNumbers('', {}, { a: 4 }, { a: 2 })).toBe(false);
});
