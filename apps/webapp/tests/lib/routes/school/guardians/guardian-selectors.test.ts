import { describe, expect, it } from 'bun:test';
import type { Guardian, Student } from '$lib/types/school';
import {
	cycleGuardianListSort,
	filterGuardianList,
	guardianListUsesFullRoster,
} from '../../../../../src/routes/(app)/school/guardians/lib/guardian-list-filters';
import {
	guardianDetailIdFromUrl,
	linkedStudentsForGuardian,
} from '../../../../../src/routes/(app)/school/guardians/lib/guardian-selectors';

const guardians: Guardian[] = [
	{
		id: 'g-1',
		name: 'Alice Martin',
		initials: 'AM',
		relation: 'Mother',
		email: 'alice@example.com',
		phone: '0102030405',
		studentIds: ['s-1'],
		preferredContact: 'email',
	},
	{
		id: 'g-2',
		name: 'Bob Dupont',
		initials: 'BD',
		relation: 'Father',
		email: 'bob@example.com',
		phone: '0607080910',
		studentIds: [],
		preferredContact: 'phone',
	},
];

const students: Student[] = [
	{
		id: 's-1',
		name: 'Charlie Martin',
		initials: 'CM',
		classId: '6a',
		status: 'active',
		email: '',
		birthdate: '2014-01-01',
		guardian: 'Alice Martin',
		attendance: 100,
		average: 12,
		enrollmentId: 'enr-1',
	},
];

const defaultFilters = { q: '', sort: 'roster' as const, sortDir: 'asc' as const };

describe('guardian selectors', () => {
	it('reads guardian detail id from url', () => {
		expect(guardianDetailIdFromUrl(new URL('http://local/school/guardians/g-1'))).toBe('g-1');
		expect(guardianDetailIdFromUrl(new URL('http://local/school/guardians'))).toBeUndefined();
	});

	it('resolves linked students for a guardian', () => {
		expect(linkedStudentsForGuardian(students, guardians[0])).toEqual([students[0]]);
		expect(linkedStudentsForGuardian(students, guardians[1])).toEqual([]);
	});
});

describe('guardian list filters', () => {
	it('filters guardians by search query', () => {
		expect(filterGuardianList(guardians, { ...defaultFilters, q: 'alice' })).toHaveLength(1);
		expect(filterGuardianList(guardians, defaultFilters)).toHaveLength(2);
		expect(filterGuardianList(guardians, { ...defaultFilters, q: 'bob@example.com' })).toHaveLength(1);
	});

	it('sorts guardians by name and linked student', () => {
		expect(
			filterGuardianList(guardians, { ...defaultFilters, sort: 'name', sortDir: 'asc' }).map(entry => entry.id),
		).toEqual(['g-1', 'g-2']);
		expect(
			filterGuardianList(guardians, { ...defaultFilters, sort: 'students', sortDir: 'asc' }, { students }).map(entry => entry.id),
		).toEqual(['g-2', 'g-1']);
	});

	it('cycles sort state through asc, desc, and roster', () => {
		expect(cycleGuardianListSort(defaultFilters, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleGuardianListSort({ sort: 'name', sortDir: 'asc' }, 'name')).toEqual({ sort: 'name', sortDir: 'desc' });
		expect(cycleGuardianListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
	});

	it('uses full roster mode when search or sort filters are active', () => {
		expect(guardianListUsesFullRoster(defaultFilters)).toBe(false);
		expect(guardianListUsesFullRoster({ ...defaultFilters, q: 'alice' })).toBe(true);
		expect(guardianListUsesFullRoster({ ...defaultFilters, sort: 'name' })).toBe(true);
	});
});
