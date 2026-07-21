import { describe, expect, it } from 'bun:test';
import { emptyGradeScalesSlice } from '../../../../../src/routes/(app)/configuration/grade-scales/lib/grade-scales-helpers';

describe('grade-scales route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptyGradeScalesSlice()).toEqual({
			scales: [],
		});
	});
});
