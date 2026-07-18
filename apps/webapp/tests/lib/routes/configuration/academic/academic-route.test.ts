import { describe, expect, it } from 'bun:test';
import { emptyAcademicSlice } from '../../../../../src/routes/(app)/configuration/academic/lib/academic-helpers';

describe('academic route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptyAcademicSlice()).toEqual({
			yearCount: 0,
		});
	});
});
