import type { ClassNode, GradeLevel, Subject } from '$lib/types/school';
import { groupSubjectsByGradeLevel } from '$lib/academic/subject-level-groups';
import { describe, expect, it } from 'bun:test';

const gradeLevels = [
	{ id: 'ci-gl-6', schoolId: 'sch', name: 'Sixième', cycle: 'Collège', order: 1 },
	{ id: 'ci-gl-5', schoolId: 'sch', name: 'Cinquième', cycle: 'Collège', order: 2 },
	{ id: 'ci-gl-2nda', schoolId: 'sch', name: 'Seconde A', cycle: 'Lycée', order: 1 },
] as GradeLevel[];

const classes = [
	{
		id: 'ci-6a',
		schoolId: 'sch',
		academicYearId: 'year',
		gradeLevelId: 'ci-gl-6',
		name: 'Sixième A',
		level: 'Collège',
		studentCount: 30,
		capacity: 35,
		attendanceMode: 'daily',
		homeroomStaffId: null,
	},
	{
		id: 'ci-5a',
		schoolId: 'sch',
		academicYearId: 'year',
		gradeLevelId: 'ci-gl-5',
		name: 'Cinquième A',
		level: 'Collège',
		studentCount: 28,
		capacity: 35,
		attendanceMode: 'session',
		homeroomStaffId: null,
	},
	{
		id: 'ci-2nda',
		schoolId: 'sch',
		academicYearId: 'year',
		gradeLevelId: 'ci-gl-2nda',
		name: 'Seconde A',
		level: 'Lycée',
		studentCount: 32,
		capacity: 35,
		attendanceMode: 'session',
		homeroomStaffId: null,
	},
] as ClassNode[];

const subjects = [
	{
		id: 'gls-6-math',
		classId: 'ci-gl-6',
		gradeLevelId: 'ci-gl-6',
		name: 'Mathématiques',
		teacher: '',
		hoursPerWeek: 4,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	},
	{
		id: 'gls-5-math',
		classId: 'ci-gl-5',
		gradeLevelId: 'ci-gl-5',
		name: 'Mathématiques',
		teacher: '',
		hoursPerWeek: 4,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	},
	{
		id: 'gls-2nda-math',
		classId: 'ci-gl-2nda',
		gradeLevelId: 'ci-gl-2nda',
		name: 'Mathématiques',
		teacher: '',
		hoursPerWeek: 5,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	},
] as Subject[];

describe('groupSubjectsByGradeLevel', () => {
	it('groups French class names by grade level label', () => {
		const groups = groupSubjectsByGradeLevel(subjects.slice(0, 2), classes, gradeLevels.slice(0, 2));
		expect(groups.map(group => group.label)).toEqual(['Sixième', 'Cinquième']);
		expect(groups[0]?.count).toBe(1);
		expect(groups[1]?.count).toBe(1);
	});

	it('lists Collège levels before Lycée when order values collide', () => {
		const groups = groupSubjectsByGradeLevel(
			[subjects[2]!, subjects[0]!, subjects[1]!],
			classes,
			[gradeLevels[2]!, gradeLevels[0]!, gradeLevels[1]!],
		);
		expect(groups.map(group => group.label)).toEqual(['Sixième', 'Cinquième', 'Seconde A']);
		expect(groups.map(group => group.subtitle)).toEqual(['Collège', 'Collège', 'Lycée']);
	});
});
