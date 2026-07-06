import type { ReportCardResult } from '$lib/types/report-cards';
import { describe, expect, it } from 'bun:test';
import { seedClassPeriodReportCardResults } from '$lib/report-cards/seed-policies';

function result(id: string, classId: string, academicPeriodId: string): ReportCardResult {
	return {
		id,
		schoolId: 'school-1',
		studentId: `student-${id}`,
		classId,
		definitionId: 'definition-1',
		academicYearId: 'year-1',
		academicPeriodId,
		gradeScaleId: 'scale-1',
		status: 'generated',
		overallAverage: 12,
		classRank: 1,
		classSize: 20,
		sectionResults: [],
	};
}

describe('report-card context', () => {
	it('replaces only the owned class-period result slice', () => {
		const existing = [
			result('old', 'class-a', 'period-1'),
			result('other', 'class-b', 'period-1'),
		];
		const next = seedClassPeriodReportCardResults(
			existing,
			[result('new', 'class-a', 'period-1')],
			{ classId: 'class-a', periodId: 'period-1' },
		);

		expect(next.map(entry => entry.id).sort()).toEqual(['new', 'other']);
	});
});
