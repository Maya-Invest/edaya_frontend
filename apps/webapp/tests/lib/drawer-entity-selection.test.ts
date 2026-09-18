import { describe, expect, it } from 'bun:test';
import { createDrawerEntitySelection, drawerEntityLoading } from '$lib/drawer-entity-selection';

describe('createDrawerEntitySelection', () => {
	it('resolves the first entity id and skips same-id tab navigations', () => {
		const shouldResolve = createDrawerEntitySelection();
		expect(shouldResolve('stu-1')).toBe(true);
		expect(shouldResolve('stu-1')).toBe(false);
		expect(shouldResolve('stu-2')).toBe(true);
		expect(shouldResolve(undefined)).toBe(false);
		expect(shouldResolve('stu-1')).toBe(true);
	});
});

describe('drawerEntityLoading', () => {
	it('keeps chrome mounted when the selected entity matches the URL id', () => {
		expect(drawerEntityLoading('stu-1', 'stu-1')).toBe(false);
		expect(drawerEntityLoading(undefined, 'stu-1')).toBe(true);
		expect(drawerEntityLoading('stu-1', 'stu-2')).toBe(true);
	});
});
