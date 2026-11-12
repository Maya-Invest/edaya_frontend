import type { ClassNode, GradeLevel } from '$lib/types/school';
import { describe, expect, test } from 'bun:test';
import {
	activeTimetableClassId,
	selectedTimetableClasses,
	sortTimetableClasses,
	timetableClassGroups,
} from '../../../../../src/routes/(app)/configuration/tools/timetable-planning';

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
	test('keeps the displayed class independent of inclusion order and advances after exclusion', () => {
		const classes = ['a', 'b', 'c', 'd'].map(id => ({ id }));
		expect(activeTimetableClassId(classes, ['d', 'b', 'a'], 'b')).toBe('b');
		expect(activeTimetableClassId(classes, ['a', 'd'], 'b')).toBe('d');
		expect(activeTimetableClassId(classes, ['b', 'a'], 'd')).toBe('a');
		expect(activeTimetableClassId(classes, ['c', 'a'], '')).toBe('a');
		expect(activeTimetableClassId(classes, [], 'a')).toBe('');
		expect(activeTimetableClassId(classes, ['stale'], 'a')).toBe('');
		expect(activeTimetableClassId([], ['a'], 'a')).toBe('');
	});

	test('validates, deduplicates and snapshots selected classes in generation order', () => {
		const classes = [classNode('a', 'A', 'g1'), classNode('b', 'B', 'g1'), classNode('c', 'C', 'g2')];
		const selected = selectedTimetableClasses(classes, ['b', 'a', 'b']);
		expect(selected.map(row => row.id)).toEqual(['a', 'b']);
		classes[0]!.name = 'Changed';
		expect(selected[0]!.name).toBe('A');
		expect(() => selectedTimetableClasses(classes, [])).toThrow();
		expect(() => selectedTimetableClasses(classes, ['a', 'unknown-year-class'])).toThrow();
	});

	test('groups searchable class names by grade without changing the input or selection', () => {
		const classes = [classNode('c', 'C', 'g2'), classNode('b', 'B', 'g1'), classNode('a', 'A', 'g1')];
		const grades = [{ id: 'g1', shortName: 'Grade 1', order: 1 }, { id: 'g2', shortName: 'Grade 2', order: 2 }] as GradeLevel[];
		expect(timetableClassGroups(classes, grades, '').map(group => group.classes.map(row => row.id))).toEqual([['a', 'b'], ['c']]);
		expect(timetableClassGroups(classes, grades, 'grade 2')[0]?.classes.map(row => row.id)).toEqual(['c']);
		expect(timetableClassGroups(classes, grades, ' B ')[0]?.classes.map(row => row.id)).toEqual(['b']);
		expect(timetableClassGroups(classes, grades, 'missing')).toEqual([]);
		expect(classes.map(row => row.id)).toEqual(['c', 'b', 'a']);
	});

	test('class ID breaks equal-grade and equal-name ties', () => {
		expect(sortTimetableClasses([classNode('b', 'Same', 'g1'), classNode('a', 'Same', 'g1')], []).map(row => row.id)).toEqual(['a', 'b']);
	});
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
