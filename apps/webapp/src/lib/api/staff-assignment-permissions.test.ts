import { describe, expect, test } from 'bun:test';
import {
	catalogEntriesForClassGroupStaffAssignment,
	catalogEntriesForClassSubjectStaffAssignment,
	catalogEntriesForStaffAssignmentTarget,
	STAFF_ASSIGNMENT_SYNC_PERMISSIONS,
} from './staff-assignment-permissions';

const catalog = [
	{ permission: 'STAFF_READ' as const },
	{ permission: 'GRADE_INPUT' as const, scope: 'class_subject' as const },
	{ permission: 'GRADE_READ' as const, scope: 'class_group' as const },
	{ permission: 'ATTENDANCE_RECORD' as const, scope: 'class_subject' as const },
	{ permission: 'QUERY_STUDENT_DETAIL_READ' as const, scope: 'student' as const },
	{ permission: 'ACADEMIC_PROGRAM_READ' as const, scope: 'class_group' as const },
	{ permission: 'COMMUNICATION_SEND' as const, scope: 'class_group' as const },
	{ permission: 'DISCIPLINE_CREATE' as const, scope: 'class_subject' as const },
	{ permission: 'EXAM_CONFIG_CREATE' as const, scope: 'class_subject' as const },
];

describe('catalogEntriesForStaffAssignmentTarget', () => {
	test('class_group target keeps catalog entries whose scope path includes class_group', () => {
		const entries = catalogEntriesForStaffAssignmentTarget(catalog, 'class_group');
		expect(entries.map(entry => entry.permission)).toEqual([
			'GRADE_INPUT',
			'GRADE_READ',
			'ATTENDANCE_RECORD',
			'ACADEMIC_PROGRAM_READ',
			'COMMUNICATION_SEND',
			'DISCIPLINE_CREATE',
			'EXAM_CONFIG_CREATE',
		]);
	});

	test('class_subject target keeps only teaching sync permissions', () => {
		const entries = catalogEntriesForStaffAssignmentTarget(catalog, 'class_subject');
		expect(entries.map(entry => entry.permission)).toEqual([
			'GRADE_INPUT',
			'ATTENDANCE_RECORD',
			'DISCIPLINE_CREATE',
		]);
	});

	test('class_subject target excludes class_group scoped read/config permissions', () => {
		const entries = catalogEntriesForClassSubjectStaffAssignment(catalog);
		expect(entries.some(entry => entry.permission === 'GRADE_READ')).toBe(false);
		expect(entries.some(entry => entry.permission === 'ACADEMIC_PROGRAM_READ')).toBe(false);
		expect(entries.some(entry => entry.permission === 'EXAM_CONFIG_CREATE')).toBe(false);
	});

	test('class group helper matches class_group target filter', () => {
		expect(catalogEntriesForClassGroupStaffAssignment(catalog)).toEqual(
			catalogEntriesForStaffAssignmentTarget(catalog, 'class_group'),
		);
	});

	test('sync permission list matches backend ASSIGNMENT_SCOPED_PERMISSIONS', () => {
		expect([...STAFF_ASSIGNMENT_SYNC_PERMISSIONS]).toEqual([
			'GRADE_INPUT',
			'ATTENDANCE_RECORD',
			'CLASS_LOGBOOK_CREATE',
			'CLASS_LOGBOOK_UPDATE',
			'DISCIPLINE_CREATE',
		]);
	});
});
