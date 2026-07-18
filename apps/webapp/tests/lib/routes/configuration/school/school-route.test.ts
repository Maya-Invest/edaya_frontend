import { describe, expect, it } from 'bun:test';
import { emptySchoolSlice } from '../../../../../src/routes/(app)/configuration/school/lib/school-helpers';

describe('school route helpers', () => {
	it('returns an empty slice by default', () => {
		expect(emptySchoolSlice()).toEqual({
			school: null,
			raw: null,
		});
	});
});
