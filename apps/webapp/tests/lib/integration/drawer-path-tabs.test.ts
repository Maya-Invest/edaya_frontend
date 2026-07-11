import { describe, expect, it } from 'bun:test';
import {
	drawerTabFromPathname,
	schoolStaffPath,
	schoolStudentPath,
	schoolTeacherPath,
} from '../../integration/demo-dry-run/support/paths';

describe('school drawer path helpers', () => {
	it('builds default profile tab paths', () => {
		expect(schoolStudentPath('ci-s1')).toBe('/school/students/ci-s1/profile');
		expect(schoolTeacherPath('ci-t1')).toBe('/school/teachers/ci-t1/profile');
		expect(schoolStaffPath('ci-st3')).toBe('/school/staff/ci-st3/profile');
	});

	it('reads tab segments from school drawer paths', () => {
		expect(drawerTabFromPathname('/school/students/ci-s1/profile')).toBe('profile');
		expect(drawerTabFromPathname('/school/students/ci-s1/grades')).toBe('grades');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/assignments')).toBe('assignments');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/availability')).toBe('availability');
		expect(drawerTabFromPathname('/school/staff/ci-st3/permissions')).toBe('permissions');
		expect(drawerTabFromPathname('/configuration/classes/ci-6a')).toBeNull();
	});
});
