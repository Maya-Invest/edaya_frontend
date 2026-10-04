import type { components } from '$lib/api/schema';
import type { AcademicPeriod } from '$lib/types/school';
import type { getBrowserSchoolClient } from './school-client';
import { listAllEntityPagesForIdFilters } from './entity-list-filters';

export type AnnualReportResult = components['schemas']['ReportCardResult'];

export async function loadStudentYearReportResults(
	client: ReturnType<typeof getBrowserSchoolClient>,
	studentId: string,
	periodIds: string[],
): Promise<AnnualReportResult[]> {
	return listAllEntityPagesForIdFilters(query => client.entities.results.list(query), [
		{ field: 'periodId', ids: periodIds },
	], { extraQuery: { studentId } });
}

export function annualReportReadiness(
	periods: readonly AcademicPeriod[],
	results: readonly AnnualReportResult[],
	sourceIds: readonly string[],
	targetId: string,
) {
	return sourceIds.map((id) => {
		const period = periods.find(entry => entry.id === id);
		const target = periods.find(entry => entry.id === targetId);
		const compatibleDates = Boolean(period && target && period.startDate >= target.startDate && period.endDate <= target.endDate
			&& !periods.some(other => other.id !== id && sourceIds.includes(other.id) && period.startDate <= other.endDate && other.startDate <= period.endDate));
		const candidates = results.filter(entry => entry.periodId === id && entry.status === 'published');
		const report = candidates.length === 1 ? candidates[0] : undefined;
		const ready = Boolean(compatibleDates && id !== targetId && period?.status === 'published' && report && !report.aggregation
			&& !report.calculationStale && !report.pendingCorrectionIds?.length && !report.pendingAssessmentIds?.length);
		return { id, period, report, ready };
	});
}
