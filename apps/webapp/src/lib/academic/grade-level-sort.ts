import type { GradeLevel } from '$lib/types/school';

/** Lower = earlier in the school path (Collège before Lycée). */
function cycleRank(cycle: string): number {
	const normalized = cycle.trim().toLowerCase();
	if (
		normalized === 'collège'
		|| normalized === 'college'
		|| normalized === 'middle school'
	) {
		return 0;
	}
	if (
		normalized === 'lycée'
		|| normalized === 'lycee'
		|| normalized === 'high school'
	) {
		return 1;
	}
	return 2;
}

/**
 * Sort grade levels for display: Collège cycle first, then Lycée,
 * then by `order` within a cycle.
 *
 * Needed because CI onboarding templates restart `order` at 1 per cycle
 * (Sixième and Seconde A can both be order 1).
 */
export function compareGradeLevels(
	left: Pick<GradeLevel, 'cycle' | 'order' | 'name'>,
	right: Pick<GradeLevel, 'cycle' | 'order' | 'name'>,
): number {
	const byCycle = cycleRank(left.cycle) - cycleRank(right.cycle);
	if (byCycle !== 0) {
		return byCycle;
	}
	if (left.cycle !== right.cycle) {
		return left.cycle.localeCompare(right.cycle, 'fr');
	}
	const byOrder = left.order - right.order;
	if (byOrder !== 0) {
		return byOrder;
	}
	return left.name.localeCompare(right.name, 'fr');
}

export function sortGradeLevels<T extends Pick<GradeLevel, 'cycle' | 'order' | 'name'>>(
	gradeLevels: readonly T[],
): T[] {
	return [...gradeLevels].sort(compareGradeLevels);
}
