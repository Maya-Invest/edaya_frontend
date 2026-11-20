import type { components } from '$lib/api/schema';
import type { AcademicPeriod } from '$lib/types/school';
import type { getBrowserSchoolClient } from './school-client';
import { listAllEntityPagesForIdFilters } from './entity-list-filters';

export type AnnualReportResult = components['schemas']['ReportCardResult'];
export type AnnualReportReview = AnnualReportResult | NonNullable<AnnualReportResult['revisedDraft']>;

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

/** Shared by the preparation form and contextual publication/export actions. */
export function annualReportPublicationReady(periods: readonly AcademicPeriod[], results: readonly AnnualReportResult[], annual: AnnualReportReview) {
	const aggregation = annual.aggregation;
	if (aggregation?.source !== 'report_cards' || !aggregation.sourcePeriodIds.length || new Set(aggregation.sourcePeriodIds).size !== aggregation.sourcePeriodIds.length
		|| annual.calculationStale || annual.pendingCorrectionIds?.length || annual.pendingAssessmentIds?.length
		|| periods.find(period => period.id === annual.periodId)?.status !== 'published') {
		return false;
	}
	const readiness = annualReportReadiness(periods, results, aggregation.sourcePeriodIds, annual.periodId);
	return readiness.every(entry => entry.ready
		&& Number.isFinite(aggregation.periodWeightsByPeriodId?.[entry.id] ?? 1) && (aggregation.periodWeightsByPeriodId?.[entry.id] ?? 1) > 0
		&& aggregation.sourceReportVersions?.some(source => source.periodId === entry.id && source.resultId === entry.report?.id && source.version === entry.report?.version));
}
