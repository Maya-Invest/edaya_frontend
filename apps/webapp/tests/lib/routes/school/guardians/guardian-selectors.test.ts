import { describe, expect, it } from 'bun:test';
import type { Guardian, Student } from '$lib/types/school';
import {
	filterGuardianList,
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

describe('guardian selectors', () => {
	it('reads guardian detail id from url', () => {
		expect(guardianDetailIdFromUrl(new URL('http://local/school/guardians/g-1'))).toBe('g-1');
		expect(guardianDetailIdFromUrl(new URL('http://local/school/guardians'))).toBeUndefined();
	});

	it('filters guardians by search query', () => {
		expect(filterGuardianList(guardians, { q: 'alice' })).toHaveLength(1);
		expect(filterGuardianList(guardians, { q: '' })).toHaveLength(2);
	});

	it('resolves linked students for a guardian', () => {
		expect(linkedStudentsForGuardian(students, guardians[0])).toEqual([students[0]]);
		expect(linkedStudentsForGuardian(students, guardians[1])).toEqual([]);
	});
});
