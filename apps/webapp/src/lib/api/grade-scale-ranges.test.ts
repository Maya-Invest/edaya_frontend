import { describe, expect, test } from 'bun:test';
import { buildGradeScaleRanges, isValidGradeScaleBounds } from './grade-scale-ranges';

describe('grade-scale-ranges', () => {
	test('builds valid ranges for a standard 0–20 scale with passing 10', () => {
		const ranges = buildGradeScaleRanges(0, 20, 10);

		expect(ranges).toHaveLength(4);
		for (const range of ranges) {
			expect(range.minScore).toBeLessThanOrEqual(range.maxScore);
		}
		expect(ranges[0]).toMatchObject({ letter: 'D', minScore: 0, maxScore: 9.99, isPassing: false });
		expect(ranges[1]!.minScore).toBe(10);
		expect(ranges[1]!.maxScore).toBeGreaterThanOrEqual(10);
		expect(ranges[3]).toMatchObject({ letter: 'A', maxScore: 20, isPassing: true });
	});

	test('builds valid ranges for a 0–100 scale with passing 50', () => {
		const ranges = buildGradeScaleRanges(0, 100, 50);

		for (const range of ranges) {
			expect(range.minScore).toBeLessThanOrEqual(range.maxScore);
		}
		expect(ranges[0]!.maxScore).toBe(49.99);
		expect(ranges[1]!.minScore).toBe(50);
	});

	test('validates scale bounds before submit', () => {
		expect(isValidGradeScaleBounds(0, 20, 10)).toBe(true);
		expect(isValidGradeScaleBounds(0, 20, 20)).toBe(false);
		expect(isValidGradeScaleBounds(0, 20, 0)).toBe(false);
		expect(isValidGradeScaleBounds(10, 10, 10)).toBe(false);
	});
});
