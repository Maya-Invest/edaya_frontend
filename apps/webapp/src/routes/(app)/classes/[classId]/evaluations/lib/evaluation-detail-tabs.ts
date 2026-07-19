export const EVALUATION_DETAIL_TABS = [
	{ key: 'details', segment: 'details', labelKey: 'eval.tab.details' },
	{ key: 'grading', segment: 'grading', labelKey: 'eval.tab.grading' },
] as const;

export type EvaluationDetailTabKey = (typeof EVALUATION_DETAIL_TABS)[number]['key'];
export type EvaluationDetailTabSegment = (typeof EVALUATION_DETAIL_TABS)[number]['segment'];

export function activeEvaluationDetailTab(pathname: string, classId: string, evaluationId: string): EvaluationDetailTabKey {
	const base = `/classes/${classId}/evaluations/${evaluationId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/details`) {
		return 'details';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = EVALUATION_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'details';
}
