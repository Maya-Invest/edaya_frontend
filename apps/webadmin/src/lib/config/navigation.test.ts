import { describe, expect, it } from 'bun:test';
import { navItems, placeholderCards } from './navigation';

describe('navigation config', () => {
	it('defines the primary admin sections', () => {
		expect(navItems.map(item => item.label)).toEqual([
			'Overview',
			'Tenants',
			'Users',
			'Billing',
		]);
	});

	it('exposes placeholder dashboard cards', () => {
		expect(placeholderCards).toHaveLength(3);
	});
});
