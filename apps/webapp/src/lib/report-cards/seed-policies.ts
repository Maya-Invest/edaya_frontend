import type { ReportCardResult } from '$lib/types/report-cards';

export function seedClassPeriodReportCardResults(
	existing: readonly ReportCardResult[],
	incoming: readonly ReportCardResult[],
	scope: { classId: string; periodId: string },
): ReportCardResult[] {
	const kept = existing.filter(result =>
		result.classId !== scope.classId || result.academicPeriodId !== scope.periodId,
	);
	const scoped = incoming.filter(result =>
		result.classId === scope.classId && result.academicPeriodId === scope.periodId,
	);
	return [...kept, ...scoped];
}
