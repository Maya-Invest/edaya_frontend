import { afterEach, describe, expect, it } from 'bun:test';
import {
	getPageQueryCache,
	invalidatePageQueryCache,
	invalidatePageQueryCacheForRoute,
	setPageQueryCache,
} from '$lib/queries/page-query-cache';

describe('page query cache', () => {
	afterEach(() => {
		invalidatePageQueryCache();
	});

	it('does not store status-only meta', () => {
		setPageQueryCache('/school/teachers/tch-1/timetable', { status: 'ready' });
		expect(getPageQueryCache('/school/teachers/tch-1/timetable')).toBeUndefined();
	});

	it('stores payload-bearing results', () => {
		setPageQueryCache('/school/students', { status: 'ready', totalStudents: 12 });
		expect(getPageQueryCache<{ status: 'ready'; totalStudents: number }>('/school/students')).toEqual({
			status: 'ready',
			totalStudents: 12,
		});
	});

	it('evicts the list key and nested drawer-tab prefix', () => {
		setPageQueryCache('/school/students', { status: 'ready', totalStudents: 3 });
		setPageQueryCache('/school/students/stu-1/attendance', { status: 'ready', rows: 1 });
		setPageQueryCache('/school/teachers', { status: 'ready', totalTeachers: 2 });
		invalidatePageQueryCacheForRoute('/school/students');
		expect(getPageQueryCache('/school/students')).toBeUndefined();
		expect(getPageQueryCache('/school/students/stu-1/attendance')).toBeUndefined();
		expect(getPageQueryCache<{ status: 'ready'; totalTeachers: number }>('/school/teachers')).toEqual({
			status: 'ready',
			totalTeachers: 2,
		});
	});
});
