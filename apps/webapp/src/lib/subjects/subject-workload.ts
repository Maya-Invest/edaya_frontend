export interface SubjectWorkload {
	periodsPerWeek: number | null;
	minPeriodSpan: number | null;
	maxPeriodSpan: number | null;
}

type WorkloadDraft = { [K in keyof SubjectWorkload]: string | number };

export function parseSubjectWorkload(draft: WorkloadDraft):
	| { value: SubjectWorkload; error?: never }
	| { error: 'timetable.periodSpanInvalid' | 'timetable.periodSpanRangeInvalid'; value?: never } {
	const value = {} as SubjectWorkload;
	for (const key of ['periodsPerWeek', 'minPeriodSpan', 'maxPeriodSpan'] as const) {
		const text = String(draft[key]).trim();
		const parsed = text ? Number(text) : null;
		if (parsed !== null && (!Number.isSafeInteger(parsed) || parsed <= 0)) {
			return { error: 'timetable.periodSpanInvalid' };
		}
		value[key] = parsed;
	}
	if (value.minPeriodSpan !== null && value.maxPeriodSpan !== null && value.maxPeriodSpan < value.minPeriodSpan) {
		return { error: 'timetable.periodSpanRangeInvalid' };
	}
	return { value };
}
