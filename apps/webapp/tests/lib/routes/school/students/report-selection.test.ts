import type { ReportCardResult } from '$lib/types/report-cards';
import type { AcademicPeriod } from '$lib/types/school';
import { readReportSelection, reportPublicationBlocked, reportStatusDate } from '../../../../../src/routes/(app)/school/students/[[id]]/(tabs)/report-card/report-selection';
import { describe, expect, test } from 'bun:test';
const periods = ['term', 'annual1', 'annual2'].map(id => ({ id })) as AcademicPeriod[];
const result = (id: string, annual = false, patch: Partial<ReportCardResult> = {}): ReportCardResult => ({ id, academicPeriodId: id, studentId: 'student', academicYearId: 'year', schoolId: 'school', classId: 'class', gradeLevelId: 'grade', reportConfigurationRevision: 1, gradeScaleId: 'scale', sectionResults: [], status: 'generated', version: 1, gradingPolicyRevision: 2, ...(annual ? { aggregation: { source: 'report_cards', sourcePeriodIds: ['term'] } } : {}), ...patch });
const select = (query: string, results: ReportCardResult[], defaultId = 'term') => readReportSelection(new URL(`https://school.test/report-card?${query}`), periods, results, defaultId);

describe('student report selection', () => {
 test('uses the requested period rather than lexicographic latest', () => {
  expect(select('reportPeriod=term', [result('annual1', true), result('term')]).result?.id).toBe('term');
 });
 test('annual is available before generation and never resolves an ordinary result', () => {
  expect(select('reportPeriod=annual', [result('term')])).toMatchObject({ annual: true, result: undefined });
 });
 test('a single annual target resolves directly, including a shared annual period default', () => {
  expect(select('reportPeriod=annual', [result('annual1', true)]).result?.id).toBe('annual1');
  expect(select('', [result('annual1', true)], 'annual1').annual).toBe(true);
 });
 test('multiple annual targets require a valid explicit choice', () => {
  const results = [result('annual1', true), result('annual2', true)];
  expect(select('reportPeriod=annual', results).result).toBeUndefined();
  expect(select('reportPeriod=annual&annualTarget=annual2', results).result?.id).toBe('annual2');
  expect(select('reportPeriod=annual&annualTarget=old-year', results).result).toBeUndefined();
 });
 test('does not guess between duplicate results or use invalid period links', () => {
  expect(select('reportPeriod=term', [result('term'), result('term')])).toMatchObject({ result: undefined, ambiguous: true });
  expect(select('reportPeriod=old-year', [result('term')]).periodId).toBe('term');
 });
 test('status dates describe the displayed version and do not substitute generation for missing publication', () => {
  expect(reportStatusDate(result('term', false, { generatedAt: '2026-10-01', publishedAt: '2026-10-05' }))).toBe('2026-10-01');
  expect(reportStatusDate(result('term', false, { status: 'published', generatedAt: '2026-10-01' }))).toBeUndefined();
  expect(reportStatusDate(result('term', false, { status: 'published', publishedAt: '2026-10-05', revisedDraft: result('draft') }))).toBe('2026-10-05');
 });
 test('publication requires an exact reviewable draft without pending work', () => {
  expect(reportPublicationBlocked(result('term'))).toBe(false);
  for (const patch of [{ calculationStale: true }, { pendingAssessmentIds: ['a'] }, { pendingCorrectionIds: ['c'] }, { revisedDraft: result('revision') }, { gradingPolicyRevision: undefined }, { version: undefined }])
   expect(reportPublicationBlocked(result('term', false, patch))).toBe(true);
 });
});
