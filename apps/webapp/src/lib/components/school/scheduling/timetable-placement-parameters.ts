import type { components } from '$lib/api/schema';

export type TimetablePlacementParameters = components['schemas']['TimetablePlacementParameters'];

export interface TimetablePlacementOverrides {
	periodsPerWeekByClassSubjectId?: Record<string, number>;
}

export const DEFAULT_PERIODS_PER_WEEK = 1;

export function resolvePeriodsPerWeek(
	override?: number,
	classSubject?: { periodsPerWeek?: number | null },
): number {
	const candidates = [override, classSubject?.periodsPerWeek, DEFAULT_PERIODS_PER_WEEK];
	for (const candidate of candidates) {
		if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) {
			return candidate;
		}
	}
	return DEFAULT_PERIODS_PER_WEEK;
}

export function resolvedPeriodsPerWeekPlaceholder(
	classSubject: { periodsPerWeek?: number | null },
): number {
	return resolvePeriodsPerWeek(undefined, classSubject);
}

export function buildResolvedPeriodsPerWeekMap(
	classSubjects: readonly { id: string; periodsPerWeek?: number | null; isOffered?: boolean | null }[],
	overrides: Record<string, number> = {},
): Record<string, number> {
	const map: Record<string, number> = {};
	for (const subject of classSubjects) {
		if (subject.isOffered === false) {
			continue;
		}
		map[subject.id] = resolvePeriodsPerWeek(overrides[subject.id], subject);
	}
	return map;
}

export function buildTimetablePlacementParameters(
	overrides: TimetablePlacementOverrides,
	classSubjects?: readonly { id: string; periodsPerWeek?: number | null; isOffered?: boolean | null }[],
): TimetablePlacementParameters | undefined {
	const periodsPerWeekByClassSubjectId = classSubjects
		? buildResolvedPeriodsPerWeekMap(classSubjects, overrides.periodsPerWeekByClassSubjectId)
		: overrides.periodsPerWeekByClassSubjectId;
	if (!periodsPerWeekByClassSubjectId || Object.keys(periodsPerWeekByClassSubjectId).length === 0) {
		return undefined;
	}
	return { periodsPerWeekByClassSubjectId };
}

export function setPeriodsPerWeekOverride(
	target: Record<string, number>,
	classSubjectId: string,
	value: string,
): Record<string, number> {
	const next = { ...target };
	if (value === '') {
		delete next[classSubjectId];
		return next;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		delete next[classSubjectId];
		return next;
	}
	next[classSubjectId] = parsed;
	return next;
}
