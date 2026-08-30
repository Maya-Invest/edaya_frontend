import { describe, expect, it } from 'bun:test';
import type { StaffMember } from '$lib/types/school';
import {
	cycleStaffListSort,
	filterStaffList,
	staffListUsesFullRoster,
} from '../../../../../src/routes/(app)/school/staff/lib/staff-list-filters';
import { staffDetailIdFromUrl } from '../../../../../src/routes/(app)/school/staff/lib/staff-selectors';

function staff(id: string, overrides: Partial<StaffMember> = {}): StaffMember {
	return {
		id,
		name: `Staff ${id}`,
		initials: 'ST',
		role: 'secretary',
		department: 'Sciences',
		email: `${id}@school.test`,
		classes: [],
		isActive: true,
		...overrides,
	};
}

const defaultFilters = { q: '', sort: 'roster' as const, sortDir: 'asc' as const };

describe('staff selectors', () => {
	it('reads staff detail id from url', () => {
		expect(staffDetailIdFromUrl(new URL('http://local/school/staff/stf-1'))).toBe('stf-1');
		expect(staffDetailIdFromUrl(new URL('http://local/school/staff'))).toBeUndefined();
	});
});

describe('staff list filters', () => {
	it('filters staff by search query', () => {
		const roster = [
			staff('1', { name: 'Alice Martin', email: 'alice@school.test' }),
			staff('2', { name: 'Bob Dupont' }),
		];
		expect(filterStaffList(roster, { ...defaultFilters, q: 'alice' })).toHaveLength(1);
		expect(filterStaffList(roster, defaultFilters)).toHaveLength(2);
	});

	it('sorts staff by name and role', () => {
		const roster = [
			staff('1', { name: 'Charlie', role: 'educateur' }),
			staff('2', { name: 'Ada', role: 'directeur' }),
		];
		expect(filterStaffList(roster, { ...defaultFilters, sort: 'name', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['2', '1']);
		expect(filterStaffList(roster, { ...defaultFilters, sort: 'role', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['2', '1']);
	});

	it('cycles sort state through asc, desc, and roster', () => {
		expect(cycleStaffListSort(defaultFilters, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleStaffListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
	});

	it('uses full roster mode when search or sort filters are active', () => {
		expect(staffListUsesFullRoster(defaultFilters)).toBe(false);
		expect(staffListUsesFullRoster({ ...defaultFilters, q: 'ada' })).toBe(true);
		expect(staffListUsesFullRoster({ ...defaultFilters, sort: 'role' })).toBe(true);
	});
});
