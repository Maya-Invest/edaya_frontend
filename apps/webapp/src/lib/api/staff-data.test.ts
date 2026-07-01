import { classSubject, staffMember, subject } from '$lib/test/openapi-fixtures';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import {
	mapDepartment,
	mapStaffMembers,
	mapStaffRole,
} from './staff-data';

const staffRaw = [
	staffMember({ id: 'st5', firstName: 'Camille', lastName: 'Moreau', email: 'c.moreau@school.edu' }),
	staffMember({ id: 'st3', firstName: 'Marie', lastName: 'Léon', email: 'm.leon@school.edu' }),
	staffMember({ id: 'st1', firstName: 'Marie', lastName: 'Dupont', email: 'm.dupont@school.edu' }),
	staffMember({ id: 'st7', firstName: 'Tom', lastName: 'Évrard', email: 't.evrard@school.edu' }),
];

const roleAssignmentsRaw = [
	{ id: 'sra-st5', staffId: 'st5', schoolId: SEED_SCHOOL_ID, academicYearId: '2025', roleIds: ['role-director'], scopeGrants: [], status: 'active' as const },
	{ id: 'sra-st3', staffId: 'st3', schoolId: SEED_SCHOOL_ID, academicYearId: '2025', roleIds: ['role-coordinator'], scopeGrants: [], status: 'active' as const },
	{ id: 'sra-st1', staffId: 'st1', schoolId: SEED_SCHOOL_ID, academicYearId: '2025', roleIds: ['role-teacher'], scopeGrants: [], status: 'active' as const },
	{ id: 'sra-st7', staffId: 'st7', schoolId: SEED_SCHOOL_ID, academicYearId: '2025', roleIds: ['role-educator'], scopeGrants: [], status: 'active' as const },
];

const classGroupsRaw = [
	{ id: '6a', schoolId: SEED_SCHOOL_ID, academicYearId: '2025', gradeLevelId: 'gl-6', name: '6th — A', homeroomStaffId: 'st3', attendanceMode: 'session' as const },
];

const assignmentsRaw = [
	{ id: 'sa-st1-6a', staffId: 'st1', responsibility: 'Mathematics', classGroupId: '6a' },
	{ id: 'sa-st3-6a', staffId: 'st3', responsibility: 'Homeroom', classGroupId: '6a' },
	{ id: 'sa-st1-math', staffId: 'st1', responsibility: 'Teacher', classSubjectId: 'cs-6a-math' },
	{ id: 'sa-st1-sci', staffId: 'st1', responsibility: 'Teacher', classSubjectId: 'cs-6a-sci' },
	{ id: 'sa-st3-hist', staffId: 'st3', responsibility: 'Teacher', classSubjectId: 'cs-6a-hist' },
];

const classSubjectsRaw = [
	classSubject({ id: 'cs-6a-math', classGroupId: '6a', subjectId: 'subj-math' }),
	classSubject({ id: 'cs-6a-sci', classGroupId: '6a', subjectId: 'subj-sci' }),
	classSubject({ id: 'cs-6a-hist', classGroupId: '6a', subjectId: 'subj-hist' }),
];

const subjectsRaw = [
	subject({ id: 'subj-math', name: 'Mathematics', code: 'MATH', defaultCoefficient: 3 }),
	subject({ id: 'subj-sci', name: 'Natural Sciences', code: 'SCI', defaultCoefficient: 2, category: 'Scientifique', color: 'sky' }),
	subject({ id: 'subj-hist', name: 'History & Geography', code: 'HIST', defaultCoefficient: 2, category: 'Sciences humaines', color: 'warm' }),
];

describe('staff role mapping', () => {
	it('maps access role ids to UI staff roles', () => {
		expect(mapStaffRole(staffRaw[0], [...roleAssignmentsRaw])).toBe('directeur');
		expect(mapStaffRole(staffRaw[1], [...roleAssignmentsRaw])).toBe('prof_principal');
		expect(mapStaffRole(staffRaw[2], [...roleAssignmentsRaw])).toBe('professeur');
		expect(mapStaffRole(staffRaw[3], [...roleAssignmentsRaw])).toBe('educateur');
	});
});

describe('staff department mapping', () => {
	it('derives departments from role and taught subjects', () => {
		expect(mapDepartment('directeur', 'st5', [...assignmentsRaw], [], subjectsRaw)).toBe('Direction');
		expect(mapDepartment('educateur', 'st7', [...assignmentsRaw], [], subjectsRaw)).toBe('Vie scolaire');
		expect(mapDepartment(
			'prof_principal',
			'st3',
			[...assignmentsRaw],
			['subj-hist'],
			subjectsRaw,
		)).toBe('Lettres');
		expect(mapDepartment(
			'professeur',
			'st1',
			[...assignmentsRaw],
			['subj-math', 'subj-sci'],
			subjectsRaw,
		)).toBe('Sciences');
	});
});

describe('staff member mapping', () => {
	it('maps staff members from API fields without per-id fallbacks', () => {
		const members = mapStaffMembers(
			[...staffRaw],
			[...roleAssignmentsRaw],
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
			role: 'prof_principal',
			department: 'Lettres',
			mainClassId: '6a',
			subjectsTaught: ['subj-hist'],
			subjectLabels: ['History & Geography'],
		});
		expect(members.find(member => member.id === 'st1')).toMatchObject({
			role: 'professeur',
			department: 'Sciences',
			subjectsTaught: ['subj-math', 'subj-sci'],
			subjectLabels: ['Mathematics', 'Natural Sciences'],
		});
		expect(members.find(member => member.id === 'st7')).toMatchObject({
			role: 'educateur',
			department: 'Vie scolaire',
		});
	});
});
