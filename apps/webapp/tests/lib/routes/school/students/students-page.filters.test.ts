import { describe, expect, it } from 'bun:test';
import type { Student } from '$lib/types/school';
import {
	filterStudentList,
	studentListUsesFullRoster,
} from '../../../../../src/routes/(app)/school/students/student-list-filters';

function student(id: string, overrides: Partial<Student> = {}): Student {
	return {
		id,
		name: `Student ${id}`,
		email: `${id}@school.test`,
		initials: 'ST',
		classId: 'class-a',
		birthdate: '2014-01-01',
		guardian: 'Guardian',
		average: 12,
		attendance: 90,
		status: 'active',
		photoUrl: null,
		...overrides,
	};
}

describe('student list filters', () => {
	it('filters students by class, status, and search query', () => {
		const roster = [
			student('1', { name: 'Ada Lovelace', email: 'ada@school.test', status: 'honor', classId: 'class-a' }),
			student('2', { name: 'Ada King', status: 'active', classId: 'class-a' }),
			student('3', { name: 'Grace Hopper', email: 'ada.king@school.test', status: 'honor', classId: 'class-b' }),
		];

		expect(filterStudentList(roster, { q: 'ada', class: 'class-a', status: 'honor' }).map(entry => entry.id)).toEqual(['1']);
		expect(filterStudentList(roster, { q: 'ada.king@school.test', class: 'all', status: 'all' }).map(entry => entry.id)).toEqual(['3']);
	});

	it('uses full roster mode when search or status filters are active', () => {
		expect(studentListUsesFullRoster({ q: '', status: 'all' })).toBe(false);
		expect(studentListUsesFullRoster({ q: 'ada', status: 'all' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'honor' })).toBe(true);
	});
});
