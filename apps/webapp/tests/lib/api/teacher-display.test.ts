import { portalHomeroomTeacherNameForClass, teacherNameForClassSubject } from '$lib/api/teacher-display';
import { describe, expect, it } from 'bun:test';

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
	it('uses teacher assignments without staff substitution', () => {
		const name = teacherNameForClassSubject('cs-6a-math', {
			teachersRaw: [
				{ id: 't1', firstName: 'Aminata', lastName: 'Touré', isActive: true },
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

	it('does not substitute staff assignments when no teacher assignment exists', () => {
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

		expect(name).toBe('Non assigné');
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
				{ id: 't1', firstName: 'Kouadio', lastName: 'Diomande', isActive: true },
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

	it('uses an active teacher profile', () => {
		const name = portalHomeroomTeacherNameForClass('cls-6a', {
			teachersRaw: [
				{ id: 't1', firstName: 'Kouadio', lastName: 'Diomande', isActive: true },
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

describe('teacher display validity', () => {
	const teacher = { id: 'teacher', firstName: 'Aminata', lastName: 'Touré', isActive: true };
	const assignment = { id: 'assignment', teacherId: 'teacher', academicYearId: 'year', classSubjectId: 'math', kind: 'subject' as const, status: 'active' as const };
	const sources = { teachersRaw: [teacher], teacherAssignmentsRaw: [assignment], staffMembersRaw: [], staffAssignmentsRaw: [] };
	it('excludes inactive teachers and invalid or expired assignments', () => {
		expect(teacherNameForClassSubject('math', { ...sources, teachersRaw: [{ ...teacher, isActive: false }] })).toBe('Non assigné');
		for (const patch of [{ status: 'ended' as const }, { startsAt: '2999-01-01' }, { endsAt: '2000-01-01' }, { startsAt: 'invalid' }, { endsAt: 'invalid' }]) {
			expect(teacherNameForClassSubject('math', { ...sources, teacherAssignmentsRaw: [{ ...assignment, ...patch }] })).toBe('Non assigné');
		}
	});
	it('keeps homeroom and subject placements distinct', () => {
		expect(portalHomeroomTeacherNameForClass('class', sources)).toBe('—');
		const homeroom = { ...assignment, kind: 'homeroom' as const, classGroupId: 'class', classSubjectId: undefined };
		expect(teacherNameForClassSubject('math', { ...sources, teacherAssignmentsRaw: [homeroom] })).toBe('Non assigné');
		expect(portalHomeroomTeacherNameForClass('class', { ...sources, teacherAssignmentsRaw: [{ ...homeroom, endsAt: '2000-01-01' }] })).toBe('—');
	});
	it('shows all current co-teachers once in stable order', () => {
		expect(teacherNameForClassSubject('math', { ...sources, teachersRaw: [teacher, { ...teacher, id: 'second', firstName: 'Binta' }], teacherAssignmentsRaw: [assignment, { ...assignment, id: 'second', teacherId: 'second' }, { ...assignment, id: 'duplicate' }] })).toBe('Aminata Touré, Binta Touré');
	});
});

describe('homeroom teacher loading', () => {
	it('queries the selected class and year and only its referenced teachers', async () => {
		const { fetchHomeroomTeacherSources } = await import('$lib/api/teacher-display');
		const { createRecordingSchoolClient } = await import('$tests/support/recording-school-client');
		const assignment = { id: 'assignment', teacherId: 'teacher', academicYearId: 'year', classGroupId: 'class', kind: 'homeroom' as const, status: 'active' as const };
		const teacher = { id: 'teacher', firstName: 'Aminata', lastName: 'Touré', isActive: true };
		const { client, requests } = createRecordingSchoolClient([[assignment], [teacher]]);
		expect(await fetchHomeroomTeacherSources(client, 'class', 'year')).toEqual({ teacherAssignmentsRaw: [assignment], teachersRaw: [teacher] });
		expect(requests[0]?.body).toMatchObject({ classGroupId: 'class', academicYearId: 'year', kind: 'homeroom', status: 'active' });
		expect(requests[1]?.body).toEqual({ id: { $in: ['teacher'] } });
		const empty = createRecordingSchoolClient([[]]);
		expect(await fetchHomeroomTeacherSources(empty.client, 'class', 'next-year')).toEqual({ teacherAssignmentsRaw: [], teachersRaw: [] });
		expect(empty.requests).toHaveLength(1);
	});

	it('leaves optional enrichment empty when access is denied', async () => {
		const { fetchHomeroomTeacherSources } = await import('$lib/api/teacher-display');
		const { createRecordingSchoolClient } = await import('$tests/support/recording-school-client');
		const { ApiError } = await import('@maya-invest/edaya-api-client');
		const { client } = createRecordingSchoolClient([]);
		client.entities.teacherAssignments.list = async () => {
			throw new ApiError(403, { message: 'Denied' });
		};
		expect(await fetchHomeroomTeacherSources(client, 'class', 'year')).toEqual({ teacherAssignmentsRaw: [], teachersRaw: [] });
	});
});
