import type { ReportCardResult } from '$lib/types/report-cards';
import { formatPersistedGrade, formatReportMark, formatSectionRank, formatReportRank, reportCardAvailability } from '$lib/types/report-cards';
import { expect, it } from 'bun:test';

it('retains persisted zero and precision when historical context is absent', () => {
	expect(formatPersistedGrade(undefined, 0)).toBe('0');
	expect(formatPersistedGrade(undefined, 12.345)).toBe('12.345');
	expect(formatPersistedGrade(undefined, undefined)).toBe('—');
});

const grading = { reportedValue: 0, maximum: 20, decimalPlaces: 2, mention: { code: 'D' } } as NonNullable<ReportCardResult['grading']>;

it('uses captured precision and the captured scale, including a zero score', () => {
	expect(formatPersistedGrade(grading, 99)).toBe('0.00 / 20 · D');
});

it('distinguishes unavailable ranking from valid ranking', () => {
	for (const result of [undefined, {}, { classRank: 1 }, { classSize: 30 }, { classRank: 0, classSize: 0 }, { classRank: 4, classSize: 3 }]) {
		expect(formatReportRank(result)).toBe('—');
	}
	expect(formatReportRank({ classRank: 1, classSize: 30 })).toBe('1/30');
});

it('summarizes missing values and missing grading independently for one notice', () => {
	const report = { grading, overallAverage: 0, classRank: 1, classSize: 2, sectionResults: [{ sectionId: 'group', grading, sectionAverage: 0, marks: [{ sectionId: 'math', subjectId: 'math', grading, average: 0 }] }] } as ReportCardResult;
	expect(reportCardAvailability(report)).toEqual({ missingValues: false, missingGrading: false });
	expect(reportCardAvailability({ ...report, classRank: undefined })).toEqual({ missingValues: true, missingGrading: false });
	expect(reportCardAvailability({ ...report, grading: undefined })).toEqual({ missingValues: false, missingGrading: true });
	const missing = { ...report, sectionResults: [{ sectionId: 'group', name: 'Module', sectionKind: 'module' as const, weight: 1, sectionAverage: 12, marks: [{ sectionId: 'math', subjectId: 'math', subjectName: 'Math', coefficient: 1 }] }] };
	expect(reportCardAvailability(missing)).toEqual({ missingValues: true, missingGrading: true });
});

it('separates numeric marks from captured appreciation and formats section cohorts', () => {
 expect(formatReportMark({ ...grading, mode: 'numeric-first', decimalPlaces: 3 }, 99)).toBe('0.000 / 20');
 expect(formatReportMark({ ...grading, mode: 'mention-first' }, 99)).toBe('0.00 / 20 · D');
 expect(formatSectionRank({ rank: 3, participantCount: 18 })).toBe('3 / 18');
 expect(formatSectionRank({ rank: 3 })).toBe('3 / —');
 expect(formatSectionRank({ participantCount: 18 })).toBe('—');
});
