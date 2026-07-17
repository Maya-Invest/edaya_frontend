import type { ClassNode, GradeLevel, Subject } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { findSubjectLevelGroup, groupSubjectsByGradeLevel } from '$lib/academic/subject-level-groups';

const gradeLevels = [
	{ id: 'ci-gl-6', schoolId: 'sch', name: '6ème', cycle: 'Collège', order: 1 },
	{ id: 'ci-gl-5', schoolId: 'sch', name: '5ème', cycle: 'Collège', order: 2 },
] as GradeLevel[];

const classes = [
	{
		id: 'ci-6a',
		schoolId: 'sch',
		academicYearId: 'year',
		gradeLevelId: 'ci-gl-6',
		name: '6ème A',
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
		name: '5ème A',
		level: 'Collège',
		studentCount: 28,
		capacity: 35,
		attendanceMode: 'session',
		homeroomStaffId: null,
	},
] as ClassNode[];

const subjects = [
	{
		id: 'ci-cs-6a-math',
		classId: 'ci-6a',
		name: 'Mathématiques',
		teacher: 'Prof. A',
		hoursPerWeek: 4,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	},
	{
		id: 'ci-cs-5a-math',
		classId: 'ci-5a',
		name: 'Mathématiques',
		teacher: 'Prof. B',
		hoursPerWeek: 4,
		color: 'mint',
		description: '',
		category: 'Scientifique',
	},
] as Subject[];

describe('groupSubjectsByGradeLevel', () => {
	it('groups French class names by grade level label', () => {
		const groups = groupSubjectsByGradeLevel(subjects, classes, gradeLevels);
		expect(groups.map(group => group.label)).toEqual(['6ème', '5ème']);
		expect(groups[0]?.count).toBe(1);
		expect(groups[1]?.count).toBe(1);
	});
});

describe('findSubjectLevelGroup', () => {
	it('resolves a level drawer group by grade level name', () => {
		const group = findSubjectLevelGroup('6ème', subjects, classes, gradeLevels);
		expect(group?.items).toHaveLength(1);
		expect(group?.items[0]?.id).toBe('ci-cs-6a-math');
	});
});
