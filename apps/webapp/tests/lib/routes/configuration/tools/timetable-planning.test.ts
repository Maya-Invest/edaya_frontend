import type { ClassNode, GradeLevel } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import { sortTimetableClasses } from '../../../../../src/routes/(app)/configuration/tools/timetable-planning';

function classNode(id: string, name: string, gradeLevelId: string): ClassNode {
	return {
		id,
		name,
		gradeLevelId,
		schoolId: 'school-1',
		academicYearId: 'year-1',
		level: 'Secondary',
		studentCount: 0,
		attendanceMode: 'session',
	};
}

describe('tools timetable planning', () => {
	test('orders classes by grade-level order and then class name', () => {
		const levels = [
			{ id: 'g2', order: 2 },
			{ id: 'g1', order: 1 },
		] as GradeLevel[];
		const classes = [
			classNode('c3', 'B', 'g2'),
			classNode('c2', 'B', 'g1'),
			classNode('c1', 'A', 'g1'),
		];

		expect(sortTimetableClasses(classes, levels).map(row => row.id)).toEqual(['c1', 'c2', 'c3']);
	});
});
