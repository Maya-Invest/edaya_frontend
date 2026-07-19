import { describe, expect, it } from 'bun:test';
import { emptyImportSlice } from '../../../../../src/routes/(app)/configuration/tools/lib/import-helpers';

describe('tools route helpers', () => {
	it('returns a ready slice by default', () => {
		expect(emptyImportSlice()).toEqual({
			ready: true,
		});
	});
});
