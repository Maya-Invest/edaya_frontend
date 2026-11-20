import type { ReportCardResult } from '$lib/types/report-cards';
import type { AcademicPeriod } from '$lib/types/school';

export function readReportSelection(url: URL, periods: readonly AcademicPeriod[], results: readonly ReportCardResult[], defaultPeriodId: string) {
	const requested = url.searchParams.get('reportPeriod');
	const annualTargets = periods.filter(period => results.some(result => result.academicPeriodId === period.id && result.aggregation?.source === 'report_cards'));
	const annual = requested === 'annual' || annualTargets.some(period => period.id === (requested ?? defaultPeriodId));
	const requestedTarget = url.searchParams.get('annualTarget') ?? (requested === 'annual' ? '' : requested ?? defaultPeriodId);
	const targetId = annualTargets.find(period => period.id === requestedTarget)?.id ?? (annualTargets.length === 1 ? annualTargets[0].id : '');
	const periodId = annual ? targetId : periods.find(period => period.id === requested)?.id ?? periods.find(period => period.id === defaultPeriodId)?.id ?? periods.at(-1)?.id ?? '';
	const candidates = results.filter(result => result.academicPeriodId === periodId && (result.aggregation?.source === 'report_cards') === annual);
	return { annual, annualTargets, periodId, result: candidates.length === 1 ? candidates[0] : undefined, ambiguous: candidates.length > 1 };
}

export function reportPublicationBlocked(result: ReportCardResult) {
	return Boolean(result.calculationStale || result.pendingAssessmentIds?.length || result.pendingCorrectionIds?.length || result.revisedDraft || result.version == null || result.gradingPolicyRevision == null);
}

export function reportStatusDate(result: ReportCardResult) {
	return result.status === 'published' ? result.publishedAt : result.generatedAt;
}
