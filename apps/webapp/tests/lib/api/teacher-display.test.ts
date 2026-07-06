import { describe, expect, it } from 'bun:test';
import { portalHomeroomTeacherNameForClass, teacherNameForClassSubject } from '$lib/api/teacher-display';

const demoCiTeacher = {
	id: 'ci-t1',
	schoolId: 'sch-edaya-ci-cocody',
	firstName: 'Aminata',
	lastName: 'Touré',
	email: 'a.toure@ecole-ci.edaya.dev',
	isActive: true,
};

const demoCiHomeroomTeacher = {
	id: 'ci-t2',
	schoolId: 'sch-edaya-ci-cocody',
	firstName: 'Kouadio',
	lastName: 'Diomande',
	email: 'k.diomande@ecole-ci.edaya.dev',
	isActive: true,
};

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

	it('resolves demo-ci maths teacher on 6ème A', () => {
		const name = teacherNameForClassSubject('ci-cs-6a-math', {
			teachersRaw: [demoCiTeacher],
			teacherAssignmentsRaw: [
				{
					id: 'ta-ci-t1-math-6a',
					teacherId: 'ci-t1',
					academicYearId: 'ci-2025',
					kind: 'subject',
					classSubjectId: 'ci-cs-6a-math',
					responsibility: 'Mathématiques',
					status: 'active',
				},
			],
			staffMembersRaw: [],
			staffAssignmentsRaw: [],
		});

		expect(name).toBe('Aminata Touré');
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

	it('resolves demo-ci portal homeroom on 6ème B', () => {
		const name = portalHomeroomTeacherNameForClass('ci-6b', {
			teachersRaw: [demoCiHomeroomTeacher],
			teacherAssignmentsRaw: [
				{
					id: 'ta-ci-t2-hr-6b',
					teacherId: 'ci-t2',
					academicYearId: 'ci-2025',
					kind: 'homeroom',
					classGroupId: 'ci-6b',
					responsibility: null,
					status: 'active',
				},
			],
		});

		expect(name).toBe('Kouadio Diomande');
	});
});
