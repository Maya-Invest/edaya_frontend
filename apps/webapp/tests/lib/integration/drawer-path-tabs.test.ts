import { describe, expect, it } from 'bun:test';
import {
	classEvaluationsPath,
	classStudentsPath,
	classTeachingPath,
	classTimetablePath,
	configClassGroupPath,
	configSubjectPath,
	drawerTabFromPathname,
	financeBillingPath,
	schoolActivityPath,
	schoolGuardianPath,
	schoolStaffPath,
	schoolStudentPath,
	schoolTeacherPath,
} from '../../integration/demo-dry-run/support/paths';

describe('drawer path helpers', () => {
	it('builds default profile tab paths', () => {
		expect(schoolStudentPath('ci-s1')).toBe('/school/students/ci-s1/profile');
		expect(schoolTeacherPath('ci-t1')).toBe('/school/teachers/ci-t1/profile');
		expect(schoolStaffPath('ci-st3')).toBe('/school/staff/ci-st3/profile');
		expect(schoolActivityPath('ci-act-robot')).toBe('/school/activities/ci-act-robot/profile');
		expect(schoolGuardianPath('ci-g1')).toBe('/school/guardians/ci-g1');
		expect(financeBillingPath('ci-b1')).toBe('/finance/billing/ci-b1');
		expect(configClassGroupPath('ci-6a')).toBe('/configuration/classes/ci-6a/profile');
		expect(configSubjectPath('ci-cs-6a-math')).toBe('/configuration/subjects/ci-cs-6a-math/progression');
	});

	it('builds class drawer tab paths', () => {
		expect(classTeachingPath('ci-6a', 'ci-cs-6a-math', 'logbook')).toBe(
			'/classes/ci-6a/teaching/ci-cs-6a-math/logbook',
		);
		expect(classEvaluationsPath('ci-6a', 'ci-asm-6a-t1-math', 'grading')).toBe(
			'/classes/ci-6a/evaluations/ci-asm-6a-t1-math/grading',
		);
		expect(classTimetablePath('ci-6a', 'sch-ci-6a-math-mon:2026-01-06', 'attendance')).toBe(
			'/classes/ci-6a/timetable/sch-ci-6a-math-mon:2026-01-06/attendance',
		);
		expect(classStudentsPath('ci-6a', 'ci-s1', 'grades')).toBe(
			'/classes/ci-6a/students/ci-s1/grades',
		);
	});

	it('reads tab segments from drawer paths', () => {
		expect(drawerTabFromPathname('/school/students/ci-s1/profile')).toBe('profile');
		expect(drawerTabFromPathname('/school/students/ci-s1/grades')).toBe('grades');
		expect(drawerTabFromPathname('/school/students/ci-s1/report-card')).toBe('report-card');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/assignments')).toBe('assignments');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/availability')).toBe('availability');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/timetable')).toBe('timetable');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/evaluations')).toBe('evaluations');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/family-feedback')).toBe('family-feedback');
		expect(drawerTabFromPathname('/school/teachers/ci-t1/documents')).toBe('documents');
		expect(drawerTabFromPathname('/school/staff/ci-st3/permissions')).toBe('permissions');
		expect(drawerTabFromPathname('/school/activities/ci-act-robot/students')).toBe('students');
		expect(drawerTabFromPathname('/configuration/classes/ci-6a/profile')).toBe('profile');
		expect(drawerTabFromPathname('/configuration/classes/ci-6a/assignments')).toBe('assignments');
		expect(drawerTabFromPathname('/configuration/subjects/ci-cs-6a-math/logbook')).toBe('logbook');
		expect(drawerTabFromPathname('/classes/ci-6a/teaching/ci-cs-6a-math/progression')).toBe('progression');
		expect(drawerTabFromPathname('/classes/ci-6a/evaluations/ci-asm-6a-t1-math/grading')).toBe('grading');
		expect(drawerTabFromPathname('/classes/ci-6a/students/ci-s1/finances')).toBe('finances');
		expect(drawerTabFromPathname('/classes/ci-6a/timetable/s-1/logbook')).toBe('logbook');
	});
});
