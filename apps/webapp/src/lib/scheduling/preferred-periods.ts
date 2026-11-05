import type { PeriodDefinition } from '$lib/types/school';

export function eligiblePreferredPeriodIds(periods: readonly PeriodDefinition[], ids: readonly string[]): string[] {
	const eligible = new Set(periods.filter(period => !period.isBreak && period.isTeachingSlot).map(period => period.id));
	return [...new Set(ids)].filter(id => eligible.has(id));
}

export function morningPeriodIds(periods: readonly PeriodDefinition[]): string[] {
	return eligiblePreferredPeriodIds(periods, periods.filter(period => period.startTime < '12:00').map(period => period.id));
}
