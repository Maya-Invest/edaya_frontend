import { describe, expect, it } from 'bun:test';
import type { Teacher } from '$lib/types/school';
import {
	cycleTeacherListSort,
	filterTeacherList,
	teacherListUsesFullRoster,
} from '../../../../../src/routes/(app)/school/teachers/lib/teacher-list-filters';
import { teacherDetailIdFromUrl } from '../../../../../src/routes/(app)/school/teachers/lib/teacher-selectors';

function teacher(id: string, overrides: Partial<Teacher> = {}): Teacher {
	return {
		id,
		name: `Teacher ${id}`,
		initials: 'TC',
		photoUrl: null,
		email: `${id}@school.test`,
		phone: '',
		isActive: true,
		subjectId: null,
		...overrides,
	};
}

const defaultFilters = { q: '', sort: 'roster' as const, sortDir: 'asc' as const };

describe('teacher selectors', () => {
	it('reads teacher detail id from url', () => {
		expect(teacherDetailIdFromUrl(new URL('http://local/school/teachers/tch-1'))).toBe('tch-1');
		expect(teacherDetailIdFromUrl(new URL('http://local/school/teachers/tch-1/profile'))).toBe('tch-1');
		expect(teacherDetailIdFromUrl(new URL('http://local/school/teachers'))).toBeUndefined();
	});
});

describe('teacher list filters', () => {
	it('filters teachers by search query', () => {
		const roster = [
			teacher('1', { name: 'Alice Martin', email: 'alice@school.test' }),
			teacher('2', { name: 'Bob Dupont' }),
		];
		expect(filterTeacherList(roster, { ...defaultFilters, q: 'alice' })).toHaveLength(1);
		expect(filterTeacherList(roster, defaultFilters)).toHaveLength(2);
	});

	it('sorts teachers by name and assignment count', () => {
		const roster = [
			teacher('1', { name: 'Charlie' }),
			teacher('2', { name: 'Ada' }),
		];
		const assignmentCount = (id: string) => (id === '1' ? 2 : 0);
		expect(
			filterTeacherList(roster, { ...defaultFilters, sort: 'name', sortDir: 'asc' }).map(entry => entry.id),
		).toEqual(['2', '1']);
		expect(
			filterTeacherList(roster, { ...defaultFilters, sort: 'assignments', sortDir: 'desc' }, { assignmentCount })
				.map(entry => entry.id),
		).toEqual(['1', '2']);
	});

	it('cycles sort through asc, desc, and roster', () => {
		expect(cycleTeacherListSort(defaultFilters, 'name')).toEqual({ sort: 'name', sortDir: 'asc' });
		expect(cycleTeacherListSort({ sort: 'name', sortDir: 'asc' }, 'name')).toEqual({ sort: 'name', sortDir: 'desc' });
		expect(cycleTeacherListSort({ sort: 'name', sortDir: 'desc' }, 'name')).toEqual({ sort: 'roster', sortDir: 'asc' });
	});

	it('uses full roster when search or sort is active', () => {
		expect(teacherListUsesFullRoster(defaultFilters)).toBe(false);
		expect(teacherListUsesFullRoster({ ...defaultFilters, q: 'ada' })).toBe(true);
		expect(teacherListUsesFullRoster({ ...defaultFilters, sort: 'name' })).toBe(true);
	});
});
