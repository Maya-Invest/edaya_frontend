import type { GradeLevel } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { compareGradeLevels, sortGradeLevels } from '$lib/academic/grade-level-sort';

const college6 = { id: 'gl-6', schoolId: 'sch', name: 'Sixième', cycle: 'Collège', order: 1 } as GradeLevel;
const college5 = { id: 'gl-5', schoolId: 'sch', name: 'Cinquième', cycle: 'Collège', order: 2 } as GradeLevel;
const lycee2nde = { id: 'gl-2nda', schoolId: 'sch', name: 'Seconde A', cycle: 'Lycée', order: 1 } as GradeLevel;
const lycee1ere = { id: 'gl-1era', schoolId: 'sch', name: 'Première A', cycle: 'Lycée', order: 2 } as GradeLevel;

describe('compareGradeLevels', () => {
	it('places Collège before Lycée even when order values collide', () => {
		expect(compareGradeLevels(lycee2nde, college6)).toBeGreaterThan(0);
		expect(compareGradeLevels(college6, lycee2nde)).toBeLessThan(0);
	});
});

describe('sortGradeLevels', () => {
	it('orders Collège levels then Lycée levels', () => {
		const sorted = sortGradeLevels([lycee1ere, college5, lycee2nde, college6]);
		expect(sorted.map(level => level.id)).toEqual(['gl-6', 'gl-5', 'gl-2nda', 'gl-1era']);
	});
});
