import { describe, expect, it } from 'bun:test';
import {
	activeClassStudentDetailTab,
	classStudentDetailIdFromUrl,
	classStudentsClassIdFromUrl,
} from '../../../../src/routes/(app)/classes/[classId]/students/lib/class-students-helpers';

describe('class students route helpers', () => {
	it('parses class and student ids from roster URLs', () => {
		const url = new URL('http://local/classes/6a/students/stu-1/profile');
		expect(classStudentsClassIdFromUrl(url)).toBe('6a');
		expect(classStudentDetailIdFromUrl(url)).toBe('stu-1');
	});

	it('parses class id from list URL', () => {
		const url = new URL('http://local/classes/6a/students');
		expect(classStudentsClassIdFromUrl(url)).toBe('6a');
		expect(classStudentDetailIdFromUrl(url)).toBeUndefined();
	});

	it('maps pathname segments to tab keys', () => {
		const classId = '6a';
		const studentId = 'stu-42';
		const base = `/classes/${classId}/students/${studentId}`;
		expect(activeClassStudentDetailTab(base, classId, studentId)).toBe('profile');
		expect(activeClassStudentDetailTab(`${base}/profile`, classId, studentId)).toBe('profile');
		expect(activeClassStudentDetailTab(`${base}/grades`, classId, studentId)).toBe('grades');
		expect(activeClassStudentDetailTab(`${base}/report-card`, classId, studentId)).toBe('reportCard');
	});
});
