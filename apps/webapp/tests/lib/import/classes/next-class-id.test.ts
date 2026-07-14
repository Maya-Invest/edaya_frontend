import { describe, expect, it } from 'bun:test';
import { nextClassIdForImport } from '$lib/import/classes/next-class-id';

describe('nextClassIdForImport', () => {
	it('generates the next sibling id for a grade level', () => {
		const existing = new Set(['6a']);
		const siblingCounts = new Map([['gl-6', 1]]);

		expect(nextClassIdForImport('gl-6', existing, siblingCounts)).toBe('6b');
		expect(nextClassIdForImport('gl-6', existing, siblingCounts)).toBe('6c');
	});

	it('skips ids that already exist', () => {
		const existing = new Set(['6a', '6b']);
		const siblingCounts = new Map([['gl-6', 2]]);

		expect(nextClassIdForImport('gl-6', existing, siblingCounts)).toBe('6c');
	});
});
