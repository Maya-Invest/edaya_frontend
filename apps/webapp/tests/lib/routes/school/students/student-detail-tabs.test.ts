import { describe, expect, test } from 'bun:test';
import {
	activeStudentDetailTab,
	STUDENT_DETAIL_TABS,
} from '../../../../../src/routes/(app)/school/students/lib/student-detail-tabs';
import {
	isStudentProfileRouteId,
	shouldCloseStudentHealthModal,
} from '../../../../../src/routes/(app)/school/students/lib/student-modal-surface';

describe('school student detail tab routes', () => {
	test('maps pathname segments to tab keys', () => {
		const id = 'stu-42';
		expect(activeStudentDetailTab(`/school/students/${id}`, id)).toBe('profile');
		expect(activeStudentDetailTab(`/school/students/${id}/profile`, id)).toBe('profile');
		expect(activeStudentDetailTab(`/school/students/${id}/grades`, id)).toBe('grades');
		expect(activeStudentDetailTab(`/school/students/${id}/report-card`, id)).toBe('reportCard');
	});

	test('lists tab URL segments for nested routes', () => {
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'grades')?.segment).toBe('grades');
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'reportCard')?.segment).toBe('report-card');
		expect(STUDENT_DETAIL_TABS.find(tab => tab.key === 'profile')?.segment).toBe('profile');
	});

	test('lists the eight drawer domains in navigation order', () => {
		expect(STUDENT_DETAIL_TABS.map(tab => tab.segment)).toEqual([
			'profile', 'enrollments', 'attendance', 'grades', 'report-card', 'incidents', 'finances', 'documents',
		]);
		expect(activeStudentDetailTab('/school/students/stu-42/enrollments', 'stu-42')).toBe('enrollments');
	});

	test('recognizes school and class profile route ids', () => {
		const schoolProfileRoute = '/(app)/school/students/[[id]]/(tabs)/profile';
		const classProfileRoute = '/(app)/classes/[classId]/students/[[id]]/(tabs)/profile';

		expect(isStudentProfileRouteId(schoolProfileRoute)).toBe(true);
		expect(isStudentProfileRouteId(classProfileRoute)).toBe(true);
	});

	test('keeps authorized school and class health deep links open', () => {
		const schoolProfileRoute = '/(app)/school/students/[[id]]/(tabs)/profile';
		const classProfileRoute = '/(app)/classes/[classId]/students/[[id]]/(tabs)/profile';

		expect(shouldCloseStudentHealthModal('edit-health', schoolProfileRoute, true)).toBe(false);
		expect(shouldCloseStudentHealthModal('edit-health', classProfileRoute, true)).toBe(false);
	});

	test('closes unauthorized or off-profile health deep links only', () => {
		const schoolProfileRoute = '/(app)/school/students/[[id]]/(tabs)/profile';
		const classProfileRoute = '/(app)/classes/[classId]/students/[[id]]/(tabs)/profile';

		expect(shouldCloseStudentHealthModal('edit-health', schoolProfileRoute, false)).toBe(true);
		expect(shouldCloseStudentHealthModal('edit-health', classProfileRoute, false)).toBe(true);
		expect(shouldCloseStudentHealthModal(
			'edit-health',
			'/(app)/school/students/[[id]]/(tabs)/grades',
			true,
		)).toBe(true);
		expect(shouldCloseStudentHealthModal(
			'edit-health',
			'/(app)/classes/[classId]/students/[[id]]/(tabs)/attendance',
			true,
		)).toBe(true);
		expect(shouldCloseStudentHealthModal('edit-profile', null, false)).toBe(false);
	});
});
