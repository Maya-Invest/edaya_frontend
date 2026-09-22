import { describe, expect, it } from 'bun:test';
import { emptyDisciplineSlice } from '../../../../../src/routes/(app)/configuration/other/discipline/lib/discipline-helpers';

describe('discipline route helpers', () => {
	it('returns an empty slice when school context is missing', () => {
		expect(emptyDisciplineSlice()).toEqual({
			actions: [],
		});
	});
});
