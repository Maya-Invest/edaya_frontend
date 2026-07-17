import { describe, expect, it } from 'bun:test';
import {
	clampCardColumnsPerRow,
	listEntityCardGridClass,
	listEntityCardLayout,
} from '../../../src/lib/list/list-entity-card-layout';

describe('list entity card layout', () => {
	it('derives card layout from column density', () => {
		expect(listEntityCardLayout(1)).toBe('row');
		expect(listEntityCardLayout(2)).toBe('split');
		expect(listEntityCardLayout(3)).toBe('stack');
		expect(listEntityCardLayout(5)).toBe('stack');
	});

	it('clamps column density to 1..5', () => {
		expect(clampCardColumnsPerRow(0)).toBe(1);
		expect(clampCardColumnsPerRow(3.6)).toBe(4);
		expect(clampCardColumnsPerRow(9)).toBe(5);
	});

	it('maps column density to responsive grid classes', () => {
		expect(listEntityCardGridClass(1)).toContain('grid-cols-1');
		expect(listEntityCardGridClass(3)).toContain('lg:grid-cols-3');
		expect(listEntityCardGridClass(5)).toContain('xl:grid-cols-5');
	});
});
