import { describe, expect, it } from 'bun:test';
import type { Student } from '$lib/types/school';
import {
	cycleStudentListSort,
	filterStudentList,
	studentListUsesFullRoster,
} from '../../../../../src/routes/(app)/school/students/lib/student-list-filters';

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

		expect(filterStudentList(roster, { q: 'ada', class: 'class-a', status: 'honor', sort: 'roster', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['1']);
		expect(filterStudentList(roster, { q: 'ada.king@school.test', class: 'all', status: 'all', sort: 'roster', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['3']);
		expect(filterStudentList(
			[student('4', { name: 'Kouadio Yao', matricule: 'CI-2025-001' })],
			{ q: 'ci-2025-004', class: 'all', status: 'all', sort: 'roster', sortDir: 'asc' },
		)).toEqual([]);
		expect(filterStudentList(
			[student('4', { name: 'Kouadio Yao', matricule: 'CI-2025-001' })],
			{ q: 'CI-2025-001', class: 'all', status: 'all', sort: 'roster', sortDir: 'asc' },
		).map(entry => entry.id)).toEqual(['4']);
		expect(filterStudentList(roster, { q: '', class: 'all', status: 'all', sort: 'name', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['2', '1', '3']);
	});

	it('sorts students ascending and descending', () => {
		const roster = [
			student('1', { name: 'Charlie', average: 10, attendance: 80 }),
			student('2', { name: 'Ada', average: 15, attendance: 95 }),
			student('3', { name: 'Bob', average: 12, attendance: 90 }),
		];

		expect(filterStudentList(roster, { q: '', class: 'all', status: 'all', sort: 'average', sortDir: 'asc' }).map(entry => entry.id)).toEqual(['1', '3', '2']);
		expect(filterStudentList(roster, { q: '', class: 'all', status: 'all', sort: 'average', sortDir: 'desc' }).map(entry => entry.id)).toEqual(['2', '3', '1']);
		expect(filterStudentList(roster, { q: '', class: 'all', status: 'all', sort: 'attendance', sortDir: 'desc' }).map(entry => entry.id)).toEqual(['2', '3', '1']);
	});

	it('sorts students by class name', () => {
		const roster = [
			student('1', { name: 'Ada', classId: 'class-b' }),
			student('2', { name: 'Bob', classId: 'class-a' }),
			student('3', { name: 'Cleo', classId: 'class-c' }),
		];
		const classNameById = new Map([
			['class-a', '6ème A'],
			['class-b', '5ème B'],
			['class-c', '6ème B'],
		]);

		expect(
			filterStudentList(
				roster,
				{ q: '', class: 'all', status: 'all', sort: 'class', sortDir: 'asc' },
				{ classNameById },
			).map(entry => entry.id),
		).toEqual(['1', '2', '3']);
		expect(
			filterStudentList(
				roster,
				{ q: '', class: 'all', status: 'all', sort: 'class', sortDir: 'desc' },
				{ classNameById },
			).map(entry => entry.id),
		).toEqual(['3', '2', '1']);
	});

	it('cycles sort state through asc, desc, and roster', () => {
		const filters = { sort: 'roster' as const, sortDir: 'asc' as const };

		expect(cycleStudentListSort(filters, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleStudentListSort({ sort: 'name', sortDir: 'asc' }, 'name')).toEqual({ sort: 'name', sortDir: 'desc' });
		expect(cycleStudentListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
		expect(cycleStudentListSort({ sort: 'average', sortDir: 'desc' }, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
	});

	it('uses full roster mode when search or status filters are active', () => {
		expect(studentListUsesFullRoster({ q: '', status: 'all', sort: 'roster' })).toBe(false);
		expect(studentListUsesFullRoster({ q: 'ada', status: 'all', sort: 'roster' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'honor', sort: 'roster' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'all', sort: 'average' })).toBe(true);
	});
});
