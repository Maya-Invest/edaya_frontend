import { describe, expect, it } from 'bun:test';
import { portalHomeroomTeacherNameForClass, teacherNameForClassSubject } from '$lib/api/teacher-display';

describe('teacherNameForClassSubject', () => {
	it('prefers portal teacher assignments over legacy staff assignments', () => {
		const name = teacherNameForClassSubject('cs-6a-math', {
			teachersRaw: [
				{ id: 't1', schoolId: 'sch-1', firstName: 'Aminata', lastName: 'Touré', email: 'a@school.edu', isActive: true },
			],
			teacherAssignmentsRaw: [
				{
					id: 'ta-1',
					teacherId: 't1',
					academicYearId: '2025',
					kind: 'subject',
					classSubjectId: 'cs-6a-math',
					responsibility: 'Mathématiques',
					status: 'active',
				},
			],
			staffMembersRaw: [
				{ id: 'st1', schoolId: 'sch-1', firstName: 'Marie', lastName: 'Dupont', email: 'm@school.edu', accountKind: 'human', isActive: true, serviceElevated: false },
			],
			staffAssignmentsRaw: [
				{ id: 'sa-1', staffId: 'st1', academicYearId: '2025', responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
			],
		});

		expect(name).toBe('Aminata Touré');
	});

	it('falls back to staff assignments when no teacher assignment exists', () => {
		const name = teacherNameForClassSubject('cs-6a-math', {
			teachersRaw: [],
			teacherAssignmentsRaw: [],
			staffMembersRaw: [
				{ id: 'st1', schoolId: 'sch-1', firstName: 'Marie', lastName: 'Dupont', email: 'm@school.edu', accountKind: 'human', isActive: true, serviceElevated: false },
			],
			staffAssignmentsRaw: [
				{ id: 'sa-1', staffId: 'st1', academicYearId: '2025', responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
			],
		});

		expect(name).toBe('Marie Dupont');
	});
});

describe('portalHomeroomTeacherNameForClass', () => {
	it('returns the active portal homeroom teacher for a class', () => {
		const name = portalHomeroomTeacherNameForClass('cls-6a', {
			teachersRaw: [
				{ id: 't1', schoolId: 'sch-1', firstName: 'Kouadio', lastName: 'Diomande', email: 'k@school.edu', isActive: true },
			],
			teacherAssignmentsRaw: [
				{
					id: 'ta-hr-1',
					teacherId: 't1',
					academicYearId: '2025',
					kind: 'homeroom',
					classGroupId: 'cls-6a',
					responsibility: null,
					status: 'active',
				},
			],
		});

		expect(name).toBe('Kouadio Diomande');
	});

	it('accepts domain Teacher rows from detailDataContext', () => {
		const name = portalHomeroomTeacherNameForClass('cls-6a', {
			teachersRaw: [
				{ id: 't1', name: 'Kouadio Diomande' },
			],
			teacherAssignmentsRaw: [
				{
					id: 'ta-hr-1',
					teacherId: 't1',
					academicYearId: '2025',
					kind: 'homeroom',
					classGroupId: 'cls-6a',
					responsibility: null,
					status: 'active',
				},
			],
		});

		expect(name).toBe('Kouadio Diomande');
	});
});
