import { describe, expect, it } from 'bun:test';
import {
	applyGradeEntry,
	evaluationStatsFromResults,
	rollbackGradeEntry,
} from '../../../../../src/routes/(app)/classes/[classId]/evaluations/lib/evaluation-helpers';

describe('grade entry modal apply path', () => {
	const assessmentId = 'asm-1';
	const studentId = 'stu-1';

	it('records a new score and updates grid stats', () => {
		const applied = applyGradeEntry({
			results: [],
			assessmentId,
			studentId,
			score: 14,
		});

		expect(applied.previousResult).toBeUndefined();
		expect(applied.nextResults).toEqual([{
			id: 'ar-asm-1-stu-1',
			studentId,
			assessmentId,
			score: 14,
		}]);
		expect(applied.stats).toEqual({ graded: 1, averageMark: 14 });
	});

	it('uses the previous score when editing an existing grade', () => {
		const existing = {
			id: 'ar-asm-1-stu-1',
			studentId,
			assessmentId,
			score: 11,
		};
		const applied = applyGradeEntry({
			results: [existing, { id: 'ar-asm-1-stu-2', studentId: 'stu-2', assessmentId, score: 16 }],
			assessmentId,
			studentId,
			score: 15,
		});

		expect(applied.previousResult).toEqual(existing);
		expect(applied.stats).toEqual({
			graded: 2,
			averageMark: 15.5,
		});
	});

	it('rolls back a failed save to the previous grid and stats', () => {
		const existing = {
			id: 'ar-asm-1-stu-1',
			studentId,
			assessmentId,
			score: 11,
		};
		const applied = applyGradeEntry({
			results: [existing],
			assessmentId,
			studentId,
			score: 18,
		});
		const rolled = rollbackGradeEntry({
			results: applied.nextResults,
			resultId: applied.resultId,
			previousResult: applied.previousResult,
			assessmentId,
		});

		expect(rolled.nextResults).toEqual([existing]);
		expect(rolled.stats).toEqual(evaluationStatsFromResults(assessmentId, [existing]));
	});
});
