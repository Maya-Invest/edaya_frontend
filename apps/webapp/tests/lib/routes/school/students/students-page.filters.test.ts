import { describe, expect, it } from 'bun:test';
import type { Student } from '$lib/types/school';
import type { StudentListFilters } from '$lib/list/list-url-filters';
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

function filters(overrides: Partial<StudentListFilters> = {}): StudentListFilters {
	return {
		q: '',
		class: 'all',
		status: 'all',
		photoReview: 'all',
		sort: 'roster',
		sortDir: 'asc',
		...overrides,
	};
}

describe('student list filters', () => {
	it('filters students by class, status, and search query', () => {
		const roster = [
			student('1', { name: 'Ada Lovelace', email: 'ada@school.test', status: 'inactive', classId: 'class-a' }),
			student('2', { name: 'Ada King', status: 'active', classId: 'class-a' }),
			student('3', { name: 'Grace Hopper', email: 'ada.king@school.test', status: 'inactive', classId: 'class-b' }),
		];

		expect(filterStudentList(roster, filters({ q: 'ada', class: 'class-a', status: 'inactive' })).map(entry => entry.id)).toEqual(['1']);
		expect(filterStudentList(roster, filters({ q: 'ada.king@school.test' })).map(entry => entry.id)).toEqual(['3']);
		expect(filterStudentList(
			[student('4', { name: 'Kouadio Yao', matricule: 'CI-2025-001' })],
			filters({ q: 'ci-2025-004' }),
		)).toEqual([]);
		expect(filterStudentList(
			[student('4', { name: 'Kouadio Yao', matricule: 'CI-2025-001' })],
			filters({ q: 'CI-2025-001' }),
		).map(entry => entry.id)).toEqual(['4']);
		expect(filterStudentList(roster, filters({ sort: 'name' })).map(entry => entry.id)).toEqual(['2', '1', '3']);
	});

	it('sorts students ascending and descending', () => {
		const roster = [
			student('1', { name: 'Charlie', average: 10, attendance: 80 }),
			student('2', { name: 'Ada', average: 15, attendance: 95 }),
			student('3', { name: 'Bob', average: 12, attendance: 90 }),
		];

		expect(filterStudentList(roster, filters({ sort: 'average', sortDir: 'asc' })).map(entry => entry.id)).toEqual(['1', '3', '2']);
		expect(filterStudentList(roster, filters({ sort: 'average', sortDir: 'desc' })).map(entry => entry.id)).toEqual(['2', '3', '1']);
		expect(filterStudentList(roster, filters({ sort: 'attendance', sortDir: 'desc' })).map(entry => entry.id)).toEqual(['2', '3', '1']);
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
				filters({ sort: 'class', sortDir: 'asc' }),
				{ classNameById },
			).map(entry => entry.id),
		).toEqual(['1', '2', '3']);
		expect(
			filterStudentList(
				roster,
				filters({ sort: 'class', sortDir: 'desc' }),
				{ classNameById },
			).map(entry => entry.id),
		).toEqual(['3', '2', '1']);
	});

	it('filters students awaiting portrait review', () => {
		const roster = [student('1'), student('2'), student('3')];
		expect(
			filterStudentList(
				roster,
				filters({ photoReview: 'pending' }),
				{ pendingPhotoStudentIds: new Set(['2']) },
			).map(entry => entry.id),
		).toEqual(['2']);
	});

	it('cycles sort state through asc, desc, and roster', () => {
		const current = { sort: 'roster' as const, sortDir: 'asc' as const };

		expect(cycleStudentListSort(current, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleStudentListSort({ sort: 'name', sortDir: 'asc' }, 'name')).toEqual({ sort: 'name', sortDir: 'desc' });
		expect(cycleStudentListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
		expect(cycleStudentListSort({ sort: 'average', sortDir: 'desc' }, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
	});

	it('uses full roster mode when search, status, or photo review filters are active', () => {
		expect(studentListUsesFullRoster({ q: '', status: 'all', sort: 'roster', photoReview: 'all' })).toBe(false);
		expect(studentListUsesFullRoster({ q: 'ada', status: 'all', sort: 'roster', photoReview: 'all' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'honor', sort: 'roster', photoReview: 'all' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'all', sort: 'average', photoReview: 'all' })).toBe(true);
		expect(studentListUsesFullRoster({ q: '', status: 'all', sort: 'roster', photoReview: 'pending' })).toBe(true);
	});
});
