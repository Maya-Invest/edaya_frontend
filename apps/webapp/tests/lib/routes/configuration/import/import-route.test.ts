import { describe, expect, it } from 'bun:test';
import { emptyImportSlice } from '../../../../../src/routes/(app)/configuration/import/lib/import-helpers';

describe('import route helpers', () => {
	it('returns a ready slice by default', () => {
		expect(emptyImportSlice()).toEqual({
			ready: true,
		});
	});
});
