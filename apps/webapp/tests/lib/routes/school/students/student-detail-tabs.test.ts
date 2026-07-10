import { describe, expect, test } from 'bun:test';
import {
	activeStudentDetailTab,
	STUDENT_DETAIL_TABS,
} from '../../../../../src/routes/(app)/school/students/student-detail-tabs';

describe('school student detail tab routes', () => {
	test('maps pathname segments to tab keys', () => {
		const id = 'stu-42';
		expect(activeStudentDetailTab(`/school/students/${id}`, id)).toBe('profile');
		expect(activeStudentDetailTab(`/school/students/${id}/grades`, id)).toBe('grades');
		expect(activeStudentDetailTab(`/school/students/${id}/report-card`, id)).toBe('reportCard');
	});

	test('lists tab URL segments for nested routes', () => {
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'grades')?.segment).toBe('grades');
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'reportCard')?.segment).toBe('report-card');
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'profile')?.segment).toBe('');
	});

	test('lists all seven drawer tabs', () => {
		expect(STUDENT_DETAIL_TABS.map(tab => tab.key)).toEqual([
			'profile',
			'grades',
			'attendance',
			'incidents',
			'finances',
			'reportCard',
			'enrollments',
		]);
	});
});
