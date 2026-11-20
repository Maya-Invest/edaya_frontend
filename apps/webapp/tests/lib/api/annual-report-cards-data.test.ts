import type { AnnualReportResult } from '$lib/api/annual-report-cards-data';
import type { AcademicPeriod } from '$lib/types/school';
import { annualReportPublicationReady, annualReportReadiness, loadStudentYearReportResults } from '$lib/api/annual-report-cards-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';
import { describe, expect, test } from 'bun:test';

const periods: AcademicPeriod[] = ['s1', 's2', 'annual'].map(id => ({ id, schoolId: 'school', academicYearId: 'year', label: id, range: id, startDate: id === 's2' ? '2026-04-01' : '2026-01-01', endDate: id === 's1' ? '2026-03-31' : '2026-06-30', status: 'published' }));
function report(periodId: string, patch: Partial<AnnualReportResult> = {}): AnnualReportResult {
	return { id: `report-${periodId}`, version: 1, sourceMarks: [], sourceAssessments: [], pendingCorrectionIds: [], pendingAssessmentIds: [], calculationStale: false, studentId: 'student', periodId, classGroupId: 'class', gradeLevelId: 'grade', academicYearId: 'year', reportConfigurationRevision: 1, status: 'published', generatedAt: '2026-06-30', publishedAt: '2026-06-30', sectionResults: [], attendanceSummary: { presentCount: 0, absenceCount: 0, excusedAbsenceCount: 0, lateCount: 0, total: 0, attendanceRate: 0 }, assessmentResultCount: 0, ...patch };
}

describe('annual report-card sources', () => {
	test('only requests the selected student and school-year periods', async () => {
		const { client, requests } = createRecordingSchoolClient([[]]);
		await loadStudentYearReportResults(client, 'student', ['s1', 's2', 'annual']);
		expect(entityListRequests(requests, 'results')[0]?.body).toMatchObject({ studentId: 'student', periodId: { $in: ['s1', 's2', 'annual'] } });
	});

	test('requires unambiguous, current, published original period reports', () => {
		expect(annualReportReadiness(periods, [report('s1'), report('s2')], ['s1', 's2'], 'annual').every(row => row.ready)).toBe(true);
		for (const patch of [{ status: 'draft' as const }, { calculationStale: true }, { pendingCorrectionIds: ['pending'] }, { pendingAssessmentIds: ['assessment'] }, { aggregation: { source: 'report_cards' as const, sourcePeriodIds: ['s1'] } }]) {
			expect(annualReportReadiness(periods, [report('s1', patch)], ['s1'], 'annual')[0]?.ready).toBe(false);
		}
		expect(annualReportReadiness(periods, [report('s1'), report('s1', { id: 'duplicate' })], ['s1'], 'annual')[0]?.ready).toBe(false);
		expect(annualReportReadiness(periods, [report('annual')], ['annual'], 'annual')[0]?.ready).toBe(false);
		expect(annualReportReadiness(periods.map(row => ({ ...row, status: 'draft' })), [report('s1')], ['s1'], 'annual')[0]?.ready).toBe(false);
	});
});

test('annual export retains the preparation workflow source-version and publication guards', () => {
 const source = report('s1');
 const annual = report('annual', { aggregation: { source: 'report_cards', sourcePeriodIds: ['s1'], sourceReportVersions: [{ periodId: 's1', resultId: source.id, version: source.version, sourceVersion: 'captured' }] } });
 expect(annualReportPublicationReady(periods, [source, annual], annual)).toBe(true);
 for (const patch of [{ status: 'draft' as const }, { version: 2 }, { pendingCorrectionIds: ['correction'] }, { calculationStale: true }])
  expect(annualReportPublicationReady(periods, [{ ...source, ...patch }, annual], annual)).toBe(false);
 expect(annualReportPublicationReady(periods, [source, annual], { ...annual, pendingAssessmentIds: ['pending'] })).toBe(false);
});
