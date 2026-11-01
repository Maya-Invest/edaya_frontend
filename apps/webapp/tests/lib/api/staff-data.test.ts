import {
	mapDepartment,
	mapStaffMembers,
	mapStaffRole,
} from '$lib/api/staff-data';
import { classSubject, staffMember, subject } from '$tests/support/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';

const academicYearId = '2025';

const staffRaw = [
	staffMember({
		id: 'st5',
		firstName: 'Camille',
		lastName: 'Moreau',
		email: 'c.moreau@school.edu',
		profileRole: 'directeur',
	}),
	staffMember({
		id: 'st3',
		firstName: 'Marie',
		lastName: 'Léon',
		email: 'm.leon@school.edu',
		profileRole: 'deputy_director',
	}),
	staffMember({
		id: 'st1',
		firstName: 'Marie',
		lastName: 'Dupont',
		email: 'm.dupont@school.edu',
	}),
	staffMember({
		id: 'st7',
		firstName: 'Tom',
		lastName: 'Évrard',
		email: 't.evrard@school.edu',
		profileRole: 'educateur',
	}),
];

const classGroupsRaw = [
	{ id: '6a', schoolId: SEED_SCHOOL_ID, academicYearId, gradeLevelId: 'gl-6', name: '6th — A', homeroomStaffId: 'st3', attendanceMode: 'session' as const },
];

const assignmentsRaw = [
	{ id: 'sa-st5-dir', staffId: 'st5', academicYearId, responsibility: 'Director', permissions: [] },
	{ id: 'sa-st1-6a', staffId: 'st1', academicYearId, responsibility: 'Mathematics', classGroupId: '6a', permissions: [] },
	{ id: 'sa-st3-6a', staffId: 'st3', academicYearId, responsibility: 'Homeroom', classGroupId: '6a', permissions: [] },
	{ id: 'sa-st1-math', staffId: 'st1', academicYearId, responsibility: 'Teacher', classSubjectId: 'cs-6a-math', permissions: [] },
	{ id: 'sa-st1-sci', staffId: 'st1', academicYearId, responsibility: 'Teacher', classSubjectId: 'cs-6a-sci', permissions: [] },
	{ id: 'sa-st3-hist', staffId: 'st3', academicYearId, responsibility: 'Teacher', classSubjectId: 'cs-6a-hist', permissions: [] },
	{ id: 'sa-st7-edu', staffId: 'st7', academicYearId, responsibility: 'Educator', permissions: [] },
];

const classSubjectsRaw = [
	classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
	classSubject({ id: 'cs-6a-sci', classGroupId: '6a', subjectId: 'subj-sci' }),
	classSubject({ id: 'cs-6a-hist', classGroupId: '6a', subjectId: 'subj-hist' }),
];

const subjectsRaw = [
	subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', coefficient: 3 }),
	subject({ id: 'subj-sci', name: 'Natural Sciences', code: 'SCI', coefficient: 2, category: 'Scientifique', color: 'sky' }),
	subject({ id: 'subj-hist', name: 'History & Geography', code: 'HIST', coefficient: 2, category: 'Sciences humaines', color: 'warm' }),
];

describe('staff role mapping', () => {
	it('prefers stored profileRole over assignment inference', () => {
		expect(mapStaffRole(staffRaw[0])).toBe('directeur');
		expect(mapStaffRole(staffRaw[1])).toBe('deputy_director');
		expect(mapStaffRole(staffRaw[3])).toBe('educateur');
	});

	it('does not infer teacher titles from homeroom or subject assignments', () => {
		expect(mapStaffRole(staffRaw[2])).toBe('staff');
		expect(mapStaffRole(staffRaw[1])).toBe('deputy_director');
		expect(mapStaffRole({
			subjectId: 'subject-teacher',
			profileRole: 'professeur',
		})).toBe('staff');
	});

	it('maps the school owner before stored profileRole', () => {
		expect(mapStaffRole(
			staffMember({
				id: 'st-owner',
				subjectId: 'subject-owner',
				firstName: 'School',
				lastName: 'Owner',
				profileRole: 'directeur',
			}),
			'subject-owner',
		)).toBe('owner');
	});
});

describe('staff department mapping', () => {
	it('derives departments from webapp profile roles', () => {
		expect(mapDepartment('directeur', 'st5', [...assignmentsRaw], [], subjectsRaw)).toBe('Direction');
		expect(mapDepartment('deputy_director', 'st3', [...assignmentsRaw], [], subjectsRaw)).toBe('Direction');
		expect(mapDepartment('educateur', 'st7', [...assignmentsRaw], [], subjectsRaw)).toBe('Vie scolaire');
		expect(mapDepartment('cpe', 'st7', [...assignmentsRaw], [], subjectsRaw)).toBe('Vie scolaire');
		expect(mapDepartment('secretary', 'st8', [], [], subjectsRaw)).toBe('Administration');
		expect(mapDepartment('staff', 'st1', [...assignmentsRaw], ['subj-math', 'subj-sci'], subjectsRaw)).toBe('Administration');
	});
});

describe('staff member mapping', () => {
	it('maps staff members from stored profileRole without teacher inference', () => {
		const members = mapStaffMembers(
			[...staffRaw],
			[...classGroupsRaw],
			[...assignmentsRaw],
			[...classSubjectsRaw],
			[...subjectsRaw],
		);

		expect(members.find(member => member.id === 'st5')).toMatchObject({
			role: 'directeur',
			department: 'Direction',
		});
		expect(members.find(member => member.id === 'st3')).toMatchObject({
			role: 'deputy_director',
			department: 'Direction',
			mainClassId: '6a',
			subjectsTaught: ['subj-hist'],
			subjectLabels: ['History & Geography'],
		});
		expect(members.find(member => member.id === 'st1')).toMatchObject({
			role: 'staff',
			department: 'Administration',
			subjectsTaught: ['subj-math', 'subj-sci'],
			subjectLabels: ['Mathematics', 'Natural Sciences'],
		});
		expect(members.find(member => member.id === 'st7')).toMatchObject({
			role: 'educateur',
			department: 'Vie scolaire',
		});
	});

	it('deduplicates class ids when a staff member has multiple assignments on the same class', () => {
		const duplicateAssignments = [
			...assignmentsRaw,
			{
				id: 'sa-st3-6a-extra',
				staffId: 'st3',
				academicYearId,
				responsibility: 'Support',
				classGroupId: '6a',
				permissions: [],
			},
		];
		const members = mapStaffMembers(
			[staffRaw[1]!],
			[...classGroupsRaw],
			duplicateAssignments,
		);

		expect(members[0]?.classes).toEqual(['6a']);
	});
});
