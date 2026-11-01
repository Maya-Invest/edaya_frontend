import type { components } from '$lib/api/schema';

export interface TimetableTaskOptionsDraft {
	generationMode: 'weekly' | 'free';
	preferredPeriodDefinitionIds: readonly string[];
	minDayGapSameSubject: string;
	enforceWorkloadFulfillment?: boolean;
	excludeBreakSlots?: boolean;
	allowUnassignedTeacherPlacements?: boolean;
	useHomeroomTeacherFallback?: boolean;
}

/** Snapshots the public command options; absent inherited values stay absent. */
export function timetableTaskOptions(draft: TimetableTaskOptionsDraft): components['schemas']['TimetableGenerationOptions'] {
	return {
		generationMode: draft.generationMode,
		preferredPeriodDefinitionIds: [...draft.preferredPeriodDefinitionIds],
		...(draft.minDayGapSameSubject !== '' ? { minDayGapSameSubject: Number(draft.minDayGapSameSubject) } : {}),
		...(draft.enforceWorkloadFulfillment !== undefined ? { enforceWorkloadFulfillment: draft.enforceWorkloadFulfillment } : {}),
		...(draft.excludeBreakSlots !== undefined ? { excludeBreakSlots: draft.excludeBreakSlots } : {}),
		...(draft.allowUnassignedTeacherPlacements !== undefined ? { allowUnassignedTeacherPlacements: draft.allowUnassignedTeacherPlacements } : {}),
		...(draft.useHomeroomTeacherFallback !== undefined ? { useHomeroomTeacherFallback: draft.useHomeroomTeacherFallback } : {}),
	};
}

export function scopedTimetableOverrides(subjectIds: readonly string[], draft: Readonly<Record<string, number>>): Record<string, number> {
	const included = new Set(subjectIds);
	return Object.fromEntries(Object.entries(draft).filter(([id]) => included.has(id)));
}

/** Model validation must survive unmounted step fields. The backend still owns feasibility. */
export function validTimetableTaskNumbers(dayGap: string, workload: Record<string, number>, minimum: Record<string, number>, maximum: Record<string, number>): boolean {
	const integer = (value: number, min: number) => Number.isSafeInteger(value) && value >= min;
	return (dayGap === '' || integer(Number(dayGap), 0))
		&& Object.values(workload).every(value => integer(value, 0))
		&& Object.values(minimum).every(value => integer(value, 1))
		&& Object.values(maximum).every(value => integer(value, 1))
		&& Object.keys(minimum).every(id => maximum[id] === undefined || minimum[id]! <= maximum[id]!);
}
